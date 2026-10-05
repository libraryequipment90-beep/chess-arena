async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  health: () => request("/api/health"),
  bots: () => request("/api/bots"),
  puzzles: () => request("/api/puzzles"),
  puzzle: (id) => request(`/api/puzzles/${id}`),
  solvePuzzle: (id, body) =>
    request(`/api/puzzles/${id}/solve`, { method: "POST", body: JSON.stringify(body) }),
  lessons: () => request("/api/lessons"),
  lesson: (id) => request(`/api/lessons/${id}`),
  watch: () => request("/api/watch"),
  leaderboard: () => request("/api/leaderboard"),
  createGame: (body) => request("/api/games", { method: "POST", body: JSON.stringify(body) }),
  game: (id) => request(`/api/games/${id}`),
  move: (id, body) => request(`/api/games/${id}/move`, { method: "POST", body: JSON.stringify(body) }),
  resign: (id) => request(`/api/games/${id}/resign`, { method: "POST" }),
  legal: (id, square) => request(`/api/legal/${id}/${square}`),
};
