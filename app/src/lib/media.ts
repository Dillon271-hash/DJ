import { supabase } from "./supabase";

// Public Storage bucket (see supabase/schema.sql) — photos/videos attached
// to a logged set. Public so a plain <img>/<video src> works with no
// signed-URL dance; write access is still locked down per-user by Storage
// RLS policies keyed off the first path segment being their own user id.
const BUCKET = "set-media";

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|avi)$/i;

export function isVideoPath(path: string): boolean {
  return VIDEO_EXTENSIONS.test(path);
}

export function mediaUrl(path: string): string {
  if (!supabase) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Uploads whatever files succeed and just skips/logs the rest — one slow
// or oversized file (a phone video over the project's upload limit, a
// flaky connection) shouldn't stop the set itself from saving.
export async function uploadSetMedia(files: File[], userId: string): Promise<string[]> {
  if (!supabase || files.length === 0) return [];

  const uploads = await Promise.all(
    files.map(async (file) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase!.storage.from(BUCKET).upload(path, file);
      if (error) {
        console.error(`[media] upload failed for ${file.name}:`, error);
        return null;
      }
      return path;
    }),
  );

  return uploads.filter((path): path is string => path !== null);
}

export async function deleteSetMedia(paths: string[]): Promise<void> {
  if (!supabase || paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error("[media] delete failed:", error);
}
