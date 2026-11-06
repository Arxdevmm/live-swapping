import { create } from "zustand";
import type { BackgroundId } from "@/lib/prompts";

type SwapState = {
  faceFile: File | null;
  facePreview: string | null;
  background: BackgroundId;
  setFace: (file: File | null) => void;
  setBackground: (id: BackgroundId) => void;
};

export const useSwapStore = create<SwapState>((set, get) => ({
  faceFile: null,
  facePreview: null,
  background: "living-room",
  setFace: (file) => {
    const previous = get().facePreview;
    if (previous) URL.revokeObjectURL(previous);
    set({ faceFile: file, facePreview: file ? URL.createObjectURL(file) : null });
  },
  setBackground: (id) => set({ background: id }),
}));
