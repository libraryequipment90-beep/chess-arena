const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { v4: uuid } = require("uuid");
const { Chess, findBestMove, serializeGame } = require("./engine");
const { puzzles, lessons, featuredGames, leaderboard, bots } = require("./data");
const { LiveRooms, livePayload, finishIfOver } = require("./live");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const games = new Map();
const live = new LiveRooms();

function gamePayload(record) {
  const chess = new Chess(record.fen);
  return {
    id: record.id,
    mode: record.mode,
    bot: record.bot,
    playerColor: record.playerColor,
    difficulty: record.difficulty,
    timeControl: record.timeControl,
    whiteClock: record.whiteClock,
    blackClock: record.blackClock,
    status: record.status,
    winner: record.winner,
    createdAt: record.createdAt,
    ...serializeGame(chess),
  };
}

function finishComputer(record, chess) {
  if (!chess.game_over()) return;
  record.status = "finished";
  if (chess.in_checkmate()) {
    record.winner = chess.turn() === "w" ? "black" : "white";
  } else {
    record.winner = "draw";
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "chess-arena", playersOnline: 12840 + games.size + live.rooms.size });
});

app.get("/api/bots", (_req, res) => {
  res.json(bots);
});

app.get("/api/puzzles", (_req, res) => {
  res.json(
    puzzles.map(({ solution, ...rest }) => ({
      ...rest,
      moves: solution.length,
    }))
  );
});

app.get("/api/puzzles/:id", (req, res) => {
  const puzzle = puzzles.find((p) => p.id === req.params.id);
  if (!puzzle) return res.status(404).json({ error: "Puzzle not found" });
  const { solution, ...rest } = puzzle;
  res.json({ ...rest, moves: solution.length });
});

