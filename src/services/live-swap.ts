import type { RealTimeClient } from "@decartai/sdk";
import { createRealtimeToken } from "@/lib/decart.functions";

export type LiveSwapSession = {
  client: RealTimeClient;
  camera: MediaStream;
  stop: () => void;
};

type StartOptions = {
  face: File;
  prompt: string;
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onStatus: (status: string) => void;
};

export async function startLiveSwap(options: StartOptions): Promise<LiveSwapSession> {
  const { createDecartClient, models } = await import("@decartai/sdk");
  const model = models.realtime("lucy-latest");

  const camera = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { frameRate: model.fps, width: model.width, height: model.height },
  });
  options.onLocalStream(camera);

  const decart = createDecartClient({
    apiKeyProvider: async () => (await createRealtimeToken()).apiKey,
  });

  const client = await decart.realtime.connect(camera, {
    model,
    mirror: "auto",
    onRemoteStream: options.onRemoteStream,
    onConnectionChange: (state) => options.onStatus(state),
    onCapacityWait: ({ retryAfterMs }) =>
      options.onStatus(`busy, retrying in ${Math.round(retryAfterMs / 1000)} s`),
    initialState: { prompt: { text: options.prompt, enhance: true }, image: options.face },
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

export async function updateLiveSwap(session: LiveSwapSession, face: File, prompt: string) {
  await session.client.set({ prompt, image: face, enhance: true });
}
