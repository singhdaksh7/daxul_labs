import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface UploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  provider: 'local' | 's3' | 'minio' | 'r2';
  url: string;
}

export interface StoredFile {
  body: Buffer;
  contentType?: string;
}

export interface StorageOptions {
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
];

const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.php', '.pl', '.py', '.js', '.ts',
  '.jsp', '.asp', '.aspx', '.html', '.htm', '.xhtml', '.phtml', '.cgi', '.dll', '.so'
];

const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB (Supports short videos)

export abstract class StorageService {
  abstract uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: StorageOptions
  ): Promise<UploadResult>;

  /**
   * Reads a stored object by its generated filename. Returns null when it does not exist.
   * Callers (app routes) are responsible for authorizing access before calling this.
   */
  abstract getFile(filename: string): Promise<StoredFile | null>;

  protected validateFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: StorageOptions
  ): void {
    const allowed = options?.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES;
    const maxSize = options?.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;

    // 1. Extension Blacklist Check
    const ext = path.extname(originalName).toLowerCase();
    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
      throw new Error(`Executable or script files with extension ${ext} are strictly prohibited.`);
    }

    // 2. MIME Type Whitelist Check
    if (!allowed.includes(mimeType)) {
      throw new Error(`Invalid file type: ${mimeType}. Allowed types: ${allowed.join(', ')}`);
    }

    // 3. File Size Check
    if (buffer.length > maxSize) {
      throw new Error(
        `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of ${(maxSize / (1024 * 1024)).toFixed(0)}MB.`
      );
    }

    // 4. Magic Bytes Server-side Validation
    this.validateMagicBytes(buffer, mimeType);

    // 5. SVG XSS Payload Inspection
    if (mimeType === 'image/svg+xml' || ext === '.svg') {
      const content = buffer.toString('utf8').toLowerCase();
      if (
        content.includes('<script') ||
        content.includes('javascript:') ||
        content.includes('onload=') ||
        content.includes('onerror=') ||
        content.includes('onclick=')
      ) {
        throw new Error('SECURITY VIOLATION: SVG contains embedded scripts or inline handlers.');
      }
    }
  }

  private validateMagicBytes(buffer: Buffer, mimeType: string): void {
    if (buffer.length < 4) return;

    if (mimeType === 'image/jpeg') {
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        throw new Error('File content header does not match valid JPEG image signature.');
      }
    } else if (mimeType === 'image/png') {
      if (
        buffer[0] !== 0x89 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x4e ||
        buffer[3] !== 0x47
      ) {
        throw new Error('File content header does not match valid PNG image signature.');
      }
    } else if (mimeType === 'image/webp') {
      const header = buffer.toString('ascii', 0, 12);
      if (!header.startsWith('RIFF') || !header.endsWith('WEBP')) {
        throw new Error('File content header does not match valid WEBP image signature.');
      }
    } else if (mimeType === 'application/pdf') {
      const header = buffer.toString('ascii', 0, 4);
      if (!header.startsWith('%PDF')) {
        throw new Error('File content header does not match valid PDF document signature.');
      }
    }
  }

  protected generateRandomFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase() || '.bin';
    const safeExt = ext.replace(/[^a-zA-Z0-9._-]/g, '');
    const randomHex = crypto.randomBytes(16).toString('hex');
    return `${randomHex}${safeExt}`;
  }
}

/**
 * Local VPS Storage Provider
 * Saves files outside public source code directory
 */
export class LocalStorageService extends StorageService {
  private storageDir: string;
  private publicUrlPrefix: string;

  constructor() {
    super();
    this.storageDir = process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');
    this.publicUrlPrefix = process.env.STORAGE_PUBLIC_URL_PREFIX || '/api/uploads/file';

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: StorageOptions
  ): Promise<UploadResult> {
    this.validateFile(buffer, originalName, mimeType, options);

    const filename = this.generateRandomFilename(originalName);
    const filePath = path.join(this.storageDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    return {
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      provider: 'local',
      url: `${this.publicUrlPrefix}/${filename}`,
    };
  }

  async getFile(filename: string): Promise<StoredFile | null> {
    // Strip any directory components to prevent path traversal
    const filePath = path.join(this.storageDir, path.basename(filename));
    try {
      return { body: await fs.promises.readFile(filePath) };
    } catch (err: any) {
      if (err?.code === 'ENOENT') return null;
      throw err;
    }
  }
}

/**
 * S3-compatible Storage Provider (Cloudflare R2, MinIO, AWS S3)
 */
export class S3StorageService extends StorageService {
  private client: S3Client;
  private bucket: string;
  private publicUrlPrefix: string;
  private providerName: 's3' | 'minio' | 'r2';

  constructor(providerName: 's3' | 'minio' | 'r2' = 's3') {
    super();
    const bucket = process.env.S3_BUCKET_NAME;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 storage is not configured: S3_BUCKET_NAME, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required.');
    }
    if (providerName !== 's3' && !endpoint) {
      throw new Error(`${providerName.toUpperCase()} storage requires S3_ENDPOINT.`);
    }

    this.providerName = providerName;
    this.bucket = bucket;
    this.publicUrlPrefix = process.env.STORAGE_PUBLIC_URL_PREFIX || '/api/uploads/file';
    this.client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: endpoint || undefined,
      forcePathStyle: providerName !== 's3',
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: StorageOptions
  ): Promise<UploadResult> {
    this.validateFile(buffer, originalName, mimeType, options);
    const filename = this.generateRandomFilename(originalName);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      })
    );

    return {
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      provider: this.providerName,
      url: `${this.publicUrlPrefix}/${filename}`,
    };
  }

  async getFile(filename: string): Promise<StoredFile | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: path.basename(filename) })
      );
      if (!res.Body) return null;
      return {
        body: Buffer.from(await res.Body.transformToByteArray()),
        contentType: res.ContentType,
      };
    } catch (err: any) {
      if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null;
      throw err;
    }
  }
}

export function getStorageService(): StorageService {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 's3' || provider === 'minio' || provider === 'r2') {
    return new S3StorageService(provider as any);
  }
  return new LocalStorageService();
}
