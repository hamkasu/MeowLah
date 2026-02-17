import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import { env } from './env';

const isS3Configured = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY);

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT || undefined,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY || 'unused',
    secretAccessKey: env.S3_SECRET_KEY || 'unused',
  },
  forcePathStyle: true, // Required for R2/MinIO
});

/**
 * Upload a file to S3-compatible storage.
 * Automatically optimizes images to WebP and generates a unique key.
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  folder: string,
  contentType: string
): Promise<string> {
  if (!isS3Configured) {
    throw new Error('S3 storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY, and S3_SECRET_KEY environment variables.');
  }
  const fileId = uuid();
  const isImage = contentType.startsWith('image/');

  let finalBuffer = buffer;
  let extension = originalName.split('.').pop() || 'bin';
  let finalContentType = contentType;

  // Optimize images to WebP (skip GIFs to preserve animation)
  if (isImage && contentType !== 'image/gif') {
    finalBuffer = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    extension = 'webp';
    finalContentType = 'image/webp';
  }

  const key = `${folder}/${fileId}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: finalBuffer,
      ContentType: finalContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `${env.S3_PUBLIC_URL}/${key}`;
}

/**
 * Delete a file from S3 by its full URL.
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  if (!isS3Configured) {
    console.warn('[S3] Storage not configured, skipping file deletion');
    return;
  }
  const key = fileUrl.replace(`${env.S3_PUBLIC_URL}/`, '');
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  );
}
