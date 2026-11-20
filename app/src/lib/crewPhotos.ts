import { supabase } from "./supabase";
import { squareJpeg } from "./avatars";

// Crew photos — the picture shown as the label on a crew's record. Any
// member can set it. One file per crew: the old one is removed on change.

const BUCKET = "crew-photos";

export function crewPhotoUrl(path: string | null | undefined): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Upload a new crew photo; returns the new path, or throws a readable error. */
export async function setCrewPhoto(crewId: string, file: File, oldPath?: string | null): Promise<string> {
  if (!supabase) throw new Error("Not connected.");
  let blob: Blob;
  try {
    blob = await squareJpeg(file);
  } catch {
    throw new Error("Couldn't read that photo — try a JPG or PNG.");
  }
  const path = `${crewId}/${Date.now()}.jpg`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (up.error) {
    console.error("[crew photo] upload failed:", up.error);
    throw new Error("Upload failed — re-run schema.sql in Supabase if this keeps happening.");
  }
  const { error } = await supabase.from("crews").update({ photo_path: path }).eq("id", crewId);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error("Couldn't save the crew photo — re-run schema.sql in Supabase.");
  }
  if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
  return path;
}

export async function removeCrewPhoto(crewId: string, oldPath: string | null | undefined): Promise<void> {
  if (!supabase) return;
  await supabase.from("crews").update({ photo_path: null }).eq("id", crewId);
  if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
}
