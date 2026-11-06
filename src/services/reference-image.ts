// Builds one reference image for Decart: the face photo on the left, the full scene on the right (both portrait).
// Decart accepts a single reference image per session, so both are combined side by side.
const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });

const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, w: number, h: number) => {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, 0, w, h);
};

export async function buildReferenceImage(face: File, backgroundUrl: string): Promise<Blob> {
  const faceUrl = URL.createObjectURL(face);
  try {
    const [faceImg, bgImg] = await Promise.all([loadImage(faceUrl), loadImage(backgroundUrl)]);
    const height = 1920;
    const faceWidth = 1080;
    const bgWidth = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = faceWidth + bgWidth;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported");
    drawCover(ctx, faceImg, 0, faceWidth, height);
    drawCover(ctx, bgImg, faceWidth, bgWidth, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not build image"))), "image/jpeg", 0.95),
    );
  } finally {
    URL.revokeObjectURL(faceUrl);
  }
}
