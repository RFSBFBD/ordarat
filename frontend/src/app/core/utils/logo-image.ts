/** Crops the picked image to a centered 256x256 square and returns a small data URL, or null if unusable. */
export function squareLogoFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx || !img.width || !img.height) {
        resolve(null);
        return;
      }
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      let data = canvas.toDataURL('image/webp', 0.85);
      if (!data.startsWith('data:image/webp') || data.length > 140_000) {
        data = canvas.toDataURL('image/jpeg', 0.8);
      }
      resolve(data.length > 140_000 ? null : data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
