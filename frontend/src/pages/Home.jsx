import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import ChessBoard from "../components/ChessBoard";

export default function Home() {
  const nav = useNavigate();
  const [health, setHealth] = useState(null);
  const [bots, setBots] = useState([]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
    api.bots().then(setBots).catch(() => {});
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Play 3D Chess Online</h1>
          <p>Free 3D chess for everyone — play, solve puzzles, and learn.</p>
        </div>
        <div className="cta-row">
          <button className="btn primary" onClick={() => nav("/play")}>
            Play now
          </button>
          <button className="btn" onClick={() => nav("/puzzles")}>
            Daily puzzles
          </button>
        </div>
      </div>

      <section className="hero">
        <div>
          <h2>Join the global chess community</h2>
          <p>
            Play 3D chess vs computer at any strength, train tactics, study lessons, and
            replay famous master games — all in your browser.
          </p>
          <div className="cta-row">
            <button className="btn primary" onClick={() => nav("/play")}>
              Play vs Computer
            </button>
            <button className="btn ghost" onClick={() => nav("/learn")}>
              Start learning
            </button>
          </div>
          <div className="stats">
            <div className="stat">
              <b>{health ? health.playersOnline.toLocaleString() : "12,840"}</b>
              <span>Players online</span>
            </div>
            <div className="stat">
              <b>10</b>
              <span>Tactics puzzles</span>
            </div>
            <div className="stat">
              <b>5</b>
              <span>Master games</span>
            </div>
          </div>
        </div>
        <div className="hero-board">
          <div className="board-wrap" style={{ width: "min(420px, 100%)" }}>
            <ChessBoard
              fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
              interactive={false}
              lastMove={{ from: "e2", to: "e4" }}
              autoRotate
            />
          </div>
        </div>
      </section>

      <h3 style={{ margin: "8px 0 12px" }}>Play a bot</h3>
      <div className="grid">
        {bots.map((b) => (
          <div className="card" key={b.id}>
            <span className="tag">{b.title}</span>
            <h3>
              {b.name} <span className="muted">({b.rating})</span>
            </h3>
            <p>{b.blurb}</p>
            <button
              className="btn primary"
              style={{ marginTop: 12 }}
              onClick={() => nav("/play", { state: { botId: b.id } })}
            >
              Challenge
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ margin: "24px 0 12px" }}>Everything you need</h3>
      <div className="grid">
        <div className="card" onClick={() => nav("/play")} style={{ cursor: "pointer" }}>
          <span className="tag">Play</span>
          <h3>Have fun playing chess</h3>
          <p>Pick a time control and face a bot from beginner to strong club level.</p>
        </div>
        <div className="card" onClick={() => nav("/puzzles")} style={{ cursor: "pointer" }}>
          <span className="tag blue">Puzzles</span>
          <h3>Improve with tactics</h3>
          <p>Mates, forks, pins, and sacrifices. Hint if you get stuck.</p>
        </div>
        <div className="card" onClick={() => nav("/learn")} style={{ cursor: "pointer" }}>
          <span className="tag gold">Learn</span>
          <h3>Key strategies</h3>
          <p>Openings, special moves, and endgames explained in short lessons.</p>
        </div>
        <div className="card" onClick={() => nav("/watch")} style={{ cursor: "pointer" }}>
          <span className="tag">Watch</span>
          <h3>Review great games</h3>
          <p>Step through immortal games from Fischer, Kasparov, Carlsen, and more.</p>
        </div>
      </div>
    </>
  );
}
