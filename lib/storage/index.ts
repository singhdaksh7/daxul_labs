import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  provider: 'local' | 's3' | 'minio';
  url: string;
}

export interface StorageOptions {
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
}

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
];

const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.php', '.pl', '.py', '.js', '.ts',
  '.jsp', '.asp', '.aspx', '.html', '.htm', '.xhtml', '.phtml', '.cgi', '.dll', '.so'
];

const DEFAULT_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export abstract class StorageService {
  abstract uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: StorageOptions
  ): Promise<UploadResult>;

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
}

/**
 * S3 / MinIO Storage Provider (Architecture Ready)
 */
export class S3StorageService extends StorageService {
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: StorageOptions
  ): Promise<UploadResult> {
    this.validateFile(buffer, originalName, mimeType, options);
    const filename = this.generateRandomFilename(originalName);
    
    const s3Bucket = process.env.S3_BUCKET_NAME || 'daxul-uploads';
    const s3Endpoint = process.env.S3_PUBLIC_URL || `https://${s3Bucket}.s3.amazonaws.com`;

    return {
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      provider: 's3',
      url: `${s3Endpoint}/${filename}`,
    };
  }
}

export function getStorageService(): StorageService {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (provider === 's3' || provider === 'minio' || provider === 'r2') {
    return new S3StorageService();
  }
  return new LocalStorageService();
}
