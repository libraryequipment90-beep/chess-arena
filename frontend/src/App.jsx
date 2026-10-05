import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Play from "./pages/Play.jsx";
import Puzzles from "./pages/Puzzles.jsx";
import Learn from "./pages/Learn.jsx";
import Watch from "./pages/Watch.jsx";
import Community from "./pages/Community.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/puzzles" element={<Puzzles />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/community" element={<Community />} />
      </Routes>
    </Layout>
  );
}
