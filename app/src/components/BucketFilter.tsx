import { BucketIcon } from "./BucketPicker";
import { BUCKET_LABEL, type Bucket } from "../lib/types";

export type BucketFilterValue = "all" | Bucket;

const ORDER: BucketFilterValue[] = ["all", "loved", "good", "not"];

// The All / Loved it / It was good / Not for me filter, as four tiles in
// each bucket's own colour, with how many are in each.
export function BucketFilter({
  value,
  onChange,
  counts,
}: {
  value: BucketFilterValue;
  onChange: (v: BucketFilterValue) => void;
  counts: Record<BucketFilterValue, number>;
}) {
  return (
    <div className="bucket-filter" role="radiogroup" aria-label="Filter by rating">
      {ORDER.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          className={`bf ${k}${value === k ? " on" : ""}`}
          onClick={() => onChange(k)}
        >
          <span className="bf-top">
            {k === "all" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M4 6h16v2.2H4zm0 4.9h16v2.2H4zm0 4.9h16V18H4z" />
              </svg>
            ) : (
              <BucketIcon bucket={k} />
            )}
            <b>{counts[k]}</b>
          </span>
          <span className="bf-label">{k === "all" ? "All" : BUCKET_LABEL[k]}</span>
        </button>
      ))}
    </div>
  );
}

/** Two-way toggle, e.g. Sets / Venues, with optional counts. */
export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; count?: number }[];
}) {
  return (
    <div className="seg seg-wide view-toggle" role="tablist">
      {options.map((o) => (
        <button key={o.key} type="button" role="tab" aria-selected={value === o.key} className={value === o.key ? "on" : ""} onClick={() => onChange(o.key)}>
          {o.label}
          {o.count !== undefined && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
