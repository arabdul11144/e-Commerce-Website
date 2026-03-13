import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function isDataImage(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('data:image/');
}

export function isStoredImagePath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/uploads/');
}

export function isRemoteImageUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('http://') || value.startsWith('https://'))
  );
}

export async function saveDataImage(
  dataImage: string,
  folderSegments: string[],
  filePrefix: string
) {
  const matches = dataImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!matches) {
    throw new Error('Invalid image format');
  }

  const mimeType = matches[1].toLowerCase();
  const extension = MIME_TO_EXTENSION[mimeType];

  if (!extension) {
    throw new Error('Unsupported image type');
  }

  const buffer = Buffer.from(matches[2], 'base64');

  if (!buffer.length) {
    throw new Error('Invalid image data');
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image size must be 5MB or less');
  }

  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const targetDirectory = path.join(uploadsRoot, ...folderSegments);

  await fs.mkdir(targetDirectory, { recursive: true });

  const fileName = `${filePrefix}-${randomUUID()}.${extension}`;
  const filePath = path.join(targetDirectory, fileName);

  await fs.writeFile(filePath, buffer);

  return {
    url: ['/uploads', ...folderSegments, fileName].join('/').replace(/\\/g, '/'),
    size: buffer.length,
    mimeType,
  };
}
