import { describe, expect, it } from "vitest";
import { buildSwapPrompt } from "./prompts";

describe("buildSwapPrompt", () => {
  it("asks for a face swap from the reference image", () => {
    expect(buildSwapPrompt({ backgroundEnabled: false })).toContain("face from the reference image");
  });
  it("keeps the original background when backgrounds are off", () => {
    expect(buildSwapPrompt({ backgroundEnabled: false })).toContain("original background unchanged");
  });
  it("describes the selected scene when backgrounds are on", () => {
    const prompt = buildSwapPrompt({ backgroundEnabled: true, scene: "a sandy beach" });
    expect(prompt).toContain("a sandy beach");
    expect(prompt).not.toContain("original background");
  });
});
