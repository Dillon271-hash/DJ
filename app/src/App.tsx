import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Rankings } from "./pages/Rankings";
import { LogAndRate } from "./pages/LogAndRate";
import { SetDetail } from "./pages/SetDetail";

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="content">
        <Routes>
          <Route path="/" element={<Rankings />} />
          <Route path="/log" element={<LogAndRate />} />
          <Route path="/set/:id" element={<SetDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
