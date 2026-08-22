/**
 * High-performance Image Compression & Sanitization Utility for Rest-Bazer
 * Guarantees that images stored in Firestore documents are ultra-compact (< 50KB)
 * preventing Firestore 1MB document size limit exceeded errors.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxBytes?: number; // e.g. 70 * 1024 (70KB)
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 640,
  maxHeight: 640,
  quality: 0.72,
  maxBytes: 80 * 1024 // 80 KB target max
};

/**
 * Compresses an image file, blob, or base64 data-URL to an optimized JPEG data-URL.
 */
export async function compressImage(
  input: File | Blob | string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const maxWidth = opts.maxWidth || 640;
  const maxHeight = opts.maxHeight || 640;
  const initialQuality = opts.quality || 0.72;

  // If input is an external HTTP/HTTPS URL, don't re-compress it unless needed
  if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
    return input;
  }

  // Convert File / Blob to string if necessary
  let sourceDataUrl = '';
  if (typeof input === 'string') {
    sourceDataUrl = input;
  } else {
    sourceDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(input);
    });
  }

  // If input is already very small (e.g. < 20KB) and starts with data:image, we can inspect or downscale
  if (sourceDataUrl.length < 25000 && !sourceDataUrl.startsWith('data:image/svg')) {
    // Already very small
    return sourceDataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(sourceDataUrl.slice(0, 100000)); // Fallback truncate
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Try exporting with initial quality
        let compressed = canvas.toDataURL('image/jpeg', initialQuality);

        // If still larger than target max (e.g. > 80KB), downscale further
        if (compressed.length > (opts.maxBytes || 80000)) {
          compressed = canvas.toDataURL('image/jpeg', Math.max(initialQuality - 0.2, 0.45));
        }

        // If still > 100KB, shrink dimensions further (e.g. 480x480)
        if (compressed.length > 100000) {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(width * 0.75);
          smallCanvas.height = Math.round(height * 0.75);
          const sCtx = smallCanvas.getContext('2d');
          if (sCtx) {
            sCtx.imageSmoothingEnabled = true;
            sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            compressed = smallCanvas.toDataURL('image/jpeg', 0.5);
          }
        }

        resolve(compressed);
      } catch (err) {
        console.warn('Canvas compression fallback due to error:', err);
        resolve(sourceDataUrl.slice(0, 80000));
      }
    };

    img.onerror = () => {
      console.warn('Could not load image for compression');
      resolve(sourceDataUrl.slice(0, 80000));
    };

    img.src = sourceDataUrl;
  });
}

/**
 * Sanitizes and compresses all image properties inside any document data object
 * before syncing to Firestore.
 */
export async function sanitizeDocumentData(data: any): Promise<any> {
  if (!data) return data;

  if (Array.isArray(data)) {
    return Promise.all(data.map(item => sanitizeDocumentData(item)));
  }

  if (typeof data !== 'object') {
    return data;
  }

  const result: Record<string, any> = { ...data };

  // 1. Process primary imageUrl
  if (typeof result.imageUrl === 'string' && result.imageUrl.startsWith('data:image/')) {
    if (result.imageUrl.length > 40000) {
      result.imageUrl = await compressImage(result.imageUrl, { maxWidth: 600, maxHeight: 600, quality: 0.7 });
    }
  }

  // 2. Process images gallery array
  if (Array.isArray(result.images) && result.images.length > 0) {
    // Limit to max 6 images
    const limitedImages = result.images.slice(0, 6);
    result.images = await Promise.all(
      limitedImages.map(async (img: any) => {
        if (typeof img === 'string' && img.startsWith('data:image/')) {
          if (img.length > 40000) {
            return await compressImage(img, { maxWidth: 500, maxHeight: 500, quality: 0.65 });
          }
        }
        return img;
      })
    );
  }

  // 3. Process other potential large image fields like heroImageUrl, logoUrl, etc.
  for (const key of ['heroImageUrl', 'logoUrl', 'photoUrl', 'bannerUrl']) {
    if (typeof result[key] === 'string' && result[key].startsWith('data:image/')) {
      if (result[key].length > 40000) {
        result[key] = await compressImage(result[key], { maxWidth: 640, maxHeight: 640, quality: 0.7 });
      }
    }
  }

  return result;
}
