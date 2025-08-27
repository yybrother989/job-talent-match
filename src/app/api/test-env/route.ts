import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test environment variables
    const envCheck = {
      openaiKeyExists: !!process.env.OPENAI_API_KEY,
      openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'none',
      supabaseUrlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Environment test completed',
      data: envCheck
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
