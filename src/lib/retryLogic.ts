// Retry logic with exponential backoff for AWS Bedrock
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a throttling error
      if (error.name === 'ThrottlingException' && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Throttling detected, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For non-throttling errors or final attempt, throw immediately
      throw error;
    }
  }
  
  throw lastError!;
}

// Smart fallback: try AWS Bedrock first, then fallback to OpenAI
export async function smartParseResume(
  resumeText: string,
  bedrockParser: any,
  openaiParser: () => Promise<any>
) {
  try {
    // Try AWS Bedrock first
    console.log('Attempting AWS Bedrock parsing...');
    const result = await retryWithBackoff(async () => {
      return await bedrockParser.parseResume(resumeText, {
        includeConfidence: true,
        language: 'en',
        temperature: 0.1,
        maxTokens: 1000,
      });
    });
    
    return {
      ...result,
      provider: 'aws-bedrock',
      fallback: false
    };
  } catch (error) {
    console.log('AWS Bedrock failed, falling back to OpenAI...');
    
    try {
      // Fallback to OpenAI
      const result = await openaiParser();
      return {
        ...result,
        provider: 'openai',
        fallback: true,
        fallbackReason: error instanceof Error ? error.message : 'Unknown error'
      };
    } catch (fallbackError) {
      throw new Error(`Both AWS Bedrock and OpenAI failed. Bedrock: ${error instanceof Error ? error.message : 'Unknown'}, OpenAI: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`);
    }
  }
}
