import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useSwapStore } from "@/stores/swap-store";
import { presetSceneDescriptions, type SceneOption } from "@/lib/prompts";
import { getSwapPrompt } from "@/services/prompt-ai";
import { startLiveSwap, updateLiveSwap, type LiveSwapSession } from "@/services/live-swap";
import livingRoom from "@/assets/bg-living-room.jpg";
import office from "@/assets/bg-office.jpg";
import backyard from "@/assets/bg-backyard.jpg";
import beach from "@/assets/bg-beach.jpg";
import swapcamLogo from "@/assets/swapcam-logo.png";

const presetImages: Record<string, string> = {
  "living-room": livingRoom,
  office,
  backyard,
  beach,
};
const presetScenes: SceneOption[] = Object.entries(presetImages).map(([id, src]) => ({
  id,
  src,
  label: presetSceneDescriptions[id]?.label ?? id,
  scene: presetSceneDescriptions[id]?.scene ?? "",
}));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwapCam — live face and background swap" },
      {
        name: "description",
        content: "Upload a face photo, pick a scene and swap your face and background live on webcam.",
      },
      { property: "og:title", content: "SwapCam — live face and background swap" },
      {
        property: "og:description",
        content: "Upload a face photo, pick a scene and swap your face and background live on webcam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const {
    faceFile,
    facePreview,
    backgroundEnabled,
    selectedSceneId,
    uploadedScenes,
    setFace,
    setBackgroundEnabled,
    selectScene,
    addUploadedScene,
  } = useSwapStore();
  const [session, setSession] = useState<LiveSwapSession | null>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const remoteRef = useRef<HTMLVideoElement>(null);

  const scenes = [...presetScenes, ...uploadedScenes];
  const activeScene = backgroundEnabled
    ? (scenes.find((s) => s.id === selectedSceneId) ?? null)
    : null;

  useEffect(() => () => session?.stop(), [session]);

  // Push new face/background to a running session automatically, with an AI-tailored prompt.
  useEffect(() => {
    if (!session || !faceFile) return;
    setStatus("updating");
    getSwapPrompt(faceFile, activeScene)
      .then((prompt) => updateLiveSwap(session, faceFile, activeScene?.src ?? null, prompt))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not update the swap"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, faceFile, activeScene?.id]);

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFace(file);
  };

  const onSceneUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addUploadedScene(file);
    e.target.value = "";
  };

  const start = async () => {
    if (!faceFile) return;
    setError(null);
    setStarting(true);
    try {
      setStatus("writing prompt");
      const prompt = await getSwapPrompt(faceFile, activeScene);
      const s = await startLiveSwap({
        face: faceFile,
        backgroundUrl: activeScene?.src ?? null,
        prompt,
        onRemoteStream: (stream) => {
          if (remoteRef.current) remoteRef.current.srcObject = stream;
        },
        onStatus: setStatus,
      });
      setSession(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not start the live swap");
      setStatus("idle");
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    session?.stop();
    setSession(null);
    setStatus("idle");
    if (remoteRef.current) remoteRef.current.srcObject = null;
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <header className="mb-10" hidden={!!session}>
          <img src={swapcamLogo} alt="SwapCam" width={998} height={273} className="h-10 w-auto md:h-12" />
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-6xl">
            Be someone else, <span className="text-gradient">somewhere else.</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Upload a face photo, pick a scene and start your camera. Your face and background are
            swapped live.
          </p>
        </header>

        <div className={session ? "relative" : "grid gap-8 lg:grid-cols-[360px_1fr]"}>
          <aside className="space-y-8" hidden={!!session}>
            <section>
              <h2 className="step-label">1. Face photo</h2>
              <label className="panel flex cursor-pointer items-center gap-4 p-4 transition hover:border-primary">
                <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {facePreview ? (
                    <img src={facePreview} alt="Uploaded face" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-2xl text-muted-foreground">
                      +
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{faceFile ? "Change photo" : "Upload a face photo"}</p>
                  <p className="text-sm text-muted-foreground">Clear, front-facing works best</p>
                </div>
                <input type="file" accept="image/*" className="sr-only" onChange={onUpload} />
              </label>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="step-label mb-0">2. Background</h2>
                <button
                  type="button"
                  role="switch"
                  aria-checked={backgroundEnabled}
                  aria-label="Swap background"
                  onClick={() => setBackgroundEnabled(!backgroundEnabled)}
                  className="toggle"
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3" data-disabled={!backgroundEnabled}>
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => selectScene(scene.id)}
                    data-active={backgroundEnabled && selectedSceneId === scene.id}
                    className="scene-tile"
                  >
                    <img
                      src={scene.src}
                      alt={scene.label}
                      loading="lazy"
                      width={1280}
                      height={720}
                      className="aspect-[3/2] w-full object-cover"
                    />
                    <span className="block px-3 py-2 text-left text-sm font-medium">{scene.label}</span>
                  </button>
                ))}
                <label className="scene-tile flex cursor-pointer flex-col items-center justify-center gap-1 py-6 text-center hover:border-primary">
                  <span className="text-2xl text-muted-foreground">+</span>
                  <span className="text-sm font-medium">Upload a background</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={onSceneUpload} />
                </label>
              </div>
              {!backgroundEnabled && (
                <p className="mt-2 text-sm text-muted-foreground">Background swap is off. Your real background is kept.</p>
              )}
            </section>

            <section>
              <h2 className="step-label">3. Go live</h2>
              {session ? (
                <button type="button" onClick={stop} className="btn-secondary w-full">
                  Stop live swap
                </button>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  disabled={!faceFile || starting}
                  className="btn-primary w-full"
                >
                  {starting ? "Getting ready…" : "Start live swap"}
                </button>
              )}
              {!faceFile && (
                <p className="mt-2 text-sm text-muted-foreground">Upload a face photo to begin.</p>
              )}
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </section>
          </aside>

          <section className="space-y-4">
            <div className={`panel relative mx-auto w-full overflow-hidden ${isLandscape ? "aspect-video max-w-4xl" : "aspect-[9/16] max-w-md"}`}>
              <video
                ref={remoteRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) =>
                  setIsLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight)
                }
                onResize={(e) => setIsLandscape(e.currentTarget.videoWidth > e.currentTarget.videoHeight)}
                className="size-full bg-background object-contain"
              />
              {session && (
                <button type="button" onClick={stop} className="btn-secondary absolute bottom-3 right-3">
                  Stop live swap
                </button>
              )}
              {!session && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  Your swapped video will appear here
                </div>
              )}
              <span className="status-pill absolute left-3 top-3" data-live={status === "generating"}>
                {status}
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
