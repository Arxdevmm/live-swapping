import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cameraStop: vi.fn(),
  compositorStop: vi.fn(),
  getUserMedia: vi.fn(),
  createCompositor: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  set: vi.fn(),
  setBackground: vi.fn(),
  createClient: vi.fn(),
  token: vi.fn(),
}));

vi.mock("@decartai/sdk", () => ({
  models: { realtime: () => ({ fps: 20, width: 1920, height: 1080 }) },
  createDecartClient: mocks.createClient,
}));
vi.mock("@/lib/decart.functions", () => ({ createRealtimeToken: mocks.token }));
vi.mock("@/services/background-compositor", () => ({
  createBackgroundCompositor: mocks.createCompositor,
}));

import { startLiveSwap, updateLiveSwap } from "./live-swap";

describe("live swap SDK integration", () => {
  const face = new File(["face"], "face.jpg", { type: "image/jpeg" });
  const options = {
    face,
    backgroundUrl: "blob:scene",
    prompt: "Swap the face and preserve the scene",
    onRemoteStream: vi.fn(),
    onStatus: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: mocks.getUserMedia },
    });
    mocks.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: mocks.cameraStop }],
    });
    mocks.createCompositor.mockResolvedValue({
      stream: { id: "composited" },
      stop: mocks.compositorStop,
      setBackground: mocks.setBackground,
    });
    mocks.connect.mockResolvedValue({ disconnect: mocks.disconnect, set: mocks.set });
    mocks.createClient.mockReturnValue({ realtime: { connect: mocks.connect } });
    mocks.token.mockResolvedValue({ apiKey: "short-lived-test-token" });
  });

  it("uses model camera specifications and sends face and prompt together", async () => {
    const session = await startLiveSwap(options);
    expect(mocks.getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        frameRate: 20,
        facingMode: "user",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    expect(mocks.connect).toHaveBeenCalledWith(
      { id: "composited" },
      expect.objectContaining({
        resolution: "1080p",
        mirror: "auto",
        initialState: { prompt: { text: options.prompt, enhance: true }, image: face },
      }),
    );
    await updateLiveSwap(session, face, null, "Updated face swap");
    expect(mocks.setBackground).toHaveBeenCalledWith(null);
    expect(mocks.set).toHaveBeenCalledWith({
      prompt: "Updated face swap",
      image: face,
      enhance: true,
    });
    session.stop();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.cameraStop).toHaveBeenCalledOnce();
    expect(mocks.compositorStop).toHaveBeenCalledOnce();
  });

  it("requests a fresh short-lived token each time the SDK calls its provider", async () => {
    await startLiveSwap(options);
    const config: unknown = mocks.createClient.mock.calls[0]?.[0];
    if (typeof config !== "object" || config === null || !("apiKeyProvider" in config)) {
      throw new Error("Missing token provider");
    }
    const provider = config.apiKeyProvider;
    if (typeof provider !== "function") throw new Error("Invalid token provider");
    expect(await provider()).toBe("short-lived-test-token");
    expect(await provider()).toBe("short-lived-test-token");
    expect(mocks.token).toHaveBeenCalledTimes(2);
  });

  it("releases camera and compositor when Decart connection fails", async () => {
    mocks.connect.mockRejectedValue(new Error("Connection failed"));
    await expect(startLiveSwap(options)).rejects.toThrow("Connection failed");
    expect(mocks.cameraStop).toHaveBeenCalledOnce();
    expect(mocks.compositorStop).toHaveBeenCalledOnce();
  });

  it("releases the camera when background preparation fails", async () => {
    mocks.createCompositor.mockRejectedValue(new Error("Background failed"));
    await expect(startLiveSwap(options)).rejects.toThrow("Background failed");
    expect(mocks.cameraStop).toHaveBeenCalledOnce();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
});
