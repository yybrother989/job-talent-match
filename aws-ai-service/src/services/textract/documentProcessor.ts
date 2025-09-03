import { config } from 'dotenv';
import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { logger } from '../../utils/logger';

// Load environment variables
config();

export interface DocumentProcessingResult {
  success: boolean;
  extractedText?: string;
  structuredData?: any;
  error?: string;
  processingTime: number;
  provider: string;
  timestamp: Date;
}

export interface DocumentProcessingOptions {
  includeStructuredData?: boolean;
  includeFormData?: boolean;
  includeTableData?: boolean;
  languageCode?: string;
}

export class DocumentProcessor {
  private client: TextractClient;

  constructor(region?: string) {
    this.client = new TextractClient({ 
      region: region || process.env.AWS_REGION || 'us-east-1' 
    });
  }

  async processDocument(
    documentBytes: Buffer, 
    options: DocumentProcessingOptions = {}
  ): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting document processing with Textract', { 
        documentSize: documentBytes.length,
        options 
      });

      // First, extract basic text
      const textResult = await this.extractText(documentBytes);
      
      let structuredData = null;
      if (options.includeStructuredData || options.includeFormData || options.includeTableData) {
        structuredData = await this.analyzeDocument(documentBytes, options);
      }

      const processingTime = Date.now() - startTime;

      logger.info('Document processing completed', { 
        processingTime,
        textLength: textResult.extractedText?.length || 0,
        hasStructuredData: !!structuredData
      });

      return {
        success: true,
        extractedText: textResult.extractedText,
        structuredData,
        processingTime,
        provider: 'aws-textract',
        timestamp: new Date(),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Document processing failed', { error, processingTime });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        provider: 'aws-textract',
        timestamp: new Date(),
      };
    }
  }

  private async extractText(documentBytes: Buffer): Promise<{ extractedText: string }> {
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: documentBytes
      }
    });

    const response = await this.client.send(command);
    
    // Extract text from blocks
    const textBlocks = response.Blocks?.filter(block => 
      block.BlockType === 'LINE' && block.Text
    ) || [];

    const extractedText = textBlocks
      .map(block => block.Text)
      .join('\n');

    return { extractedText };
  }

  private async analyzeDocument(
    documentBytes: Buffer, 
    options: DocumentProcessingOptions
  ): Promise<any> {
    const features = [];
    
    if (options.includeFormData) {
      features.push('FORMS');
    }
    if (options.includeTableData) {
      features.push('TABLES');
    }

    if (features.length === 0) {
      return null;
    }

    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: documentBytes
      },
      FeatureTypes: features
    });

    const response = await this.client.send(command);
    
    // Process the structured data
    const structuredData = {
      forms: this.extractFormData(response.Blocks || []),
      tables: this.extractTableData(response.Blocks || []),
      blocks: response.Blocks
    };

    return structuredData;
  }

  private extractFormData(blocks: any[]): any[] {
    const forms = [];
    const keyValuePairs = blocks.filter(block => block.BlockType === 'KEY_VALUE_SET');
    
    for (const kvp of keyValuePairs) {
      if (kvp.EntityTypes?.includes('KEY')) {
        const key = this.getTextFromBlock(kvp, blocks);
        const value = this.getValueFromKey(kvp, blocks);
        
        if (key && value) {
          forms.push({ key, value });
        }
      }
    }
    
    return forms;
  }

  private extractTableData(blocks: any[]): any[] {
    const tables = [];
    const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');
    
    for (const table of tableBlocks) {
      const tableData = this.processTable(table, blocks);
      if (tableData.rows.length > 0) {
        tables.push(tableData);
      }
    }
    
    return tables;
  }

  private processTable(table: any, blocks: any[]): any {
    const cells = blocks.filter(block => 
      block.BlockType === 'CELL' && block.RowIndex && block.ColumnIndex
    ).sort((a, b) => {
      if (a.RowIndex !== b.RowIndex) {
        return a.RowIndex - b.RowIndex;
      }
      return a.ColumnIndex - b.ColumnIndex;
    });

    const rows: any[] = [];
    let currentRow: any[] = [];
    let currentRowIndex = 0;

    for (const cell of cells) {
      if (cell.RowIndex !== currentRowIndex) {
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentRowIndex = cell.RowIndex;
      }
      
      const cellText = this.getTextFromBlock(cell, blocks);
      currentRow.push(cellText);
    }
    
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return { rows };
  }

  private getTextFromBlock(block: any, allBlocks: any[]): string {
    if (!block.Relationships) return '';
    
    const textBlocks = block.Relationships
      .filter((rel: any) => rel.Type === 'CHILD')
      .flatMap((rel: any) => rel.Ids)
      .map((id: string) => allBlocks.find(b => b.Id === id))
      .filter(block => block && block.BlockType === 'WORD')
      .map(block => block.Text);
    
    return textBlocks.join(' ');
  }

  private getValueFromKey(keyBlock: any, allBlocks: any[]): string {
    if (!keyBlock.Relationships) return '';
    
    const valueRelationships = keyBlock.Relationships.filter((rel: any) => rel.Type === 'VALUE');
    if (valueRelationships.length === 0) return '';
    
    const valueBlock = allBlocks.find(block => 
      block.Id === valueRelationships[0].Ids[0]
    );
    
    return this.getTextFromBlock(valueBlock, allBlocks);
  }

  // Utility method to process different document types
  async processResumeDocument(documentBytes: Buffer): Promise<DocumentProcessingResult> {
    return this.processDocument(documentBytes, {
      includeStructuredData: true,
      includeFormData: true,
      includeTableData: true,
      languageCode: 'en'
    });
  }

  // Batch processing for multiple documents
  async processDocumentsBatch(
    documents: Buffer[], 
    options: DocumentProcessingOptions = {}
  ): Promise<DocumentProcessingResult[]> {
    logger.info('Starting batch document processing', { count: documents.length });
    
    const results = await Promise.allSettled(
      documents.map(doc => this.processDocument(doc, options))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          processingTime: 0,
          provider: 'aws-textract',
          timestamp: new Date(),
        };
      }
    });
  }
}
