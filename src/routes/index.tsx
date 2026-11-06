import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useSwapStore } from "@/stores/swap-store";
import { backgroundDescriptions, buildSwapPrompt, type BackgroundId } from "@/lib/prompts";
import { startLiveSwap, updateLiveSwap, type LiveSwapSession } from "@/services/live-swap";
import livingRoom from "@/assets/bg-living-room.jpg";
import office from "@/assets/bg-office.jpg";
import backyard from "@/assets/bg-backyard.jpg";
import beach from "@/assets/bg-beach.jpg";

const backgroundImages: Record<BackgroundId, string> = {
  "living-room": livingRoom,
  office,
  backyard,
  beach,
};
const backgroundIds = Object.keys(backgroundImages) as BackgroundId[];

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
  const { faceFile, facePreview, background, setFace, setBackground } = useSwapStore();
  const [session, setSession] = useState<LiveSwapSession | null>(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => () => session?.stop(), [session]);

  // Push new face/background to a running session automatically.
  useEffect(() => {
    if (!session || !faceFile) return;
    updateLiveSwap(session, faceFile, buildSwapPrompt(background)).catch((e: unknown) =>
      setError(e instanceof Error ? e.message : "Could not update the swap"),
    );
  }, [session, faceFile, background]);

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFace(file);
  };

  const start = async () => {
    if (!faceFile) return;
    setError(null);
    setStarting(true);
    try {
      const s = await startLiveSwap({
        face: faceFile,
        prompt: buildSwapPrompt(background),
        onLocalStream: () => undefined,
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
          <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">SwapCam</p>
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
              <h2 className="step-label">2. Background</h2>
              <div className="grid grid-cols-2 gap-3">
                {backgroundIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBackground(id)}
                    data-active={background === id}
                    className="scene-tile"
                  >
                    <img
                      src={backgroundImages[id]}
                      alt={backgroundDescriptions[id].label}
                      loading="lazy"
                      width={1280}
                      height={720}
                      className="aspect-[3/2] w-full object-cover"
                    />
                    <span className="block px-3 py-2 text-left text-sm font-medium">
                      {backgroundDescriptions[id].label}
                    </span>
                  </button>
                ))}
              </div>
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
                  {starting ? "Connecting…" : "Start live swap"}
                </button>
              )}
              {!faceFile && (
                <p className="mt-2 text-sm text-muted-foreground">Upload a face photo to begin.</p>
              )}
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            </section>
          </aside>

          <section className="space-y-4">
            <div className="panel relative aspect-video overflow-hidden">
              <video ref={remoteRef} autoPlay playsInline muted className="size-full object-cover" />
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
