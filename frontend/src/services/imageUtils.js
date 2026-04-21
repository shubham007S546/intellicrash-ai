/**
 * imageUtils.js — Client-side image compression
 * Compresses photos before upload to prevent slowdown on mobile
 */

/**
 * Compress an image file to target size
 * @param {File} file - Input image file
 * @param {number} maxWidth - Max width in px (default 800)
 * @param {number} quality - JPEG quality 0-1 (default 0.7)
 * @returns {Promise<string>} - Base64 data URL
 */
export async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Resize if too large
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL("image/jpeg", quality);
        const originalKB  = Math.round(file.size / 1024);
        const compressedKB = Math.round((compressed.length * 3) / 4 / 1024);
        console.log(`Image: ${originalKB}KB → ${compressedKB}KB (${Math.round((1 - compressedKB/originalKB)*100)}% saved)`);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple images
 * @param {FileList|File[]} files
 * @param {number} max - Max number of images
 */
export async function compressImages(files, max = 4, maxWidth = 800, quality = 0.7) {
  const arr = Array.from(files).slice(0, max);
  return Promise.all(arr.map(f => compressImage(f, maxWidth, quality)));
}
