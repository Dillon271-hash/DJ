import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Bucket, DraftLog, SetLog } from "./types";

interface EncoreStore {
  logs: SetLog[];
  addLog: (draft: DraftLog, bucket: Bucket, score: number) => SetLog;
  removeLog: (id: string) => void;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const useEncoreStore = create<EncoreStore>()(
  persist(
    (set, get) => ({
      logs: [],
      addLog: (draft, bucket, score) => {
        const entry: SetLog = {
          id: makeId(),
          ...draft,
          bucket,
          score,
          createdAt: Date.now(),
        };
        set({ logs: [...get().logs, entry] });
        return entry;
      },
      removeLog: (id) => set({ logs: get().logs.filter((l) => l.id !== id) }),
    }),
    { name: "encore-logs" },
  ),
);
