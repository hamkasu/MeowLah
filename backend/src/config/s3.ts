import sharp from 'sharp';

/**
 * Convert an uploaded file to a base64 data URI for storage in PostgreSQL.
 * Images are optimized (resized + converted to WebP) before encoding.
 */
export async function uploadFile(
  buffer: Buffer,
  _originalName: string,
  _folder: string,
  contentType: string
): Promise<string> {
  const isImage = contentType.startsWith('image/');

  let finalBuffer = buffer;
  let finalContentType = contentType;

  // Optimize images to WebP (skip GIFs to preserve animation)
  // Use aggressive compression since images are stored as base64 in PostgreSQL
  if (isImage && contentType !== 'image/gif') {
    finalBuffer = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 60 })
      .toBuffer();
    finalContentType = 'image/webp';
  }

  const base64 = finalBuffer.toString('base64');
  return `data:${finalContentType};base64,${base64}`;
}

/**
 * No-op: file data is stored inline in the database,
 * so deleting the DB record removes the file data.
 */
export async function deleteFile(_fileUrl: string): Promise<void> {
  // Nothing to do — data is stored inline in PostgreSQL
}
