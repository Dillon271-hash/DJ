import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Rankings } from "./pages/Rankings";
import { LogSet } from "./pages/LogSet";
import { SetDetail } from "./pages/SetDetail";
import { ArtistPage } from "./pages/ArtistPage";

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="content">
        <Routes>
          <Route path="/" element={<Rankings />} />
          <Route path="/log" element={<LogSet />} />
          <Route path="/set/:id" element={<SetDetail />} />
          <Route path="/artist/:name" element={<ArtistPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
