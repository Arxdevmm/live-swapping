import { create } from "zustand";
import type { SceneOption } from "@/lib/prompts";

type SwapState = {
  faceFile: File | null;
  facePreview: string | null;
  backgroundEnabled: boolean;
  selectedSceneId: string;
  uploadedScenes: SceneOption[];
  setFace: (file: File | null) => void;
  setBackgroundEnabled: (enabled: boolean) => void;
  selectScene: (id: string) => void;
  addUploadedScene: (file: File) => void;
};

export const useSwapStore = create<SwapState>((set, get) => ({
  faceFile: null,
  facePreview: null,
  backgroundEnabled: true,
  selectedSceneId: "living-room",
  uploadedScenes: [],
  setFace: (file) => {
    const previous = get().facePreview;
    if (previous) URL.revokeObjectURL(previous);
    set({ faceFile: file, facePreview: file ? URL.createObjectURL(file) : null });
  },
  setBackgroundEnabled: (enabled) => set({ backgroundEnabled: enabled }),
  selectScene: (id) => set({ selectedSceneId: id, backgroundEnabled: true }),
  addUploadedScene: (file) => {
    const id = `upload-${get().uploadedScenes.length + 1}-${file.name}`;
    const scene: SceneOption = { id, label: "Your photo", src: URL.createObjectURL(file) };
    set((s) => ({ uploadedScenes: [...s.uploadedScenes, scene], selectedSceneId: id, backgroundEnabled: true }));
  },
}));
