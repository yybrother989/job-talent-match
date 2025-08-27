import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    // Test if OpenAI API is accessible
    const models = await openai.models.list()
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API is accessible',
      availableModels: models.data.map(model => ({
        id: model.id,
        created: model.created,
        owned_by: model.owned_by
      })).slice(0, 10) // Show first 10 models
    })

  } catch (error) {
    console.error('OpenAI API test error:', error)
    
    if (error && typeof error === 'object' && 'status' in error) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API error',
        status: error.status,
        details: error
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
