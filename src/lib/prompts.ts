export type BackgroundId = "living-room" | "office" | "backyard" | "beach";

export const backgroundDescriptions: Record<BackgroundId, { label: string; scene: string }> = {
  "living-room": {
    label: "Living room",
    scene: "a real lived-in living room with a grey sofa, bookshelf, rug and daylight from a window",
  },
  office: {
    label: "Office",
    scene: "a real open-plan office with desks, monitors, office chairs and ceiling lights",
  },
  backyard: {
    label: "Backyard",
    scene: "a real home backyard with a green lawn, wooden fence, trees and patio chairs",
  },
  beach: {
    label: "Beach",
    scene: "a real sandy beach in daytime with gentle waves, palm trees and a clear sky",
  },
};

// Auto-configured prompt sent to Decart together with the uploaded face photo.
export function buildSwapPrompt(background: BackgroundId): string {
  const { scene } = backgroundDescriptions[background];
  return (
    "Replace the person's face with the face from the reference image, keeping their " +
    "expressions, head movement and lighting natural. Replace the entire background with " +
    `${scene}. The result must look like a realistic photo. Keep the person's body, clothing and pose unchanged.`
  );
}
