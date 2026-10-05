import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Chess } from "chess.js";
import { api } from "../api";
import ChessBoard from "../components/ChessBoard";
import { formatClock, groupMoves } from "../pieces";
import { getSocket } from "../socket";

export default function Play() {
  const location = useLocation();
  const [bots, setBots] = useState([]);
  const [botId, setBotId] = useState(location.state?.botId || "easy");
  const [color, setColor] = useState("white");
  const [timeControl, setTimeControl] = useState(600);
  const [tab, setTab] = useState("online");
  const [name, setName] = useState("Player");
  const [joinCode, setJoinCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [searching, setSearching] = useState(false);
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState(null);
  const [legal, setLegal] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const arenaRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    api.bots().then(setBots).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setTab("live");
      setJoinCode(room.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (game) document.body.classList.add("in-game");
    else document.body.classList.remove("in-game");
    return () => document.body.classList.remove("in-game");
  }, [game]);

  useEffect(() => {
    if (!game || game.mode === "live" || game.status !== "active") {
      clearInterval(timer.current);
      return;
    }
    timer.current = setInterval(() => {
      setGame((g) => {
        if (!g || g.status !== "active") return g;
        const key = g.turn === "w" ? "whiteClock" : "blackClock";
        const next = Math.max(0, (g[key] || 0) - 1);
        if (next === 0) {
          return { ...g, [key]: 0, status: "finished", winner: g.turn === "w" ? "black" : "white" };
        }
        return { ...g, [key]: next };
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [game?.id, game?.status, game?.mode]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const lastMove = useMemo(() => {
    const h = game?.history || [];
    return h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null;
  }, [game]);

  function bindLiveSocket() {
    if (socketRef.current) return socketRef.current;
    const s = getSocket();
    socketRef.current = s;
    s.off("game");
    s.off("liveError");
    s.off("opponentLeft");
    s.off("searching");
    s.off("searchCanceled");
    s.on("game", (payload) => {
      setSearching(false);
      setGame(payload);
      setSelected(null);
      setLegal([]);
      setError("");
      if (payload.code) {
        const link = `${window.location.origin}/play?room=${payload.code}`;
        setInviteLink(link);
      }
    });
    s.on("searching", () => {
      setSearching(true);
      setError("");
    });
    s.on("searchCanceled", () => setSearching(false));
    s.on("liveError", (msg) => setError(String(msg || "Live error")));
    s.on("opponentLeft", () => setError("Opponent left the room"));
    return s;
  }

  async function startGame() {
    setError("");
    setBusy(true);
    try {
      document.documentElement.requestFullscreen?.().catch(() => {});
      const created = await api.createGame({ mode: "computer", botId, color, timeControl });
      setGame(created);
      setSelected(null);
      setLegal([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function findMatch() {
    setError("");
    setSearching(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    const s = bindLiveSocket();
    s.emit("findMatch", { name, timeControl });
  }

  function cancelSearch() {
    bindLiveSocket().emit("cancelSearch");
    setSearching(false);
  }

  function createLive() {
    setError("");
    document.documentElement.requestFullscreen?.().catch(() => {});
    const s = bindLiveSocket();
    s.emit("createRoom", { name, timeControl, color });
  }

  function joinLive() {
    setError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Enter a room code");
      return;
    }
    document.documentElement.requestFullscreen?.().catch(() => {});
    const s = bindLiveSocket();
    s.emit("joinRoom", { code, name });
  }

  function copyInvite() {
    const text = inviteLink || game?.code || "";
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  function localLegal(square) {
    if (!game) return [];
    const chess = new Chess(game.fen);
    return chess.moves({ square, verbose: true });
  }

  async function onSquareClick(sq, piece, promoMove) {
    if (!game || game.status !== "active" || busy) return;
    const playerTurn = game.playerColor === "white" ? "w" : "b";
    if (game.turn !== playerTurn) return;

    if (promoMove) {
      await makeMove(promoMove);
      return;
    }

    if (selected) {
      const dest = legal.find((m) => m.to === sq);
      if (dest) {
        await makeMove({ from: selected, to: sq, promotion: dest.promotion || "q" });
        return;
      }
    }

    const mine = piece && ((playerTurn === "w" && piece.color === "w") || (playerTurn === "b" && piece.color === "b"));
    if (mine) {
      setSelected(sq);
      setLegal(localLegal(sq));
    } else {
      setSelected(null);
      setLegal([]);
    }
  }

  async function makeMove(move) {
    setBusy(true);
    setError("");
    try {
      if (game.mode === "live") {
        bindLiveSocket().emit("liveMove", move);
        setSelected(null);
        setLegal([]);
        return;
      }
      const next = await api.move(game.id, move);
      setGame(next);
      setSelected(null);
      setLegal([]);
    } catch (e) {
      setError(e.message);
      setSelected(null);
      setLegal([]);
    } finally {
      setBusy(false);
    }
  }

  async function resign() {
    if (!game) return;
    if (game.mode === "live") {
      bindLiveSocket().emit("liveResign");
      return;
    }
    const next = await api.resign(game.id);
    setGame(next);
  }

  function leaveGame() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setGame(null);
    setInviteLink("");
  }

  const flipped = game?.playerColor === "black";
  const bot = bots.find((b) => b.id === botId);
  const youAre = game?.playerColor === "white" ? "White" : "Black";

  return (
    <>
      {!game && (
      <div className="topbar">
        <div>
          <h1>Play 3D</h1>
          <p>Play live with a friend, or vs computer. Drag to rotate, scroll to zoom.</p>
        </div>
      </div>
      )}

      {!game && (
        <div className="play-layout">
          <div className="board-wrap">
            <ChessBoard fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" interactive={false} />
          </div>
          <div className="side-panel setup">
            <div className="mode-tabs three">
              <button className={`btn ${tab === "online" ? "primary" : ""}`} onClick={() => setTab("online")}>
                Online
              </button>
              <button className={`btn ${tab === "live" ? "primary" : ""}`} onClick={() => setTab("live")}>
                Friend
              </button>
              <button className={`btn ${tab === "bot" ? "primary" : ""}`} onClick={() => setTab("bot")}>
                Computer
              </button>
            </div>

            {tab === "online" && (
              <>
                <p className="muted">Get matched with a random online player.</p>
                <label>
                  Your name
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Player" />
                </label>
                <label>
                  Time control
                  <select value={timeControl} onChange={(e) => setTimeControl(Number(e.target.value))}>
                    <option value={60}>1 min Bullet</option>
                    <option value={180}>3 min Blitz</option>
                    <option value={600}>10 min Rapid</option>
                    <option value={1800}>30 min Classical</option>
                  </select>
                </label>
                {searching ? (
                  <>
                    <div className="feedback">Searching for an opponent...</div>
                    <button className="btn danger" onClick={cancelSearch}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button className="btn primary" onClick={findMatch}>
                    Find match
                  </button>
                )}
              </>
            )}

            {tab === "live" && (
              <>
                <label>
                  Your name
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Player" />
                </label>
                <label>
                  Your color
                  <select value={color} onChange={(e) => setColor(e.target.value)}>
                    <option value="white">White (you host)</option>
                    <option value="black">Black (you host)</option>
                  </select>
                </label>
                <label>
                  Time control
                  <select value={timeControl} onChange={(e) => setTimeControl(Number(e.target.value))}>
                    <option value={60}>1 min Bullet</option>
                    <option value={180}>3 min Blitz</option>
                    <option value={600}>10 min Rapid</option>
                    <option value={1800}>30 min Classical</option>
                  </select>
                </label>
                <button className="btn primary" onClick={createLive}>
                  Create room
                </button>
                <div className="or-line">or join with code</div>
                <label>
                  Room code
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                  />
                </label>
                <button className="btn" onClick={joinLive}>
                  Join room
                </button>
              </>
            )}

            {tab === "bot" && (
              <>
                {bots.map((b) => (
                  <div
                    key={b.id}
                    className={`bot-card ${botId === b.id ? "selected" : ""}`}
                    onClick={() => setBotId(b.id)}
                  >
                    <div>
                      <strong>{b.name}</strong>
                      <div className="muted">
                        {b.title} · {b.rating}
                      </div>
                    </div>
                    <span className="tag">{b.difficulty}★</span>
                  </div>
                ))}
                <label>
                  Your color
                  <select value={color} onChange={(e) => setColor(e.target.value)}>
                    <option value="white">White</option>
                    <option value="black">Black</option>
                    <option value="random">Random</option>
                  </select>
                </label>
                <label>
                  Time control
                  <select value={timeControl} onChange={(e) => setTimeControl(Number(e.target.value))}>
                    <option value={60}>1 min Bullet</option>
                    <option value={180}>3 min Blitz</option>
                    <option value={600}>10 min Rapid</option>
                    <option value={1800}>30 min Classical</option>
                  </select>
                </label>
                <button className="btn primary" onClick={startGame} disabled={busy}>
                  {busy ? "Starting..." : `Play ${bot?.name || "bot"}`}
                </button>
              </>
            )}
            {error && <div className="feedback bad">{error}</div>}
          </div>
        </div>
      )}

      {game && (
        <div className="play-fs" ref={arenaRef}>
          <div className="play-fs-stage">
            <div className="player-row">
              <div>
                <strong>{game.playerColor === "black" ? (game.whiteName || "You") : (game.mode === "live" ? game.blackName || "Waiting..." : game.bot?.name || "Bot")}</strong>
                <div className="muted">{game.mode === "live" ? (game.waiting ? "Waiting for opponent" : "Live") : game.bot?.title}</div>
              </div>
              <div className={`clock ${game.turn === (flipped ? "w" : "b") ? "active" : ""}`}>
                {formatClock(flipped ? game.whiteClock : game.blackClock)}
              </div>
            </div>
            <div className="board-wrap play-fs-board">
              <ChessBoard
                fen={game.fen}
                flipped={flipped}
                selected={selected}
                legal={legal}
                lastMove={lastMove}
                inCheck={game.inCheck}
                turn={game.turn}
                onSquareClick={onSquareClick}
                interactive={game.status === "active"}
                history={game.history || []}
                showZoomSlider
              />
            </div>
            <div className="player-row" style={{ marginTop: 10 }}>
              <div>
                <strong>{game.playerColor === "white" ? (game.whiteName || "You") : (game.mode === "live" ? game.blackName || "You" : game.bot?.name || "Bot")}</strong>
                <div className="muted">{game.mode === "live" ? `You · ${youAre}` : "Player"}</div>
              </div>
              <div className={`clock ${game.turn === (flipped ? "b" : "w") ? "active" : ""}`}>
                {formatClock(flipped ? game.blackClock : game.whiteClock)}
              </div>
            </div>
          </div>
          <div className="side-panel">
            {game.mode === "live" && (
              <div className="invite-box">
                <div className="muted">Room code</div>
                <strong className="room-code">{game.code}</strong>
                {game.waiting && <p className="muted">Share this code or link. Game starts when the other player joins.</p>}
                <button className="btn primary" onClick={copyInvite}>
                  {copied ? "Copied" : "Copy invite link"}
                </button>
              </div>
            )}
            {game.status === "finished" && (
              <div className="result-banner">
                {game.winner === "draw"
                  ? "Draw"
                  : game.winner === game.playerColor
                    ? "You won"
                    : "You lost"}
                {game.inCheckmate ? " by checkmate" : game.inStalemate ? " by stalemate" : ""}
              </div>
            )}
            {game.waiting && <div className="feedback">Waiting for opponent to join...</div>}
            <h3>Moves</h3>
            <div className="moves">
              {groupMoves(game.history || []).map((row) => (
                <div className="move-row" key={row.n}>
                  <span className="muted">{row.n}.</span>
                  <span>{row.white}</span>
                  <span>{row.black}</span>
                </div>
              ))}
            </div>
            {error && <div className="feedback bad">{error}</div>}
            <div className="cta-row">
              {game.status === "active" && (
                <button className="btn danger" onClick={resign}>
                  Resign
                </button>
              )}
              <button className="btn" onClick={leaveGame}>
                New game
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
