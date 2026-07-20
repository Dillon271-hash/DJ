export type Bucket = "loved" | "good" | "not";

export interface SetLog {
  id: string;
  artist: string;
  event: string;
  date: string;
  genre?: string;
  note?: string;
  bucket: Bucket;
  score: number;
  createdAt: number;
}

export interface DraftLog {
  artist: string;
  event: string;
  date: string;
  genre?: string;
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
