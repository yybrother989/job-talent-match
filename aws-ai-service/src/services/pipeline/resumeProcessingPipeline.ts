import { config } from 'dotenv';
import { DocumentProcessor, DocumentProcessingResult } from '../textract/documentProcessor';
import { BedrockResumeParser, ResumeParsingResult } from '../bedrock/resumeParser';
import { logger } from '../../utils/logger';

// Load environment variables
config();

export interface ResumeProcessingPipelineResult {
  success: boolean;
  documentProcessing?: DocumentProcessingResult;
  resumeParsing?: ResumeParsingResult;
  error?: string;
  totalProcessingTime: number;
  timestamp: Date;
}

export interface PipelineOptions {
  // Document processing options
  includeStructuredData?: boolean;
  includeFormData?: boolean;
  includeTableData?: boolean;
  
  // Resume parsing options
  includeConfidence?: boolean;
  includeRawResponse?: boolean;
  language?: string;
  temperature?: number;
  maxTokens?: number;
}

export class ResumeProcessingPipeline {
  private documentProcessor: DocumentProcessor;
  private resumeParser: BedrockResumeParser;

  constructor(region?: string, modelId?: string) {
    this.documentProcessor = new DocumentProcessor(region);
    this.resumeParser = new BedrockResumeParser(region, modelId);
  }

  async processResume(
    documentBytes: Buffer, 
    options: PipelineOptions = {}
  ): Promise<ResumeProcessingPipelineResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting resume processing pipeline', { 
        documentSize: documentBytes.length,
        options 
      });

      // Step 1: Extract text from document using Textract
      logger.info('Step 1: Extracting text from document...');
      const documentResult = await this.documentProcessor.processResumeDocument(documentBytes);
      
      if (!documentResult.success || !documentResult.extractedText) {
        return {
          success: false,
          documentProcessing: documentResult,
          error: 'Failed to extract text from document',
          totalProcessingTime: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      logger.info('Text extraction completed', { 
        textLength: documentResult.extractedText.length 
      });

      // Step 2: Parse resume using Bedrock
      logger.info('Step 2: Parsing resume with AI...');
      const resumeResult = await this.resumeParser.parseResume(
        documentResult.extractedText,
        {
          includeConfidence: options.includeConfidence,
          includeRawResponse: options.includeRawResponse,
          language: options.language,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        }
      );

      const totalProcessingTime = Date.now() - startTime;

      logger.info('Resume processing pipeline completed', { 
        totalProcessingTime,
        documentSuccess: documentResult.success,
        resumeSuccess: resumeResult.success
      });

      return {
        success: documentResult.success && resumeResult.success,
        documentProcessing: documentResult,
        resumeParsing: resumeResult,
        totalProcessingTime,
        timestamp: new Date(),
      };

    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;
      logger.error('Resume processing pipeline failed', { error, totalProcessingTime });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalProcessingTime,
        timestamp: new Date(),
      };
    }
  }

  // Process multiple resumes in batch
  async processResumesBatch(
    documents: Buffer[], 
    options: PipelineOptions = {}
  ): Promise<ResumeProcessingPipelineResult[]> {
    logger.info('Starting batch resume processing pipeline', { count: documents.length });
    
    const results = await Promise.allSettled(
      documents.map(doc => this.processResume(doc, options))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          totalProcessingTime: 0,
          timestamp: new Date(),
        };
      }
    });
  }

  // Get processing statistics
  getProcessingStats(results: ResumeProcessingPipelineResult[]): {
    total: number;
    successful: number;
    failed: number;
    averageProcessingTime: number;
    totalProcessingTime: number;
  } {
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const totalProcessingTime = results.reduce((sum, r) => sum + r.totalProcessingTime, 0);
    const averageProcessingTime = results.length > 0 ? totalProcessingTime / results.length : 0;

    return {
      total: results.length,
      successful,
      failed,
      averageProcessingTime,
      totalProcessingTime,
    };
  }

  // Validate document format
  validateDocument(documentBytes: Buffer): { valid: boolean; error?: string } {
    // Check file size (max 10MB for Textract)
    if (documentBytes.length > 10 * 1024 * 1024) {
      return { valid: false, error: 'Document too large (max 10MB)' };
    }

    // Check minimum size
    if (documentBytes.length < 100) {
      return { valid: false, error: 'Document too small' };
    }

    // Basic format validation (check for common document signatures)
    const signatures = {
      pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
      png: [0x89, 0x50, 0x4E, 0x47], // PNG
      jpeg: [0xFF, 0xD8, 0xFF], // JPEG
      tiff: [0x49, 0x49, 0x2A, 0x00], // TIFF (little endian)
    };

    const firstBytes = Array.from(documentBytes.slice(0, 4));
    const isValidFormat = Object.values(signatures).some(sig => 
      sig.every((byte, index) => firstBytes[index] === byte)
    );

    if (!isValidFormat) {
      return { valid: false, error: 'Unsupported document format' };
    }

    return { valid: true };
  }
}
