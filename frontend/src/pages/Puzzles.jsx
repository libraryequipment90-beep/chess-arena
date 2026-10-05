import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { api } from "../api";
import ChessBoard from "../components/ChessBoard";

export default function Puzzles() {
  const [list, setList] = useState([]);
  const [current, setCurrent] = useState(null);
  const [fen, setFen] = useState("");
  const [selected, setSelected] = useState(null);
  const [legal, setLegal] = useState([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(null);
  const [solved, setSolved] = useState(0);

  useEffect(() => {
    api.puzzles().then((rows) => {
      setList(rows);
      if (rows[0]) loadPuzzle(rows[0]);
    });
  }, []);

  async function loadPuzzle(p) {
    const full = await api.puzzle(p.id);
    setCurrent(full);
    setFen(full.fen);
    setSelected(null);
    setLegal([]);
    setMoveIndex(0);
    setMsg("Find the best move.");
    setOk(null);
  }

  const chess = useMemo(() => (fen ? new Chess(fen) : null), [fen]);
  const lastMove = null;

  function onSquareClick(sq, piece, promoMove) {
    if (!chess || !current || (ok === true && msg.includes("solved"))) return;
    if (promoMove) {
      attempt(promoMove);
      return;
    }
    if (selected) {
      const dest = legal.find((m) => m.to === sq);
      if (dest) {
        attempt({ from: selected, to: sq, promotion: dest.promotion || "q" });
        return;
      }
    }
    if (piece && piece.color === chess.turn()) {
      setSelected(sq);
      setLegal(chess.moves({ square: sq, verbose: true }));
    } else {
      setSelected(null);
      setLegal([]);
    }
  }

  async function attempt(move) {
    const probe = new Chess(fen);
    const played = probe.move(move);
    if (!played) return;
    try {
      const result = await api.solvePuzzle(current.id, { san: played.san, moveIndex });
      if (!result.ok) {
        setOk(false);
        setMsg(`Incorrect. ${result.hint || "Try again."}`);
        setSelected(null);
        setLegal([]);
        return;
      }
      if (result.replySan) {
        probe.move(result.replySan);
      }
      setFen(probe.fen());
      setMoveIndex(result.nextIndex);
      setSelected(null);
      setLegal([]);
      if (result.complete) {
        setOk(true);
        setMsg("Puzzle solved.");
        setSolved((n) => n + 1);
      } else {
        setOk(true);
        setMsg("Correct — keep going.");
      }
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Puzzles</h1>
          <p>Train tactics. Solved this session: {solved}</p>
        </div>
      </div>
      <div className="play-layout">
        <div className="board-wrap">
          {fen && (
            <ChessBoard
              fen={fen}
              selected={selected}
              legal={legal}
              lastMove={lastMove}
              inCheck={chess?.in_check()}
              turn={chess?.turn()}
              onSquareClick={onSquareClick}
            />
          )}
        </div>
        <div className="side-panel">
          {current && (
            <>
              <span className="tag">{current.theme}</span>
              <h3>{current.title}</h3>
              <p className="muted">
                Rating {current.rating} · {current.moves} move{current.moves > 1 ? "s" : ""}
              </p>
              <p style={{ margin: "10px 0" }}>{current.description}</p>
              <div className={`feedback ${ok === false ? "bad" : ok ? "ok" : ""}`}>{msg}</div>
              <div className="cta-row" style={{ marginTop: 14 }}>
                <button className="btn" onClick={() => current && loadPuzzle(current)}>
                  Reset
                </button>
              </div>
            </>
          )}
          <h3 style={{ marginTop: 18 }}>Set</h3>
          <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
            {list.map((p) => (
              <div
                key={p.id}
                className="bot-card"
                onClick={() => loadPuzzle(p)}
                style={{ borderColor: current?.id === p.id ? "var(--green)" : "transparent" }}
              >
                <div>
                  <strong>{p.title}</strong>
                  <div className="muted">
                    {p.theme} · {p.rating}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
