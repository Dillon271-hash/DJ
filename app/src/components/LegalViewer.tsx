import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { Vinyl } from "./Vinyl";

// Privacy Policy, Terms and Support shown inside the app, full screen —
// no trip out to the browser. The text comes straight from the public
// pages (public/privacy.html etc.), so the in-app copy and the URL given
// to the App Store can never drift apart.

export type LegalDoc = "privacy" | "terms" | "support";

const TITLES: Record<LegalDoc, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  support: "Support",
};

export const useLegal = create<{ doc: LegalDoc | null; open: (d: LegalDoc) => void; close: () => void }>()((set) => ({
  doc: null,
  open: (doc) => set({ doc }),
  close: () => set({ doc: null }),
}));

/** A real link to the public page that opens in-app instead when tapped. */
export function LegalLink({ doc, className, children }: { doc: LegalDoc; className?: string; children: ReactNode }) {
  const open = useLegal((s) => s.open);
  return (
    <a
      href={`/${doc}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        open(doc);
      }}
    >
      {children}
    </a>
  );
}

const cache = new Map<LegalDoc, Promise<string>>();

function loadDoc(doc: LegalDoc): Promise<string> {
  const hit = cache.get(doc);
  if (hit) return hit;
  const p = fetch(`/${doc}.html`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.text();
    })
    .then((html) => {
      const page = new DOMParser().parseFromString(html, "text/html");
      const wrap = page.querySelector(".wrap");
      if (!wrap) throw new Error("unexpected page");
      // The in-app view has its own header; drop the page's logo, tab
      // links and footer, and the "Open Disko" button.
      wrap.querySelectorAll(".brand, nav, footer, a.btn").forEach((el) => el.remove());
      return wrap.innerHTML;
    });
  cache.set(doc, p);
  p.catch(() => cache.delete(doc));
  return p;
}

export function LegalViewer() {
  const doc = useLegal((s) => s.doc);
  const open = useLegal((s) => s.open);
  const close = useLegal((s) => s.close);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc) return;
    let stale = false;
    setHtml(null);
    setFailed(false);
    scroller.current?.scrollTo(0, 0);
    loadDoc(doc)
      .then((h) => !stale && setHtml(h))
      .catch(() => !stale && setFailed(true));
    return () => {
      stale = true;
    };
  }, [doc]);

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [doc, close]);

  if (!doc) return null;

  // Links between the three pages stay in-app; email links work as normal.
  function onContentClick(e: MouseEvent<HTMLDivElement>) {
    const a = (e.target as HTMLElement).closest("a");
    const m = a?.getAttribute("href")?.match(/^\/(privacy|terms|support)$/);
    if (m) {
      e.preventDefault();
      open(m[1] as LegalDoc);
    }
  }

  return createPortal(
    <div className="legal-viewer" role="dialog" aria-modal="true" aria-label={TITLES[doc]} ref={scroller}>
      <header className="legal-viewer-bar">
        <button type="button" className="flow-icon-btn" onClick={close} aria-label="Close">
          ✕
        </button>
        <div className="legal-viewer-tabs">
          {(Object.keys(TITLES) as LegalDoc[]).map((d) => (
            <button key={d} type="button" className={d === doc ? "on" : ""} onClick={() => open(d)}>
              {d === "privacy" ? "Privacy" : d === "terms" ? "Terms" : "Support"}
            </button>
          ))}
        </div>
      </header>
      {html ? (
        <article className="legal-doc" onClick={onContentClick} dangerouslySetInnerHTML={{ __html: html }} />
      ) : failed ? (
        <div className="legal-doc">
          <h1>{TITLES[doc]}</h1>
          <p>
            Couldn't load this page. You can read it at <a href={`/${doc}`}>{window.location.host}/{doc}</a>.
          </p>
        </div>
      ) : (
        <div className="page-loading">
          <Vinyl size={52} spin />
        </div>
      )}
    </div>,
    document.body,
  );
}
