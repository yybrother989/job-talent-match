// Alternative text extraction using CDN-loaded PDF.js
// This approach is more reliable than dynamic imports

declare global {
  interface Window {
    pdfjsLib: any
  }
}

// Load PDF.js from CDN
const loadPDFJS = async (): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only run in browser')
  }

  // Check if already loaded
  if (window.pdfjsLib) {
    return window.pdfjsLib
  }

  // Load PDF.js from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js'
    script.onload = () => {
      // Set worker source
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js'
      resolve(window.pdfjsLib)
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'))
    document.head.appendChild(script)
  })
}

// Extract text from PDF files using CDN version
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const pdfjs = await loadPDFJS()
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }
    
    return fullText.trim()
  } catch (error) {
    console.error('PDF text extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

// Extract text from DOCX files
export const extractTextFromDOCX = async (file: File): Promise<string> => {
  try {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value.trim()
  } catch (error) {
    console.error('DOCX text extraction error:', error)
    throw new Error('Failed to extract text from DOCX')
  }
}

// Extract text from DOC files (basic approach)
export const extractTextFromDOC = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const decoder = new TextDecoder('utf-8')
    const text = decoder.decode(arrayBuffer)
    const readableText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    return readableText.trim() || 'Unable to extract text from .doc file. Please convert to PDF or DOCX for better results.'
  } catch (error) {
    console.error('DOC text extraction error:', error)
    throw new Error('Failed to extract text from DOC file')
  }
}

// Main text extraction function
export const extractTextFromFile = async (file: File): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('Text extraction can only run on the client side')
  }

  const fileType = file.type.toLowerCase()
  
  if (fileType.includes('pdf')) {
    return await extractTextFromPDF(file)
  } else if (fileType.includes('docx') || fileType.includes('vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    return await extractTextFromDOCX(file)
  } else if (fileType.includes('doc') || fileType.includes('msword')) {
    return await extractTextFromDOC(file)
  } else {
    throw new Error('Unsupported file type. Please upload PDF, DOC, or DOCX files.')
  }
}

// Clean and normalize extracted text
export const cleanExtractedText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

// Estimate text quality for parsing
export const estimateTextQuality = (text: string): number => {
  const words = text.split(/\s+/).length
  const sentences = text.split(/[.!?]+/).length
  const paragraphs = text.split(/\n+/).length
  
  let score = 0
  
  if (words > 50) score += 30
  if (sentences > 5) score += 20
  if (paragraphs > 2) score += 20
  if (text.includes('Experience') || text.includes('Skills') || text.includes('Education')) score += 30
  
  return Math.min(score, 100)
}
