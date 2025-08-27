// Text extraction utilities for different file formats
import mammoth from 'mammoth'

// PDF.js imports - only on client side
let pdfjs: any = null
let GlobalWorkerOptions: any = null
let pdfjsPromise: Promise<any> | null = null

// Dynamically import PDF.js only on client side
if (typeof window !== 'undefined') {
  pdfjsPromise = import('pdfjs-dist').then((pdfjsModule) => {
    pdfjs = pdfjsModule
    GlobalWorkerOptions = pdfjsModule.GlobalWorkerOptions
    GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsModule.version}/pdf.worker.min.js`
    return pdfjsModule
  })
}

// Extract text from PDF files
export const extractTextFromPDF = async (file: File): Promise<string> => {
  // Wait for PDF.js to load if it's not ready yet
  if (!pdfjs || !GlobalWorkerOptions) {
    if (!pdfjsPromise) {
      throw new Error('PDF.js not available. Please refresh the page.')
    }
    console.log('Waiting for PDF.js to load...')
    await pdfjsPromise
  }

  try {
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
    // For .doc files, we'll need to convert to text
    // This is a simplified approach - in production you might want to use a more robust solution
    const arrayBuffer = await file.arrayBuffer()
    
    // Basic text extraction from binary .doc content
    // This is a simplified approach and may not work perfectly for all .doc files
    const decoder = new TextDecoder('utf-8')
    const text = decoder.decode(arrayBuffer)
    
    // Extract readable text (remove binary content)
    const readableText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    
    return readableText.trim() || 'Unable to extract text from .doc file. Please convert to PDF or DOCX for better results.'
  } catch (error) {
    console.error('DOC text extraction error:', error)
    throw new Error('Failed to extract text from DOC file')
  }
}

// Main text extraction function
export const extractTextFromFile = async (file: File): Promise<string> => {
  // Ensure we're on the client side
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
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim()
}

// Estimate text quality for parsing
export const estimateTextQuality = (text: string): number => {
  const words = text.split(/\s+/).length
  const sentences = text.split(/[.!?]+/).length
  const paragraphs = text.split(/\n+/).length
  
  // Simple quality score based on text structure
  let score = 0
  
  if (words > 50) score += 30 // Good amount of content
  if (sentences > 5) score += 20 // Well-structured sentences
  if (paragraphs > 2) score += 20 // Good paragraph structure
  if (text.includes('Experience') || text.includes('Skills') || text.includes('Education')) score += 30 // Resume keywords
  
  return Math.min(score, 100)
}
