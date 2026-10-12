import { Language } from '../types';
import { t } from '../i18n/translations';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB for high-res mobile photos

export interface ImageProcessResult {
  dataUrl?: string;
  error?: string;
}

/**
 * Validates, downscales, and optimizes a food/logo image file entirely client-side.
 * Downscales photos to max 400-480px bounding box and compresses via Canvas to WebP/JPEG,
 * keeping the payload lightweight (~15-25KB) with crisp Retina quality without any paid storage.
 */
export async function processFoodImageFile(
  file: File,
  lang: Language = 'en',
  storagePathPrefix = 'menu_images'
): Promise<ImageProcessResult> {
  // 1. Format validation
  const fileType = (file.type || '').toLowerCase();
  const fileName = (file.name || '').toLowerCase();
  const hasValidExt = /\.(jpg|jpeg|png|webp|heic|heif|jfif)$/i.test(fileName);
  const hasValidMime = fileType.startsWith('image/') || ALLOWED_IMAGE_TYPES.includes(fileType);

  if (!hasValidMime && !hasValidExt && fileType !== '') {
    return {
      error: t(lang, 'invalidImageFormat'),
    };
  }

  // 2. Size validation
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return {
      error: t(lang, 'imageTooLarge'),
    };
  }

  // 3. Convert to Image and optimize via Canvas using Object URL for peak mobile performance
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    };

    img.onload = () => {
      try {
        const isLogo = storagePathPrefix === 'logo';
        const maxDim = isLogo ? 400 : 480; // 400px max for logo, 480px for menu items
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          cleanup();
          resolve({ dataUrl: objectUrl });
          return;
        }

        // Draw with image smoothing enabled for crisp rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Test WebP support with quality 0.82; fallback to JPEG 0.82
        let optimizedDataUrl = canvas.toDataURL('image/webp', 0.82);
        if (!optimizedDataUrl.startsWith('data:image/webp')) {
          optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }

        cleanup();
        resolve({ dataUrl: optimizedDataUrl });
      } catch {
        cleanup();
        resolve({ dataUrl: objectUrl });
      }
    };

    img.onerror = () => {
      cleanup();
      // Fallback to FileReader if Object URL fails on older WebView
      const reader = new FileReader();
      reader.onload = (re) => {
        const raw = re.target?.result as string;
        if (raw) {
          resolve({ dataUrl: raw });
        } else {
          resolve({ error: t(lang, 'invalidImageFormat') });
        }
      };
      reader.onerror = () => {
        resolve({ error: t(lang, 'invalidImageFormat') });
      };
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

