import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      )
    }
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json(
        { error: 'Hugging Face API key not configured' },
        { status: 500 }
      )
    }
    
    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/sentence-similarity',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          inputs: {
            "source_sentence": text,
            "sentences": [text]
          }
        })
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hugging Face API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Embedding generation failed: ${response.status}` },
        { status: 500 }
      )
    }
    
    const result = await response.json()
    
    // The API returns similarity scores, not embeddings
    // For now, we'll return a placeholder response
    console.warn('New Hugging Face API format detected. Using fallback response.')
    return NextResponse.json({
      embedding: null,
      dimensions: 0,
      model: 'all-MiniLM-L6-v2 (similarity mode)',
      text_length: text.length,
      timestamp: new Date().toISOString(),
      note: 'API now returns similarity scores, not embeddings'
    })
    
  } catch (error) {
    console.error('Embedding API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
