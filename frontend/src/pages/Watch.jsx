import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { api } from "../api";
import ChessBoard from "../components/ChessBoard";
import { groupMoves } from "../pieces";

export default function Watch() {
  const [games, setGames] = useState([]);
  const [selected, setSelected] = useState(null);
  const [ply, setPly] = useState(0);

  useEffect(() => {
    api.watch().then((rows) => {
      setGames(rows);
      setSelected(rows[0] || null);
      setPly(0);
    });
  }, []);

  const replay = useMemo(() => {
    const chess = new Chess();
    if (!selected) return { fen: chess.fen(), history: [], last: null };
    const tmp = new Chess();
    tmp.load_pgn(selected.pgn);
    const history = tmp.history({ verbose: true });
    const board = new Chess();
    const slice = history.slice(0, ply);
    slice.forEach((m) => board.move(m));
    const last = slice[slice.length - 1];
    return { fen: board.fen(), history, last: last ? { from: last.from, to: last.to } : null };
  }, [selected, ply]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Watch</h1>
          <p>Replay famous games, one move at a time.</p>
        </div>
      </div>
      <div className="watch-layout">
        <div>
          <div className="board-wrap">
            <ChessBoard fen={replay.fen} interactive={false} lastMove={replay.last} />
          </div>
          <div className="cta-row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => setPly(0)}>
              Start
            </button>
            <button className="btn" onClick={() => setPly((p) => Math.max(0, p - 1))}>
              Prev
            </button>
            <button
              className="btn primary"
              onClick={() => setPly((p) => Math.min(replay.history.length, p + 1))}
            >
              Next
            </button>
            <button className="btn" onClick={() => setPly(replay.history.length)}>
              End
            </button>
          </div>
        </div>
        <div className="side-panel">
          {selected && (
            <>
              <span className="tag">{selected.year}</span>
              <h3>
                {selected.white} vs {selected.black}
              </h3>
              <p className="muted">
                {selected.event} · {selected.result} · {selected.eco}
              </p>
              <p style={{ margin: "10px 0 14px" }}>{selected.highlight}</p>
              <div className="moves">
                {groupMoves(replay.history).map((row) => (
                  <div className="move-row" key={row.n}>
                    <span className="muted">{row.n}.</span>
                    <span>{row.white}</span>
                    <span>{row.black}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <h3 style={{ marginTop: 8 }}>Featured</h3>
          {games.map((g) => (
            <div
              key={g.id}
              className="bot-card"
              onClick={() => {
                setSelected(g);
                setPly(0);
              }}
              style={{ marginTop: 8, borderColor: selected?.id === g.id ? "var(--green)" : "transparent" }}
            >
              <div>
                <strong>
                  {g.white} vs {g.black}
                </strong>
                <div className="muted">
                  {g.year} · {g.result}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
