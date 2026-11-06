import type { ImageSegmenter } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

export type BackgroundCompositor = {
  stream: MediaStream;
  setBackground: (url: string | null) => Promise<void>;
  stop: () => void;
};

async function createSegmenter(): Promise<ImageSegmenter> {
  const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const make = (delegate: "GPU" | "CPU") =>
    ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO",
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  try {
    return await make("GPU");
  } catch {
    return make("CPU");
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the background image"));
    img.src = src;
  });

// Cuts the person out of the camera feed and places them on the chosen background.
// The composited stream is what gets sent to Decart, so the background swap is exact.
export async function createBackgroundCompositor(
  camera: MediaStream,
  backgroundUrl: string | null,
): Promise<BackgroundCompositor> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = camera;
  await video.play();

  const segmenter = await createSegmenter();
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;

  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const ctx = output.getContext("2d");
  const person = document.createElement("canvas");
  person.width = width;
  person.height = height;
  const personCtx = person.getContext("2d");
  const mask = document.createElement("canvas");
  const maskCtx = mask.getContext("2d");
  if (!ctx || !personCtx || !maskCtx) throw new Error("Canvas is not supported");

  let background: HTMLImageElement | null = backgroundUrl ? await loadImage(backgroundUrl) : null;
  let running = true;
  let frame = 0;

  const drawCover = (img: HTMLImageElement) => {
    const scale = Math.max(width / img.width, height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  };

  const render = () => {
    if (!running) return;
    if (!background) {
      ctx.drawImage(video, 0, 0, width, height);
    } else {
      const result = segmenter.segmentForVideo(video, performance.now());
      const confidence = result.confidenceMasks?.[0];
      if (confidence) {
        const values = confidence.getAsFloat32Array();
        if (mask.width !== confidence.width) mask.width = confidence.width;
        if (mask.height !== confidence.height) mask.height = confidence.height;
        const data = maskCtx.createImageData(confidence.width, confidence.height);
        for (let i = 0; i < values.length; i++) data.data[i * 4 + 3] = Math.round((values[i] ?? 0) * 255);
        maskCtx.putImageData(data, 0, 0);
        personCtx.globalCompositeOperation = "copy";
        personCtx.drawImage(video, 0, 0, width, height);
        personCtx.globalCompositeOperation = "destination-in";
        personCtx.drawImage(mask, 0, 0, width, height);
        drawCover(background);
        ctx.drawImage(person, 0, 0);
      }
      result.close();
    }
    frame = requestAnimationFrame(render);
  };
  render();

  const stream = output.captureStream(30);

  return {
    stream,
    setBackground: async (url) => {
      background = url ? await loadImage(url) : null;
    },
    stop: () => {
      running = false;
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((t) => t.stop());
      segmenter.close();
      video.srcObject = null;
    },
  };
}
