import { lazy, Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Welcome } from "./pages/Welcome";
import { ResetPassword } from "./pages/ResetPassword";
import { Rankings } from "./pages/Rankings";
import { useEncoreStore } from "./lib/store";
import { isSupabaseConfigured } from "./lib/supabase";

// Everything past the home page loads on demand, so the sign-in screen
// and Rankings don't pay for the rating flow, the 300-artist and
// 400-venue seed lists, or the Wikipedia lookup code up front.
const LogSet = lazy(() => import("./pages/LogSet").then((m) => ({ default: m.LogSet })));
const SetDetail = lazy(() => import("./pages/SetDetail").then((m) => ({ default: m.SetDetail })));
const ArtistPage = lazy(() => import("./pages/ArtistPage").then((m) => ({ default: m.ArtistPage })));
const VenuePage = lazy(() => import("./pages/VenuePage").then((m) => ({ default: m.VenuePage })));

function PageLoading() {
  return (
    <div className="page-loading">
      <span className="mark lg pulse" aria-hidden="true" />
    </div>
  );
}

function App() {
  const authReady = useEncoreStore((s) => s.authReady);
  const session = useEncoreStore((s) => s.session);
  const passwordRecovery = useEncoreStore((s) => s.passwordRecovery);
  const init = useEncoreStore((s) => s.init);

  useEffect(() => {
    if (isSupabaseConfigured) init();
  }, [init]);

  if (!isSupabaseConfigured) {
    return (
      <div className="welcome-screen">
        <span className="mark lg" aria-hidden="true" />
        <h1 className="display" style={{ fontSize: "1.8rem", margin: "1.2rem 0 0.4rem" }}>
          Almost there
        </h1>
        <p style={{ color: "var(--smoke)", maxWidth: "360px" }}>
          Encore needs a Supabase project to handle accounts. Copy{" "}
          <code>.env.example</code> to <code>.env</code>, fill in{" "}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          from your project's Settings → Data API page, run{" "}
          <code>supabase/schema.sql</code> once in the SQL Editor, then
          restart the dev server. See the README for the full walkthrough.
        </p>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="page-loading" style={{ minHeight: "100vh" }}>
        <span className="mark lg pulse" aria-hidden="true" />
      </div>
    );
  }

  if (!session) {
    return <Welcome />;
  }

  if (passwordRecovery) {
    return <ResetPassword />;
  }

  return (
    <div className="app-shell">
      <Header />
      <main className="content">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Rankings />} />
            <Route path="/log" element={<LogSet />} />
            <Route path="/set/:id" element={<SetDetail />} />
            <Route path="/artist/:name" element={<ArtistPage />} />
            <Route path="/venue/:name" element={<VenuePage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
