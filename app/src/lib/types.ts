export type Bucket = "loved" | "good" | "not";

export interface SetLog {
  id: string;
  artist: string;
  event: string;
  date: string;
  labels?: string[];
  withWho?: string;
  // Encore accounts tagged in "who were you with" (their names are also
  // in withWho, alongside any plain names typed in).
  withUserIds?: string[];
  note?: string;
  bucket: Bucket;
  score: number;
  // Optional because logs created before venue rating shipped won't have
  // these — every new log gets both from here on.
  venueBucket?: Bucket;
  venueScore?: number;
  // Storage paths (not full URLs) in the "set-media" bucket — pass
  // through mediaUrl() to get something usable in an <img>/<video> src.
  // Optional for the same reason as venueBucket/venueScore: logs from
  // before this shipped won't have any.
  mediaPaths?: string[];
  createdAt: number;
}

export interface DraftLog {
  artist: string;
  event: string;
  date: string;
  withWho?: string;
  withUserIds?: string[];
  note?: string;
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  loved: "Loved it",
  good: "It was good",
  not: "Not for me",
};

export const BUCKET_RANGE: Record<Bucket, [number, number]> = {
  loved: [7, 10],
  good: [4, 6.9],
  not: [0, 3.9],
};

