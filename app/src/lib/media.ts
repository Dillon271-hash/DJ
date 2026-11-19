import { supabase } from "./supabase";

// Public Storage bucket (see supabase/schema.sql) — photos/videos attached
// to a logged set. Public so a plain <img>/<video src> works with no
// signed-URL dance; write access is still locked down per-user by Storage
// RLS policies keyed off the first path segment being their own user id.
export const BUCKET = "set-media";

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|avi)$/i;

export function isVideoPath(path: string): boolean {
  return VIDEO_EXTENSIONS.test(path);
}

export function mediaUrl(path: string): string {
  if (!supabase) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteSetMedia(paths: string[]): Promise<void> {
  if (!supabase || paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error("[media] delete failed:", error);
}
