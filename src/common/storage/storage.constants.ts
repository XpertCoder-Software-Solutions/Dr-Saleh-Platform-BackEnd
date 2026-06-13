export const STORAGE_FOLDERS = [
  'articles/images',
  'products/images',
  'books/images',
  'users/profile-images',
  'courses/thumbnails',
  'courses/videos',
  'courses/pdfs',
  'books/digital',
  'books/audio',
  'certificates',
] as const;

export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

export const STORAGE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const STORAGE_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const STORAGE_DOCUMENT_MIME_TYPES = ['application/pdf'] as const;

export const STORAGE_FILE_MIME_TYPES = [
  ...STORAGE_IMAGE_MIME_TYPES,
  ...STORAGE_VIDEO_MIME_TYPES,
  ...STORAGE_DOCUMENT_MIME_TYPES,
] as const;

export const STORAGE_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const STORAGE_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const STORAGE_MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

export const STORAGE_MIME_EXTENSION_MAP: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};
