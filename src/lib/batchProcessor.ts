// Batch processing for multiple resumes
export class BatchResumeProcessor {
  private batchSize = 3; // Process 3 resumes at a time
  private delayBetweenBatches = 5000; // 5 seconds between batches

  async processBatch(resumes: Array<{ text: string; id: string }>) {
    const results = [];
    
    for (let i = 0; i < resumes.length; i += this.batchSize) {
      const batch = resumes.slice(i, i + this.batchSize);
      
      console.log(`Processing batch ${Math.floor(i / this.batchSize) + 1} of ${Math.ceil(resumes.length / this.batchSize)}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (resume) => {
        try {
          const response = await fetch('/api/parse-resume-smart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText: resume.text }),
          });
          
          const result = await response.json();
          return { id: resume.id, success: true, data: result };
        } catch (error) {
          return { id: resume.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Wait between batches (except for the last one)
      if (i + this.batchSize < resumes.length) {
        console.log(`Waiting ${this.delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }
    
    return results;
  }
}
