import { describe, expect, it } from "vitest";
import { buildSwapPrompt } from "./prompts";

describe("buildSwapPrompt", () => {
  it("asks for a face swap from the reference image", () => {
    expect(buildSwapPrompt("office")).toContain("face from the left side of the reference image");
  });
  it("uses the selected background scene", () => {
    expect(buildSwapPrompt("backyard")).toContain("home backyard with a green lawn");
    expect(buildSwapPrompt("backyard")).not.toContain("office");
  });
});
