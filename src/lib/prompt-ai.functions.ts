import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  faceImage: z.string().startsWith("data:image/").max(2_000_000),
  sceneImage: z.string().startsWith("data:image/").max(2_000_000).nullable(),
  sceneLabel: z.string().max(80).nullable(),
});

const instructions = `You write prompts for Decart's realtime video model, which edits a live webcam video using one reference image (a face photo).
The background of the video has ALREADY been replaced on-device when a scene image is given, so the model must keep it.
Write one prompt (max 90 words, plain text, no quotes) that:
- tells the model to replace the person's face with the face from the reference image, naming its key visible traits (face shape, skin tone, eyes, eyebrows, nose, hair, facial hair, age range),
- keeps the person's live expressions, head movement, body, clothing and pose,
- if a scene image is given: tells the model to keep that background exactly, briefly describes it, and asks to match the person's lighting and colour to it with clean edges around hair and shoulders,
- if no scene image is given: tells the model to keep the original background unchanged,
- asks for a realistic, sharp, photographic result.
Always assume the face photo is valid; never hedge or add conditions. Output only the prompt.`;

// Uses the Lovable AI Gateway to tailor the Decart prompt to the chosen face and scene.
export const generateSwapPrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { generateResponse } = await import("@lovable.dev/ai-gateway");
    const content: Array<
      { type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" }
    > = [
      { type: "input_text", text: "Face reference photo:" },
      { type: "input_image", image_url: data.faceImage, detail: "low" },
    ];
    if (data.sceneImage) {
      content.push({ type: "input_text", text: `Scene image${data.sceneLabel ? ` (${data.sceneLabel})` : ""}:` });
      content.push({ type: "input_image", image_url: data.sceneImage, detail: "low" });
    } else {
      content.push({ type: "input_text", text: "No scene image: background swap is off." });
    }
    const response = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions,
      input: [{ role: "user", content }],
    });
    const text = extractText(response.output);
    if (!text) throw new Error("The AI returned an empty prompt");
    return { prompt: text };
  });

// Collects all text parts from a Responses output list without assuming its exact shape.
function extractText(output: unknown): string {
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output as unknown[]) {
    if (typeof item !== "object" || item === null || !("content" in item)) continue;
    const content = (item as { content: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content as unknown[]) {
      if (typeof part === "object" && part !== null && "type" in part && "text" in part) {
        const { type, text } = part as { type: unknown; text: unknown };
        if (type === "output_text" && typeof text === "string") parts.push(text);
      }
    }
  }
  return parts.join("").trim();
}
