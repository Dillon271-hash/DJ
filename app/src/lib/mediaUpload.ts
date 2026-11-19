import { supabase } from "./supabase";
import { BUCKET } from "./media";

// Kept separate from media.ts so this (and the canvas re-encoding code)
// only loads with the rating flow — media.ts itself is imported by the
// store and so ships with the very first page load.

// Phone photos are routinely 4–8 MB at 12+ megapixels — far more than a
// gallery thumbnail needs, and the free Supabase tier only has 1 GB of
// storage. Photos get resized to fit within this many pixels on their
// long edge and re-encoded as JPEG before upload.
const MAX_PHOTO_EDGE = 2048;
const JPEG_QUALITY = 0.85;

// Only re-encode formats that are always opaque photos — PNG/WebP can
// carry transparency (which JPEG would flatten to black) and GIFs can be
// animated, so those go up untouched.
const COMPRESSIBLE = new Set(["image/jpeg", "image/heic", "image/heif"]);

async function compressPhoto(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type)) return file;
  try {
    // Not every browser can decode every format (HEIC only works in
    // Safari) — if this throws, the original just uploads as-is.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Uploads whatever files succeed and just skips/logs the rest — one slow
// or oversized file (a phone video over the project's upload limit, a
// flaky connection) shouldn't stop the set itself from saving.
export async function uploadSetMedia(files: File[], userId: string): Promise<string[]> {
  if (!supabase || files.length === 0) return [];

  const uploads = await Promise.all(
    files.map(async (original) => {
      const file = await compressPhoto(original);
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
      // Every path is unique and never overwritten, so browsers and the
      // CDN can cache each file for a year instead of the 1-hour default.
      const { error } = await supabase!.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (error) {
        console.error(`[media] upload failed for ${file.name}:`, error);
        return null;
      }
      return path;
    }),
  );

  return uploads.filter((path): path is string => path !== null);
}
