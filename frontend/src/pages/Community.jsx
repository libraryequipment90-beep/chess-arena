import { useEffect, useState } from "react";
import { api } from "../api";

export default function Community() {
  const [board, setBoard] = useState([]);

  useEffect(() => {
    api.leaderboard().then(setBoard).catch(() => {});
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Club</h1>
          <p>Leaderboard of the Chess Arena club. Play bots to climb locally.</p>
        </div>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Rating</th>
              <th>Wins</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {board.map((row) => (
              <tr key={row.rank}>
                <td>{row.rank}</td>
                <td>{row.name}</td>
                <td>{row.rating}</td>
                <td>{row.wins}</td>
                <td>{row.country}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
