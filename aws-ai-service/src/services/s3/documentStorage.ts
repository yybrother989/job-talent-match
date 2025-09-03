import { config } from 'dotenv';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../../utils/logger';
import { S3Document } from '../../types/dataModels';

// Load environment variables
config();

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  makePublic?: boolean;
  tags?: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface DownloadOptions {
  bucket?: string;
  key: string;
}

export class DocumentStorageService {
  private client: S3Client;
  private defaultBucket: string;

  constructor(region?: string, bucket?: string) {
    this.client = new S3Client({ 
      region: region || process.env.AWS_REGION || 'us-east-1' 
    });
    this.defaultBucket = bucket || process.env.AWS_S3_BUCKET || 'job-talent-match-documents';
  }

  async uploadDocument(
    file: Buffer,
    fileName: string,
    contentType: string,
    uploadedBy: string,
    options: UploadOptions = {}
  ): Promise<S3Document> {
    try {
      const bucket = options.bucket || this.defaultBucket;
      const folder = options.folder || 'documents';
      const timestamp = Date.now();
      const sanitizedFileName = this.sanitizeFileName(fileName);
      const key = `${folder}/${uploadedBy}/${timestamp}-${sanitizedFileName}`;

      logger.info('Uploading document to S3', { 
        fileName, 
        key, 
        size: file.length,
        contentType 
      });

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedBy,
          uploadedAt: new Date().toISOString(),
          ...options.metadata
        },
        // Tags: options.tags ? this.formatTags(options.tags) : undefined, // Commented out due to SDK version compatibility
        ACL: options.makePublic ? 'public-read' : 'private'
      });

      await this.client.send(command);

      const document: S3Document = {
        key,
        bucket,
        originalName: fileName,
        contentType,
        size: file.length,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
        tags: options.tags
      };

      logger.info('Document uploaded successfully', { key, size: file.length });
      return document;

    } catch (error) {
      logger.error('Failed to upload document', { error, fileName });
      throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadDocument(options: DownloadOptions): Promise<Buffer> {
    try {
      const bucket = options.bucket || this.defaultBucket;
      
      logger.info('Downloading document from S3', { key: options.key });

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: options.key
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('No document body received');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      
      logger.info('Document downloaded successfully', { 
        key: options.key, 
        size: buffer.length 
      });
      
      return buffer;

    } catch (error) {
      logger.error('Failed to download document', { error, key: options.key });
      throw new Error(`Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteDocument(key: string, bucket?: string): Promise<void> {
    try {
      const targetBucket = bucket || this.defaultBucket;
      
      logger.info('Deleting document from S3', { key });

      const command = new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key
      });

      await this.client.send(command);
      
      logger.info('Document deleted successfully', { key });

    } catch (error) {
      logger.error('Failed to delete document', { error, key });
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocumentInfo(key: string, bucket?: string): Promise<S3Document | null> {
    try {
      const targetBucket = bucket || this.defaultBucket;
      
      const command = new HeadObjectCommand({
        Bucket: targetBucket,
        Key: key
      });

      const response = await this.client.send(command);
      
      if (!response) {
        return null;
      }

      const document: S3Document = {
        key,
        bucket: targetBucket,
        originalName: response.Metadata?.originalName || key.split('/').pop() || '',
        contentType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
        uploadedAt: response.Metadata?.uploadedAt || response.LastModified?.toISOString() || '',
        uploadedBy: response.Metadata?.uploadedBy || 'unknown',
        tags: response.Metadata ? this.parseMetadataTags(response.Metadata) : undefined
      };

      return document;

    } catch (error) {
      logger.error('Failed to get document info', { error, key });
      return null;
    }
  }

  async listUserDocuments(userId: string, bucket?: string, folder?: string): Promise<S3Document[]> {
    try {
      const targetBucket = bucket || this.defaultBucket;
      const targetFolder = folder || 'documents';
      const prefix = `${targetFolder}/${userId}/`;
      
      logger.info('Listing user documents', { userId, prefix });

      const command = new ListObjectsV2Command({
        Bucket: targetBucket,
        Prefix: prefix
      });

      const response = await this.client.send(command);
      
      if (!response.Contents) {
        return [];
      }

      const documents: S3Document[] = [];
      
      for (const object of response.Contents) {
        if (object.Key) {
          const docInfo = await this.getDocumentInfo(object.Key, targetBucket);
          if (docInfo) {
            documents.push(docInfo);
          }
        }
      }

      logger.info('User documents listed', { userId, count: documents.length });
      return documents;

    } catch (error) {
      logger.error('Failed to list user documents', { error, userId });
      throw new Error(`Failed to list user documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generatePresignedUrl(key: string, bucket?: string, expiresIn: number = 3600): Promise<string> {
    try {
      const targetBucket = bucket || this.defaultBucket;
      
      // Note: For presigned URLs, you'd typically use @aws-sdk/s3-request-presigner
      // This is a simplified version - in production, implement proper presigned URL generation
      
      logger.info('Generating presigned URL', { key, expiresIn });
      
      // For now, return a placeholder - implement with s3-request-presigner
      const url = `https://${targetBucket}.s3.amazonaws.com/${key}`;
      
      return url;

    } catch (error) {
      logger.error('Failed to generate presigned URL', { error, key });
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility methods
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private formatTags(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }

  private parseMetadataTags(metadata: Record<string, string>): Record<string, string> {
    const tags: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith('tag-')) {
        const tagKey = key.replace('tag-', '');
        tags[tagKey] = value;
      }
    }
    
    return tags;
  }

  // Batch operations
  async uploadMultipleDocuments(
    files: Array<{ buffer: Buffer; fileName: string; contentType: string }>,
    uploadedBy: string,
    options: UploadOptions = {}
  ): Promise<S3Document[]> {
    logger.info('Starting batch document upload', { count: files.length });

    const uploadPromises = files.map(file => 
      this.uploadDocument(file.buffer, file.fileName, file.contentType, uploadedBy, options)
    );

    const results = await Promise.allSettled(uploadPromises);
    
    const successful: S3Document[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push(files[index].fileName);
        logger.error('Failed to upload document in batch', { 
          fileName: files[index].fileName, 
          error: result.reason 
        });
      }
    });

    logger.info('Batch upload completed', { 
      successful: successful.length, 
      failed: failed.length 
    });

    return successful;
  }
}
