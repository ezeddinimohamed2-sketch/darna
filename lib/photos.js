export async function shrink(file, max = 1600, quality = 0.82) {
  try {
    const bmp = await createImageBitmap(file);
    const ratio = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * ratio);
    const h = Math.round(bmp.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    return blob || file;
  } catch (e) {
    return file;
  }
}
