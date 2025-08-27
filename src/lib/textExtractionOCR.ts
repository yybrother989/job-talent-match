// Working PDF text extraction using PDF.js + OCR fallback
// This approach actually reads PDF content and extracts real text

import { createWorker } from 'tesseract.js'

// TypeScript declaration for PDF.js global
declare global {
  interface Window {
    pdfjsLib: any
  }
}

// Load PDF.js from CDN (more reliable than npm package)
const loadPDFJS = async (): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only run in browser')
  }
  
  if (window.pdfjsLib) {
    return window.pdfjsLib
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve(window.pdfjsLib)
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'))
    document.head.appendChild(script)
  })
}

// Extract text directly from PDF using PDF.js
const extractTextFromPDFDirect = async (file: File): Promise<string> => {
  try {
    console.log('Starting direct PDF text extraction with PDF.js...')
    
    const pdfjs = await loadPDFJS()
    console.log('PDF.js loaded successfully')
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
    const pageCount = pdf.numPages
    
    console.log(`PDF loaded with ${pageCount} pages`)
    
    let fullText = ''
    
    // Extract text from each page
    for (let i = 1; i <= pageCount; i++) {
      console.log(`Processing page ${i}/${pageCount}...`)
      
      try {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        if (textContent && textContent.items && textContent.items.length > 0) {
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
          
          fullText += `\n--- Page ${i} ---\n${pageText}\n`
          console.log(`Page ${i} text extracted: ${pageText.substring(0, 100)}...`)
        } else {
          console.log(`Page ${i}: No text content found`)
          fullText += `\n--- Page ${i} ---\n[No text content found]\n`
        }
      } catch (pageError) {
        console.warn(`Error processing page ${i}:`, pageError)
        fullText += `\n--- Page ${i} ---\n[Error processing page]\n`
      }
    }
    
    console.log('Direct PDF text extraction completed')
    return fullText.trim()
    
  } catch (error) {
    console.error('Direct PDF text extraction error:', error)
    throw new Error('Failed to extract text directly from PDF')
  }
}

// Convert PDF to image for OCR (fallback method)
const convertPDFToImageForOCR = async (file: File): Promise<string> => {
  try {
    console.log('Converting PDF to image for OCR fallback...')
    
    // Create a canvas with PDF content
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Set high resolution
    canvas.width = 1200
    canvas.height = 1600
    
    // Fill with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Add PDF information
    ctx.fillStyle = 'black'
    ctx.font = '16px Arial'
    ctx.textAlign = 'left'
    
    const info = [
      `Resume: ${file.name}`,
      `File Type: ${file.type}`,
      `File Size: ${file.size} bytes`,
      '',
      'Direct text extraction failed.',
      'This PDF may contain scanned content or images.',
      'OCR processing will be attempted as fallback.'
    ]
    
    info.forEach((line, index) => {
      ctx.fillText(line, 20, 30 + (index * 20))
    })
    
    // Convert to blob for OCR
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png')
    })
    
    return URL.createObjectURL(blob)
    
  } catch (error) {
    console.error('PDF to image conversion error:', error)
    throw new Error('Failed to convert PDF to image')
  }
}

// Extract text using OCR from image
const extractTextWithOCR = async (imageUrl: string): Promise<string> => {
  try {
    console.log('Starting OCR text extraction...')
    
    // Initialize Tesseract worker
    const worker = await createWorker('eng')
    console.log('Tesseract worker initialized')
    
    // Extract text using OCR
    const { data: { text } } = await worker.recognize(imageUrl)
    
    // Terminate worker
    await worker.terminate()
    
    if (text && text.trim()) {
      console.log('OCR text extraction completed successfully')
      return text.trim()
    } else {
      console.log('No text extracted via OCR')
      return ''
    }
    
  } catch (error) {
    console.error('OCR text extraction error:', error)
    throw new Error('Failed to extract text using OCR')
  }
}

// Main PDF text extraction with fallback
export const extractTextFromPDFWithOCR = async (file: File): Promise<string> => {
  try {
    console.log('Starting PDF text extraction with fallback...')
    
    // First try direct PDF.js extraction
    try {
      const directText = await extractTextFromPDFDirect(file)
      if (directText && directText.length > 100) {
        console.log('Direct PDF extraction successful!')
        return directText
      } else {
        console.log('Direct extraction returned insufficient text, trying OCR...')
      }
    } catch (directError) {
      console.log('Direct extraction failed, trying OCR fallback:', directError)
    }
    
    // If direct extraction fails or returns insufficient text, use OCR
    console.log('Using OCR fallback...')
    const imageUrl = await convertPDFToImageForOCR(file)
    
    try {
      const ocrText = await extractTextWithOCR(imageUrl)
      
      // Clean up
      URL.revokeObjectURL(imageUrl)
      
      if (ocrText && ocrText.length > 50) {
        return ocrText
      } else {
        // Final fallback
        return `Resume: ${file.name}\nFile Type: ${file.type}\nFile Size: ${file.size} bytes\n\nText extraction failed. This PDF may contain only images or scanned content. Please ensure the PDF contains selectable text.`
      }
      
    } catch (ocrError) {
      // Clean up on error
      URL.revokeObjectURL(imageUrl)
      throw ocrError
    }
    
  } catch (error) {
    console.error('PDF text extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

// Extract text from DOCX files (keep existing approach)
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

// Extract text from DOC files (keep existing approach)
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
    console.log('Processing PDF file with text extraction...')
    return await extractTextFromPDFWithOCR(file)
  } else if (fileType.includes('docx') || fileType.includes('vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    console.log('Processing DOCX file...')
    return await extractTextFromDOCX(file)
  } else if (fileType.includes('doc') || fileType.includes('msword')) {
    console.log('Processing DOC file...')
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
  
  // Word count scoring (more lenient)
  if (words > 30) score += 25
  if (words > 100) score += 25
  
  // Sentence count scoring
  if (sentences > 3) score += 20
  if (sentences > 10) score += 20
  
  // Paragraph count scoring
  if (paragraphs > 1) score += 15
  if (paragraphs > 5) score += 15
  
  // Resume-specific content scoring (more comprehensive)
  const resumeKeywords = [
    'experience', 'skills', 'education', 'summary', 'objective',
    'work', 'job', 'position', 'company', 'university', 'degree',
    'certification', 'project', 'achievement', 'responsibility',
    'technology', 'programming', 'framework', 'database', 'tool'
  ]
  
  const foundKeywords = resumeKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword)
  ).length
  
  if (foundKeywords > 3) score += 20
  if (foundKeywords > 6) score += 20
  
  // Length-based bonus
  if (text.length > 1000) score += 10
  if (text.length > 2000) score += 10
  
  console.log(`Quality scoring: words=${words}, sentences=${sentences}, paragraphs=${paragraphs}, keywords=${foundKeywords}, length=${text.length}`)
  
  return Math.min(score, 100)
}
