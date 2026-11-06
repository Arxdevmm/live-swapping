import type { RealTimeClient } from "@decartai/sdk";
import { createRealtimeToken } from "@/lib/decart.functions";
import { buildReferenceImage } from "@/services/reference-image";

export type LiveSwapSession = {
  client: RealTimeClient;
  camera: MediaStream;
  stop: () => void;
};

type StartOptions = {
  face: File;
  backgroundUrl: string;
  prompt: string;
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onStatus: (status: string) => void;
};

export async function startLiveSwap(options: StartOptions): Promise<LiveSwapSession> {
  const { createDecartClient, models } = await import("@decartai/sdk");
  const model = models.realtime("lucy-2.6");

  const camera = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { frameRate: model.fps, facingMode: "user", height: { ideal: 1280 } },
  });
  options.onLocalStream(camera);

  const reference = await buildReferenceImage(options.face, options.backgroundUrl);
  const decart = createDecartClient({
    apiKeyProvider: async () => (await createRealtimeToken()).apiKey,
  });

  const client = await decart.realtime.connect(camera, {
    model,
    mirror: "auto",
    resolution: "1080p",
    onRemoteStream: options.onRemoteStream,
    onConnectionChange: (state) => options.onStatus(state),
    onCapacityWait: ({ retryAfterMs }) =>
      options.onStatus(`busy, retrying in ${Math.round(retryAfterMs / 1000)} s`),
    initialState: { prompt: { text: options.prompt, enhance: true }, image: reference },
  });

  return {
    client,
    camera,
    stop: () => {
      client.disconnect();
      camera.getTracks().forEach((t) => t.stop());
    },
  };
}

export async function updateLiveSwap(
  session: LiveSwapSession,
  face: File,
  backgroundUrl: string,
  prompt: string,
) {
  const image = await buildReferenceImage(face, backgroundUrl);
  await session.client.set({ prompt, image, enhance: true });
}
