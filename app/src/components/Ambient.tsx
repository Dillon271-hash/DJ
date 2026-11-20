import { useLocation } from "react-router-dom";

// The soft colour glows behind every page — mostly black, with a couple of
// slow-drifting spots whose colours change with the section you're in.
const SECTIONS: [RegExp, string][] = [
  [/^\/discover/, "discover"],
  [/^\/(people|u\/)/, "people"],
  [/^\/crews/, "crews"],
  [/^\/charts/, "charts"],
  [/^\/(artist|venue|set)\//, "detail"],
  [/^\/rankings/, "rankings"],
  [/^\/$/, "people"],
];

export function Ambient() {
  const { pathname } = useLocation();
  const section = SECTIONS.find(([re]) => re.test(pathname))?.[1] ?? "rankings";
  return (
    <div className={`ambient ${section}`} aria-hidden="true">
      <span className="amb amb-1" />
      <span className="amb amb-2" />
      <span className="amb amb-3" />
    </div>
  );
}
