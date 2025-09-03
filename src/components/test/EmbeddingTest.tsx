'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Brain, Zap, CheckCircle, AlertCircle } from 'lucide-react'

export function EmbeddingTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [testText, setTestText] = useState('Senior React Developer with TypeScript experience')

  const testEmbedding = async () => {
    if (!testText.trim()) {
      setError('Please enter some text to test')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('/api/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setResult(data)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const quickTests = [
    'Senior React Developer with TypeScript experience',
    'Full Stack Engineer proficient in Python and JavaScript',
    'Data Scientist with machine learning expertise',
    'DevOps Engineer with AWS and Docker experience',
    'Product Manager with agile methodology background'
  ]

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Hugging Face Embedding Test
        </CardTitle>
        <CardDescription>
          Test the all-MiniLM-L6-v2 model integration for generating 384-dimensional embeddings
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Text
            </label>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to generate embeddings for..."
              rows={3}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              onClick={testEmbedding} 
              disabled={loading || !testText.trim()}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Generate Embedding</span>
                </>
              )}
            </Button>
            
            <div className="text-sm text-gray-500">
              {testText.length} characters
            </div>
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Tests:</p>
          <div className="flex flex-wrap gap-2">
            {quickTests.map((text, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setTestText(text)}
                className="text-xs"
              >
                {text.length > 30 ? text.substring(0, 30) + '...' : text}
              </Button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}
        
        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="text-green-800">
                <strong>Success!</strong> API call completed successfully
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">API Response Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <Badge variant="secondary">{result.model}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dimensions:</span>
                    <Badge variant="outline">{result.dimensions}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Text Length:</span>
                    <span>{result.text_length} chars</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Generated:</span>
                    <span className="text-xs">{new Date(result.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {result.note && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Note:</span>
                      <span className="text-xs text-blue-600">{result.note}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Status</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  {result.embedding ? (
                    <>
                      <p className="text-xs text-gray-600 mb-2">
                        First 10 values (of {result.dimensions}):
                      </p>
                      <div className="text-xs font-mono">
                        [{result.embedding.slice(0, 10).map((v: number) => v.toFixed(4)).join(', ')}...]
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">⚠️ Fallback Mode Active</p>
                      <p>The Hugging Face API returned similarity scores instead of embeddings.</p>
                      <p className="text-xs mt-2">This is expected behavior for the current API configuration.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Full Vector Display (Only if embedding exists) */}
            {result.embedding && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  <span className="group-open:hidden">Show Full Vector</span>
                  <span className="hidden group-open:inline">Hide Full Vector</span>
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs font-mono text-gray-700 max-h-40 overflow-y-auto">
                    [{result.embedding.map((v: number) => v.toFixed(4)).join(', ')}]
                  </div>
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
