import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Bucket, DraftLog, Profile, SetLog } from "./types";

interface EncoreStore {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  logs: SetLog[];
  addLog: (
    draft: DraftLog,
    bucket: Bucket,
    score: number,
    venueBucket?: Bucket,
    venueScore?: number,
  ) => SetLog;
  removeLog: (id: string) => void;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const useEncoreStore = create<EncoreStore>()(
  persist(
    (set, get) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      logs: [],
      addLog: (draft, bucket, score, venueBucket, venueScore) => {
        const entry: SetLog = {
          id: makeId(),
          ...draft,
          bucket,
          score,
          venueBucket,
          venueScore,
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
