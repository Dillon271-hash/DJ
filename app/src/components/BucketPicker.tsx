import type { Bucket } from "../lib/types";
import { BUCKET_LABEL } from "../lib/types";

// The three buckets' identity, used everywhere a bucket is chosen. Colors
// live in index.css (--bucket-*), shared with the score pills and rings so
// a "Loved it" looks the same when you pick it as when you see it ranked.
const TAGLINES: Record<"set" | "venue", Record<Bucket, string>> = {
  set: { loved: "Wanted an encore", good: "Solid set", not: "Left early" },
  venue: { loved: "Best night out", good: "Good room", not: "Wouldn't go back" },
};

const ORDER: Bucket[] = ["loved", "good", "not"];

export function BucketIcon({ bucket }: { bucket: Bucket }) {
  if (bucket === "loved") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 21.2 10.6 20C5.4 15.4 2 12.3 2 8.5 2 5.4 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.8-3.4 6.9-8.6 11.5L12 21.2z"
        />
      </svg>
    );
  }
  if (bucket === "good") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M2 21h3.5V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6c-.4.4-.6.9-.6 1.4V19c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7v-2z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22 3h-3.5v12H22V3zM2 14c0 1.1.9 2 2 2h6.3l-1 4.6v.3c0 .4.2.8.4 1.1l1.1 1 6.6-6.6c.4-.4.6-.9.6-1.4V5c0-1.1-.9-2-2-2H7c-.8 0-1.5.5-1.8 1.2l-3 7.1c-.1.2-.2.5-.2.7v2z"
      />
    </svg>
  );
}

export function BucketPicker({
  context,
  selected,
  onPick,
}: {
  context: "set" | "venue";
  selected: Bucket | null;
  onPick: (bucket: Bucket) => void;
}) {
  return (
    <div className="bucket-picker" role="radiogroup">
      {ORDER.map((b, i) => (
        <button
          key={b}
          type="button"
          role="radio"
          aria-checked={selected === b}
          className={`bucket-card ${b} ${selected === b ? "selected" : ""} ${selected && selected !== b ? "dimmed" : ""}`}
          style={{ animationDelay: `${i * 60}ms` }}
          onClick={() => onPick(b)}
        >
          <span className="bucket-icon">
            <BucketIcon bucket={b} />
          </span>
          <span className="bucket-text">
            <span className="bucket-label">{BUCKET_LABEL[b]}</span>
            <span className="bucket-tagline">{TAGLINES[context][b]}</span>
          </span>
          <span className="bucket-check" aria-hidden="true">
            ✓
          </span>
        </button>
      ))}
    </div>
  );
}
