import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { Welcome } from "./pages/Welcome";
import { ResetPassword } from "./pages/ResetPassword";
import { Rankings } from "./pages/Rankings";
import { Loader, Vinyl } from "./components/Vinyl";
import { Splash } from "./components/Splash";
import { useEncoreStore } from "./lib/store";
import { isSupabaseConfigured } from "./lib/supabase";

// Everything past the home page loads on demand, so the sign-in screen
// and Rankings don't pay for the rating flow, the 300-artist and
// 400-venue seed lists, or the Wikipedia lookup code up front.
const LogSet = lazy(() => import("./pages/LogSet").then((m) => ({ default: m.LogSet })));
const LogFlow = lazy(() => import("./pages/LogFlow").then((m) => ({ default: m.LogFlow })));
const SetDetail = lazy(() => import("./pages/SetDetail").then((m) => ({ default: m.SetDetail })));
const ArtistPage = lazy(() => import("./pages/ArtistPage").then((m) => ({ default: m.ArtistPage })));
const VenuePage = lazy(() => import("./pages/VenuePage").then((m) => ({ default: m.VenuePage })));
const People = lazy(() => import("./pages/People").then((m) => ({ default: m.People })));
const UserPage = lazy(() => import("./pages/UserPage").then((m) => ({ default: m.UserPage })));
const Crews = lazy(() => import("./pages/Crews").then((m) => ({ default: m.Crews })));
const CrewPage = lazy(() => import("./pages/CrewPage").then((m) => ({ default: m.CrewPage })));
const Charts = lazy(() => import("./pages/Charts").then((m) => ({ default: m.Charts })));

function App() {
  // The opening animation plays over whatever is loading underneath, once
  // per app load.
  const [splash, setSplash] = useState(true);
  const endSplash = useCallback(() => setSplash(false), []);
  return (
    <>
      <Screens />
      {splash && <Splash onDone={endSplash} />}
    </>
  );
}

function Screens(): ReactNode {
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
        <Vinyl size={64} />
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
    return <Loader fullscreen size={72} />;
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
      <BottomNav />
      <main className="content">
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Rankings />} />
            <Route path="/log" element={<LogSet />} />
            <Route path="/log/:artist" element={<LogFlow />} />
            <Route path="/set/:id" element={<SetDetail />} />
            <Route path="/artist/:name" element={<ArtistPage />} />
            <Route path="/venue/:name" element={<VenuePage />} />
            <Route path="/people" element={<People />} />
            <Route path="/u/:id" element={<UserPage />} />
            <Route path="/crews" element={<Crews />} />
            <Route path="/crews/:id" element={<CrewPage />} />
            <Route path="/charts" element={<Charts />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
