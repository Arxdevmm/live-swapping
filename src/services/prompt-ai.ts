import { generateSwapPrompt } from "@/lib/prompt-ai.functions";
import { buildSwapPrompt, type SceneOption } from "@/lib/prompts";
import { toSmallDataUrl } from "@/services/image-utils";

// Asks the AI to tailor the prompt; falls back to the built-in prompt if the AI is unavailable.
export async function getSwapPrompt(face: File, scene: SceneOption | null): Promise<string> {
  try {
    const [faceImage, sceneImage] = await Promise.all([
      toSmallDataUrl(face),
      scene ? toSmallDataUrl(scene.src) : Promise.resolve(null),
    ]);
    const { prompt } = await generateSwapPrompt({
      data: { faceImage, sceneImage, sceneLabel: scene?.label ?? null },
    });
    return prompt;
  } catch {
    return buildSwapPrompt({ backgroundEnabled: !!scene, scene: scene?.scene });
  }
}
