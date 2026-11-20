import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "./supabase";
import { useEncoreStore } from "./store";

// Profile pictures. Every <UserAvatar> asks for its person's photo; the
// requests made in the same moment are batched into one query, and the
// answers are remembered for the rest of the session.

const AVATAR_BUCKET = "avatars";
const SIZE = 512;

interface AvatarState {
  /** user id → storage path, null = no photo. Missing = not looked up yet. */
  paths: Record<string, string | null>;
  /** The avatar_path column doesn't exist yet (schema.sql not re-run). */
  unsupported: boolean;
}

export const useAvatars = create<AvatarState>()(() => ({ paths: {}, unsupported: false }));

const pending = new Set<string>();
let scheduled = false;

function request(id: string) {
  const s = useAvatars.getState();
  if (!id || s.unsupported || id in s.paths || pending.has(id)) return;
  pending.add(id);
  if (scheduled) return;
  scheduled = true;
  setTimeout(flush, 0);
}

async function flush() {
  scheduled = false;
  const ids = [...pending];
  pending.clear();
  if (!supabase || ids.length === 0) return;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await supabase.from("profiles").select("id, avatar_path").in("id", chunk);
    const next = { ...useAvatars.getState().paths };
    if (error) {
      for (const id of chunk) next[id] = null;
      useAvatars.setState({ paths: next, unsupported: error.code === "42703" });
      continue;
    }
    for (const id of chunk) next[id] = null;
    for (const row of data as { id: string; avatar_path: string | null }[]) next[row.id] = row.avatar_path;
    useAvatars.setState({ paths: next });
  }
}

export function avatarUrl(path: string): string {
  if (!supabase) return "";
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** The photo URL for this person, or null while unknown / if they have none. */
export function useAvatarUrl(id: string): string | null {
  const path = useAvatars((s) => s.paths[id]);
  useEffect(() => {
    if (path === undefined) request(id);
  }, [id, path]);
  return path ? avatarUrl(path) : null;
}

// Centre-crop to a square and shrink to 512px JPEG — a phone photo goes
// from several MB to ~60 KB.
export async function squareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(SIZE, side);
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("encode failed");
  return blob;
}

/** Upload a new profile picture; returns an error message or null. */
export async function setAvatar(file: File): Promise<string | null> {
  const me = useEncoreStore.getState().session?.user.id;
  if (!supabase || !me) return "You're signed out.";
  let blob: Blob;
  try {
    blob = await squareJpeg(file);
  } catch {
    return "Couldn't read that photo — try a JPG or PNG.";
  }
  const path = `${me}/${Date.now()}.jpg`;
  const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (up.error) {
    console.error("[avatar] upload failed:", up.error);
    return "Upload failed — re-run schema.sql in Supabase if this keeps happening.";
  }
  const old = useAvatars.getState().paths[me];
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", me);
  if (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return "Couldn't save your photo — re-run schema.sql in Supabase.";
  }
  useAvatars.setState((s) => ({ paths: { ...s.paths, [me]: path } }));
  if (old) await supabase.storage.from(AVATAR_BUCKET).remove([old]);
  return null;
}

export async function removeAvatar(): Promise<void> {
  const me = useEncoreStore.getState().session?.user.id;
  if (!supabase || !me) return;
  const old = useAvatars.getState().paths[me];
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", me);
  useAvatars.setState((s) => ({ paths: { ...s.paths, [me]: null } }));
  if (old) await supabase.storage.from(AVATAR_BUCKET).remove([old]);
}
