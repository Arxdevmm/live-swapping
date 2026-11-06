import type { RealTimeClient } from "@decartai/sdk";
import { createRealtimeToken } from "@/lib/decart.functions";
import { createBackgroundCompositor, type BackgroundCompositor } from "@/services/background-compositor";

export type LiveSwapSession = {
  client: RealTimeClient;
  compositor: BackgroundCompositor;
  stop: () => void;
};

type StartOptions = {
  face: File;
  backgroundUrl: string | null;
  prompt: string;
  onRemoteStream: (stream: MediaStream) => void;
  onStatus: (status: string) => void;
};

export async function startLiveSwap(options: StartOptions): Promise<LiveSwapSession> {
  const { createDecartClient, models } = await import("@decartai/sdk");
  const model = models.realtime("lucy-2.6");

  options.onStatus("starting camera");
  const camera = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { frameRate: model.fps, facingMode: "user", height: { ideal: 1280 } },
  });

  options.onStatus("preparing background");
  const compositor = await createBackgroundCompositor(camera, options.backgroundUrl);

  const decart = createDecartClient({
    apiKeyProvider: async () => (await createRealtimeToken()).apiKey,
  });

  const client = await decart.realtime.connect(compositor.stream, {
    model,
    mirror: "auto",
    resolution: "1080p",
    onRemoteStream: options.onRemoteStream,
    onConnectionChange: (state) => options.onStatus(state),
    onCapacityWait: ({ retryAfterMs }) =>
      options.onStatus(`busy, retrying in ${Math.round(retryAfterMs / 1000)} s`),
    initialState: { prompt: { text: options.prompt, enhance: true }, image: options.face },
  });

  return {
    client,
    compositor,
    stop: () => {
      client.disconnect();
      compositor.stop();
      camera.getTracks().forEach((t) => t.stop());
    },
  };
}

export async function updateLiveSwap(
  session: LiveSwapSession,
  face: File,
  backgroundUrl: string | null,
  prompt: string,
) {
  await session.compositor.setBackground(backgroundUrl);
  await session.client.set({ prompt, image: face, enhance: true });
}
