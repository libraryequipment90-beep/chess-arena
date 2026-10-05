export const UNICODE = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

const FILES = "abcdefgh";

export function squareName(file, rank) {
  return `${FILES[file]}${rank}`;
}

export function parseFenBoard(fen) {
  const placement = fen.split(" ")[0];
  const rows = placement.split("/");
  const board = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) row.push(null);
      } else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        row.push({ color, type: ch.toLowerCase() });
      }
    }
    board.push(row);
  }
  return board;
}

export function pieceGlyph(piece) {
  if (!piece) return "";
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  return UNICODE[key];
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function groupMoves(history) {
  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      n: i / 2 + 1,
      white: history[i]?.san || "",
      black: history[i + 1]?.san || "",
    });
  }
  return rows;
}

const CAPTURE_ORDER = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

export function capturedPieces(history) {
  const whiteTook = [];
  const blackTook = [];
  for (const move of history || []) {
    if (!move.captured) continue;
    const piece = { color: move.color === "w" ? "b" : "w", type: move.captured };
    if (move.color === "w") whiteTook.push(piece);
    else blackTook.push(piece);
  }
  const sort = (list) =>
    [...list].sort((a, b) => CAPTURE_ORDER[a.type] - CAPTURE_ORDER[b.type]);
  return { whiteTook: sort(whiteTook), blackTook: sort(blackTook) };
}
