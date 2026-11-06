export type BackgroundId = "living-room" | "office" | "backyard" | "beach";

export const backgroundDescriptions: Record<BackgroundId, { label: string; scene: string }> = {
  "living-room": {
    label: "Living room",
    scene: "a cozy modern living room with a sofa, plants and warm lamp light",
  },
  office: {
    label: "Office",
    scene: "a bright modern office with desks, glass walls and a city view window",
  },
  backyard: {
    label: "Backyard",
    scene: "a sunny backyard garden with a green lawn, wooden fence and trees",
  },
  beach: {
    label: "Beach",
    scene: "a tropical beach at golden hour with palm trees and a calm ocean",
  },
};

// Auto-configured prompt sent to Decart together with the uploaded face photo.
export function buildSwapPrompt(background: BackgroundId): string {
  const { scene } = backgroundDescriptions[background];
  return (
    "Replace the person's face with the face from the reference image, keeping their " +
    "expressions, head movement and lighting natural. Replace the entire background with " +
    `${scene}. Keep the person's body, clothing and pose unchanged.`
  );
}
