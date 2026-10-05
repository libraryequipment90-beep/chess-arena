const { Chess } = require("chess.js");

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

function evaluate(chess) {
  if (chess.in_checkmate()) {
    return chess.turn() === "w" ? -1e6 : 1e6;
  }
  if (chess.in_stalemate() || chess.in_draw() || chess.in_threefold_repetition()) {
    return 0;
  }
  const board = chess.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const val = PIECE_VALUES[piece.type];
      const table = PST[piece.type];
      const pst = piece.color === "w" ? table[r][c] : table[7 - r][c];
      const signed = piece.color === "w" ? val + pst : -(val + pst);
      score += signed;
    }
  }
  return score;
}

function orderMoves(chess, moves) {
  return moves.sort((a, b) => {
    const capA = a.captured ? PIECE_VALUES[a.captured] - PIECE_VALUES[a.piece] / 10 : 0;
    const capB = b.captured ? PIECE_VALUES[b.captured] - PIECE_VALUES[b.piece] / 10 : 0;
    return capB - capA;
  });
}

function minimax(chess, depth, alpha, beta, maximizing) {
  if (depth === 0 || chess.game_over()) {
    return { score: evaluate(chess), move: null };
  }
  const moves = orderMoves(chess, chess.moves({ verbose: true }));
  let bestMove = moves[0] || null;

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const result = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      if (result.score > maxEval) {
        maxEval = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  }

  let minEval = Infinity;
  for (const move of moves) {
    chess.move(move);
    const result = minimax(chess, depth - 1, alpha, beta, true);
    chess.undo();
    if (result.score < minEval) {
      minEval = result.score;
      bestMove = move;
    }
    beta = Math.min(beta, result.score);
    if (beta <= alpha) break;
  }
  return { score: minEval, move: bestMove };
}

function pickRandom(moves) {
  return moves[Math.floor(Math.random() * moves.length)];
}

function findBestMove(fen, difficulty) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;

  const level = Number(difficulty) || 2;
  if (level <= 1) {
    const captures = moves.filter((m) => m.captured);
    return captures.length && Math.random() < 0.45 ? pickRandom(captures) : pickRandom(moves);
  }
  if (level === 2) {
    const captures = orderMoves(chess, moves.filter((m) => m.captured));
    if (captures.length && Math.random() < 0.7) return captures[0];
    const { move } = minimax(chess, 2, -Infinity, Infinity, chess.turn() === "w");
    return move || pickRandom(moves);
  }
  const depth = level >= 4 ? 3 : 2;
  const { move } = minimax(chess, depth, -Infinity, Infinity, chess.turn() === "w");
  return move || pickRandom(moves);
}

function serializeGame(chess) {
  return {
    fen: chess.fen(),
    pgn: chess.pgn(),
    turn: chess.turn(),
    inCheck: chess.in_check(),
    inCheckmate: chess.in_checkmate(),
    inStalemate: chess.in_stalemate(),
    inDraw: chess.in_draw(),
    gameOver: chess.game_over(),
    history: chess.history({ verbose: true }),
    ascii: chess.ascii(),
  };
}

module.exports = { findBestMove, serializeGame, Chess };
