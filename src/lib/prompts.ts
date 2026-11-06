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
    "The reference image has two parts: a face photo on the left and a full background scene on the right. " +
    "Replace the person's face with the face from the left side of the reference image, matching identity, " +
    "skin tone and features precisely while keeping their expressions and head movement. Replace the entire " +
    `background, edge to edge, with the full scene from the right side of the reference image: ${scene}. ` +
    "Keep sharp detail, natural lighting matched to the scene and clean edges around hair and shoulders. The result must look like a realistic photo. Keep the person's body, clothing and pose unchanged.`
  );
}