function stripSan(san) {
  return String(san || "").replace(/[+#]!?/g, "");
}

app.post("/api/puzzles/:id/solve", (req, res) => {
  const puzzle = puzzles.find((p) => p.id === req.params.id);
  if (!puzzle) return res.status(404).json({ error: "Puzzle not found" });
  const { san, moveIndex } = req.body || {};
  const idx = Number(moveIndex) || 0;
  const expected = puzzle.solution[idx];
  const ok = stripSan(san) === stripSan(expected);
  if (!ok) {
    return res.json({ ok: false, complete: false, expected: null, nextIndex: idx, hint: puzzle.hint, replySan: null });
  }
  const replySan = puzzle.solution[idx + 1] || null;
  const afterReply = replySan ? idx + 2 : idx + 1;
  const complete = afterReply >= puzzle.solution.length;
  res.json({
    ok: true,
    complete,
    expected,
    nextIndex: afterReply,
    hint: null,
    replySan,
  });
});

app.get("/api/lessons", (_req, res) => {
  res.json(lessons);
});

app.get("/api/lessons/:id", (req, res) => {
  const lesson = lessons.find((l) => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  res.json(lesson);
});

app.get("/api/watch", (_req, res) => {
  res.json(featuredGames);
});

app.get("/api/leaderboard", (_req, res) => {
  res.json(leaderboard);
});

app.post("/api/games", (req, res) => {
  const { mode = "computer", botId = "easy", color = "white", timeControl = 600 } = req.body || {};
  const bot = bots.find((b) => b.id === botId) || bots[1];
  const playerColor = color === "black" ? "black" : color === "random" ? (Math.random() < 0.5 ? "white" : "black") : "white";
  const chess = new Chess();
  const record = {
    id: uuid(),
    mode,
    bot,
    playerColor,
    difficulty: bot.difficulty,
    timeControl: Number(timeControl) || 600,
    whiteClock: Number(timeControl) || 600,
    blackClock: Number(timeControl) || 600,
    fen: chess.fen(),
    status: "active",
    winner: null,
    createdAt: Date.now(),
  };

  if (mode === "computer" && playerColor === "black") {
    const aiMove = findBestMove(record.fen, record.difficulty);
    if (aiMove) {
      chess.move(aiMove);
      record.fen = chess.fen();
    }
  }

  games.set(record.id, record);
  res.status(201).json(gamePayload(record));
});

app.get("/api/games/:id", (req, res) => {
  const record = games.get(req.params.id);
  if (!record) return res.status(404).json({ error: "Game not found" });
  res.json(gamePayload(record));
});

app.post("/api/games/:id/move", (req, res) => {
  const record = games.get(req.params.id);
  if (!record) return res.status(404).json({ error: "Game not found" });
  if (record.status !== "active") return res.status(400).json({ error: "Game is over" });

  const chess = new Chess(record.fen);
  const { from, to, promotion } = req.body || {};
  const moved = chess.move({ from, to, promotion: promotion || "q" });
  if (!moved) return res.status(400).json({ error: "Illegal move" });

  record.fen = chess.fen();
  finishComputer(record, chess);

  let aiMove = null;
  if (record.mode === "computer" && record.status === "active") {
    aiMove = findBestMove(record.fen, record.difficulty);
    if (aiMove) {
      chess.move(aiMove);
      record.fen = chess.fen();
      finishComputer(record, chess);
    }
  }

  res.json({ ...gamePayload(record), lastPlayerMove: moved, lastAiMove: aiMove });
});

app.post("/api/games/:id/ai", (req, res) => {
  const record = games.get(req.params.id);
  if (!record) return res.status(404).json({ error: "Game not found" });
  const chess = new Chess(record.fen);
  const aiMove = findBestMove(record.fen, record.difficulty);
  if (!aiMove) return res.status(400).json({ error: "No legal moves" });
  chess.move(aiMove);
  record.fen = chess.fen();
  finishComputer(record, chess);
  res.json({ ...gamePayload(record), lastAiMove: aiMove });
});

app.post("/api/games/:id/resign", (req, res) => {
  const record = games.get(req.params.id);
  if (!record) return res.status(404).json({ error: "Game not found" });
  record.status = "finished";
  record.winner = record.playerColor === "white" ? "black" : "white";
  res.json(gamePayload(record));
});

app.get("/api/legal/:id/:square", (req, res) => {
  const record = games.get(req.params.id);
  if (!record) return res.status(404).json({ error: "Game not found" });
  const chess = new Chess(record.fen);
  const moves = chess.moves({ square: req.params.square, verbose: true });
  res.json(moves);
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, methods: ["GET", "POST"] },
  path: "/socket.io",
});

function emitRoom(room) {
  if (room.whiteSid) io.to(room.whiteSid).emit("game", livePayload(room, "white"));
  if (room.blackSid) io.to(room.blackSid).emit("game", livePayload(room, "black"));
}

io.on("connection", (socket) => {
  socket.on("findMatch", ({ name, timeControl } = {}) => {
    const paired = live.enqueue({ sid: socket.id, name: name || "Player", timeControl });
    if (!paired) {
      socket.data.searching = true;
      socket.emit("searching", { queued: live.queueSize(), timeControl: Number(timeControl) || 600 });
      return;
    }
    const { room, host, guest } = paired;
    const hostSocket = io.sockets.sockets.get(host.sid);
    if (!hostSocket) {
      live.rooms.delete(room.code);
      socket.data.searching = true;
      live.enqueue({ sid: socket.id, name: guest.name, timeControl });
      socket.emit("searching", { queued: live.queueSize(), timeControl: Number(timeControl) || 600 });
      return;
    }
    live.seat(room, host.sid, host.name, "white");
    hostSocket.data.roomCode = room.code;
    hostSocket.data.searching = false;
    hostSocket.join(room.code);
    live.seat(room, guest.sid, guest.name, "black");
    socket.data.roomCode = room.code;
    socket.data.searching = false;
    socket.join(room.code);
    room.status = "active";
    room.lastTick = Date.now();
    emitRoom(room);
  });

  socket.on("cancelSearch", () => {
    live.leaveQueue(socket.id);
    socket.data.searching = false;
    socket.emit("searchCanceled");
  });

  socket.on("createRoom", ({ name, timeControl, color } = {}) => {
    const room = live.create({ name, timeControl, color });
    const seated = live.seat(room, socket.id, name || "Host", room.hostColor);
    socket.data.roomCode = room.code;
    socket.join(room.code);
    socket.emit("game", livePayload(room, seated));
  });

  socket.on("joinRoom", ({ code, name } = {}) => {
    const room = live.get(code);
    if (!room) return socket.emit("liveError", "Room not found");
    if (room.status === "finished") return socket.emit("liveError", "Game already over");
    const seated = live.seat(room, socket.id, name || "Guest");
    if (!seated) return socket.emit("liveError", "Room is full");
    socket.data.roomCode = room.code;
    socket.join(room.code);
    if (live.bothSeated(room) && room.status === "waiting") {
      room.status = "active";
      room.lastTick = Date.now();
    }
    emitRoom(room);
  });

  socket.on("liveMove", ({ from, to, promotion } = {}) => {
    const room = live.get(socket.data.roomCode);
    if (!room) return socket.emit("liveError", "Room not found");
    if (room.status !== "active") return socket.emit("liveError", "Game is not active");
    const color = live.colorOf(room, socket.id);
    if (!color) return socket.emit("liveError", "You are not in this game");
    const chess = new Chess(room.fen);
    const need = color === "white" ? "w" : "b";
    if (chess.turn() !== need) return socket.emit("liveError", "Not your turn");
    const moved = chess.move({ from, to, promotion: promotion || "q" });
    if (!moved) return socket.emit("liveError", "Illegal move");
    room.fen = chess.fen();
    room.lastTick = Date.now();
    finishIfOver(room, chess);
    emitRoom(room);
  });

  socket.on("liveResign", () => {
    const room = live.get(socket.data.roomCode);
    if (!room) return;
    const color = live.colorOf(room, socket.id);
    if (!color || room.status === "finished") return;
    room.status = "finished";
    room.winner = color === "white" ? "black" : "white";
    emitRoom(room);
  });

  socket.on("disconnect", () => {
    live.leaveQueue(socket.id);
    const room = live.get(socket.data.roomCode);
    if (!room) return;
    const color = live.colorOf(room, socket.id);
    live.drop(room, socket.id);
    if (!live.rooms.has(room.code)) return;
    if (room.status === "active" && color) {
      room.status = "finished";
      room.winner = color === "white" ? "black" : "white";
    }
    emitRoom(room);
    io.to(room.code).emit("opponentLeft");
  });
});

setInterval(() => {
  const updates = live.tick();
  for (const room of updates) emitRoom(room);
}, 1000);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Chess Arena API on ${PORT}`);
});
