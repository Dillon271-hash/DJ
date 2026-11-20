import { create } from "zustand";

// Appearance: follow the phone (auto), or force dark / light. Stored on
// this device; index.html applies it before the first paint so there's
// no flash of the wrong theme.
export type Appearance = "auto" | "dark" | "light";

const KEY = "disko-appearance";

function read(): Appearance {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : "auto";
  } catch {
    return "auto";
  }
}

function apply(a: Appearance) {
  const root = document.documentElement;
  if (a === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", a);
  const dark = a === "dark" || (a === "auto" && !window.matchMedia("(prefers-color-scheme: light)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#08070a" : "#f0deb8");
}

export const useAppearance = create<{ appearance: Appearance; set: (a: Appearance) => void }>()((set) => ({
  appearance: read(),
  set: (appearance) => {
    try {
      if (appearance === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, appearance);
    } catch {
      // Private mode — still applies for this visit.
    }
    apply(appearance);
    set({ appearance });
  },
}));

apply(read());
window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => apply(useAppearance.getState().appearance));
