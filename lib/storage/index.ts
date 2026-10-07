import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

export type UploadValidationCode =
  | 'FORBIDDEN_EXTENSION'
  | 'INVALID_TYPE'
  | 'TOO_LARGE'
  | 'EMPTY_FILE'
  | 'BAD_SIGNATURE'
  | 'UNSAFE_CONTENT';

/**
 * Thrown by the storage layer for any user-caused validation failure (never for infrastructure
 * failures). Routes map it to HTTP 400 (413 for TOO_LARGE). Messages are safe to show to users.
 */
export class UploadValidationError extends Error {
  readonly code: UploadValidationCode;
  constructor(code: UploadValidationCode, message: string) {
    super(message);
    this.name = 'UploadValidationError';
    this.code = code;
  }
  get status(): number {
    return this.code === 'TOO_LARGE' ? 413 : 400;
  }
}

/** Thrown when a storage key is not a plain generated filename (traversal attempt etc). */
export class InvalidStorageKeyError extends Error {
  constructor(key: string) {
    super(`Invalid storage key: ${JSON.stringify(String(key).slice(0, 80))}`);
    this.name = 'InvalidStorageKeyError';
  }
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'application/pdf': '.pdf',
};

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

const BAD_KEY_CHARS = /[\\/\0]/;

function isPlainKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key !== '.' &&
    key !== '..' &&
    key === path.basename(key) &&
    !BAD_KEY_CHARS.test(key)
  );
}

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

  /**
   * Deletes a stored object by key. Idempotent: a missing object is success.
   * Throws InvalidStorageKeyError for anything that is not a plain filename.
   */
  abstract deleteFile(key: string): Promise<void>;

  /** Pure validation; throws UploadValidationError. Runs before anything is stored. */
  validateFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: StorageOptions
  ): void {
    const allowed = options?.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES;
    const maxSize = options?.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;

    if (buffer.length === 0) {
      throw new UploadValidationError('EMPTY_FILE', 'The uploaded file is empty.');
    }

    // 1. Extension denylist. Every dot-separated segment is checked so "shell.php.png" is refused too.
    const segments = path.basename(originalName || '').toLowerCase().split('.').slice(1);
    const bad = segments.find((seg) => FORBIDDEN_EXTENSIONS.includes(`.${seg}`));
    if (bad) {
      throw new UploadValidationError(
        'FORBIDDEN_EXTENSION',
        `Executable or script files with extension .${bad} are strictly prohibited.`
      );
    }

    // 2. MIME Type Whitelist Check
    if (!allowed.includes(mimeType)) {
      throw new UploadValidationError(
        'INVALID_TYPE',
        `Invalid file type: ${String(mimeType).slice(0, 60)}. Allowed types: ${allowed.join(', ')}`
      );
    }

    // 3. File Size Check
    if (buffer.length > maxSize) {
      throw new UploadValidationError(
        'TOO_LARGE',
        `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum limit of ${(maxSize / (1024 * 1024)).toFixed(0)}MB.`
      );
    }

    // 4. Magic bytes (always; truncated files fail)
    this.validateMagicBytes(buffer, mimeType);

    // 5. SVG XSS payload inspection
    if (mimeType === 'image/svg+xml') {
      const content = buffer.toString('utf8').toLowerCase();
      if (
        content.includes('<script') ||
        content.includes('javascript:') ||
        content.includes('onload=') ||
        content.includes('onerror=') ||
        content.includes('onclick=')
      ) {
        throw new UploadValidationError('UNSAFE_CONTENT', 'SECURITY VIOLATION: SVG contains embedded scripts or inline handlers.');
      }
    }
  }

  private validateMagicBytes(buffer: Buffer, mimeType: string): void {
    const fail = (name: string): never => {
      throw new UploadValidationError('BAD_SIGNATURE', `File content does not match a valid ${name} signature.`);
    };
    const startsWith = (bytes: number[]) =>
      buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b);

    switch (mimeType) {
      case 'image/jpeg':
        if (!startsWith([0xff, 0xd8, 0xff]) || buffer.length < 12) fail('JPEG');
        break;
      case 'image/png':
        // Full 8-byte signature, then an IHDR chunk must follow (min 33 bytes).
        if (
          !startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ||
          buffer.length < 33 ||
          buffer.toString('ascii', 12, 16) !== 'IHDR'
        ) {
          fail('PNG');
        }
        break;
      case 'image/webp':
        if (
          buffer.length < 20 ||
          buffer.toString('ascii', 0, 4) !== 'RIFF' ||
          buffer.toString('ascii', 8, 12) !== 'WEBP' ||
          !/^VP8[ LX]$/.test(buffer.toString('ascii', 12, 16))
        ) {
          fail('WEBP');
        }
        break;
      case 'application/pdf':
        if (buffer.length < 12 || buffer.toString('ascii', 0, 5) !== '%PDF-') fail('PDF');
        break;
      case 'image/gif':
        if (buffer.length < 10 || !['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) fail('GIF');
        break;
      case 'image/avif':
      case 'video/mp4':
        if (buffer.length < 12 || buffer.toString('ascii', 4, 8) !== 'ftyp') {
          fail(mimeType === 'image/avif' ? 'AVIF' : 'MP4');
        }
        break;
      case 'video/webm':
        if (!startsWith([0x1a, 0x45, 0xdf, 0xa3]) || buffer.length < 12) fail('WEBM');
        break;
      default:
        break; // SVG handled by the content scan
    }
  }

  /** Extension comes from the validated MIME type, never from the user-supplied name. */
  protected generateRandomFilename(mimeType: string): string {
    const safeExt = EXT_BY_MIME[mimeType] || '.bin';
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

    const filename = this.generateRandomFilename(mimeType);
    const filePath = path.join(this.storageDir, filename);

    try {
      await fs.promises.writeFile(filePath, buffer, { flag: 'wx' });
    } catch (err) {
      // Never leave a partial file behind (but never delete a pre-existing file on a name clash).
      if ((err as any)?.code !== 'EEXIST') await fs.promises.unlink(filePath).catch(() => undefined);
      throw err;
    }

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

  async deleteFile(key: string): Promise<void> {
    const filePath = this.resolveKey(key);
    try {
      await fs.promises.unlink(filePath);
    } catch (err: any) {
      if (err?.code === 'ENOENT') return;
      throw err;
    }
  }

  /** Key must be a plain filename and resolve directly inside storageDir. */
  private resolveKey(key: string): string {
    if (!isPlainKey(key)) throw new InvalidStorageKeyError(key);
    const root = path.resolve(this.storageDir);
    const resolved = path.resolve(root, key);
    if (path.dirname(resolved) !== root) throw new InvalidStorageKeyError(key);
    return resolved;
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
    const filename = this.generateRandomFilename(mimeType);

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: buffer,
          ContentType: mimeType,
          ContentLength: buffer.length,
        })
      );
    } catch (err) {
      await this.deleteFile(filename).catch(() => undefined);
      throw err;
    }

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

  async deleteFile(key: string): Promise<void> {
    if (!isPlainKey(key)) throw new InvalidStorageKeyError(key);
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err: any) {
      if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return;
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
