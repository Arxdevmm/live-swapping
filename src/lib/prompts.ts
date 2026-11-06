export type SceneOption = {
  id: string;
  label: string;
  src: string;
  // Written description for preset scenes; uploaded scenes have none.
  scene?: string | undefined;
};

export const presetSceneDescriptions: Record<string, { label: string; scene: string }> = {
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

export type PromptInput = {
  backgroundEnabled: boolean;
  scene?: string | undefined;
};

// Fallback prompt used when the AI prompt writer is unavailable.
// The background itself is replaced on-device before the video reaches Decart,
// so the prompt only asks Decart to swap the face and keep the scene intact.
export function buildSwapPrompt({ backgroundEnabled, scene }: PromptInput): string {
  const face =
    "Replace the person's face with the face from the reference image, matching identity, skin tone " +
    "and features precisely while keeping their expressions and head movement natural.";
  const background = backgroundEnabled
    ? ` Keep the background exactly as it is${scene ? `: ${scene}` : ""}, and match the lighting on the person to it.`
    : " Keep the original background unchanged.";
  return `${face}${background} The result must look like a realistic, sharp photo. Keep the body, clothing and pose unchanged.`;
}
