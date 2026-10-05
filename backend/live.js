const { Chess, serializeGame } = require("./engine");

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  return s;
}

function livePayload(room, color) {
  const chess = new Chess(room.fen);
  return {
    id: room.id,
    code: room.code,
    mode: "live",
    playerColor: color,
    whiteName: room.whiteName,
    blackName: room.blackName,
    timeControl: room.timeControl,
    whiteClock: room.whiteClock,
    blackClock: room.blackClock,
    status: room.status,
    winner: room.winner,
    waiting: room.status === "waiting",
    createdAt: room.createdAt,
    ...serializeGame(chess),
  };
}

function finishIfOver(room, chess) {
  if (!chess.game_over()) return;
  room.status = "finished";
  if (chess.in_checkmate()) {
    room.winner = chess.turn() === "w" ? "black" : "white";
  } else {
    room.winner = "draw";
  }
}

class LiveRooms {
  constructor() {
    this.rooms = new Map();
    this.queue = [];
  }

  create({ name, timeControl, color }) {
    let code = makeCode();
    while (this.rooms.has(code)) code = makeCode();
    const hostColor = color === "black" ? "black" : "white";
    const seconds = Number(timeControl) || 600;
    const room = {
      id: code,
      code,
      fen: new Chess().fen(),
      status: "waiting",
      winner: null,
      timeControl: seconds,
      whiteClock: seconds,
      blackClock: seconds,
      lastTick: Date.now(),
      whiteName: hostColor === "white" ? name || "White" : null,
      blackName: hostColor === "black" ? name || "Black" : null,
      whiteSid: null,
      blackSid: null,
      hostColor,
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code || "").toUpperCase());
  }

  seat(room, sid, name, prefer) {
    const display = name || "Player";
    if (prefer === "white" && !room.whiteSid) {
      room.whiteSid = sid;
      room.whiteName = display;
      return "white";
    }
    if (prefer === "black" && !room.blackSid) {
      room.blackSid = sid;
      room.blackName = display;
      return "black";
    }
    if (!room.whiteSid) {
      room.whiteSid = sid;
      room.whiteName = display;
      return "white";
    }
    if (!room.blackSid) {
      room.blackSid = sid;
      room.blackName = display;
      return "black";
    }
    return null;
  }

  colorOf(room, sid) {
    if (room.whiteSid === sid) return "white";
    if (room.blackSid === sid) return "black";
    return null;
  }

  bothSeated(room) {
    return Boolean(room.whiteSid && room.blackSid);
  }

  drop(room, sid) {
    if (room.whiteSid === sid) room.whiteSid = null;
    if (room.blackSid === sid) room.blackSid = null;
    if (!room.whiteSid && !room.blackSid) this.rooms.delete(room.code);
  }

  enqueue({ sid, name, timeControl }) {
    this.leaveQueue(sid);
    const seconds = Number(timeControl) || 600;
    const opponent = this.queue.find((p) => p.timeControl === seconds && p.sid !== sid);
    if (opponent) {
      this.queue = this.queue.filter((p) => p.sid !== opponent.sid);
      const hostFirst = Math.random() < 0.5;
      const room = this.create({
        name: hostFirst ? opponent.name : name,
        timeControl: seconds,
        color: "white",
      });
      return { room, host: opponent, guest: { sid, name: name || "Player" } };
    }
    this.queue.push({ sid, name: name || "Player", timeControl: seconds, joinedAt: Date.now() });
    return null;
  }

  leaveQueue(sid) {
    this.queue = this.queue.filter((p) => p.sid !== sid);
  }

  queueSize() {
    return this.queue.length;
  }

  tick() {
    const now = Date.now();
    const updates = [];
    for (const room of this.rooms.values()) {
      if (room.status !== "active") continue;
      const elapsed = Math.floor((now - room.lastTick) / 1000);
      if (elapsed < 1) continue;
      room.lastTick += elapsed * 1000;
      const chess = new Chess(room.fen);
      const key = chess.turn() === "w" ? "whiteClock" : "blackClock";
      room[key] = Math.max(0, room[key] - elapsed);
      if (room[key] === 0) {
        room.status = "finished";
        room.winner = chess.turn() === "w" ? "black" : "white";
      }
      updates.push(room);
    }
    return updates;
  }
}

module.exports = { LiveRooms, livePayload, finishIfOver };
