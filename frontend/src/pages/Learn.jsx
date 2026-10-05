import { useEffect, useState } from "react";
import { api } from "../api";

export default function Learn() {
  const [lessons, setLessons] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.lessons().then(async (rows) => {
      setLessons(rows);
      if (rows[0]) setOpen(await api.lesson(rows[0].id));
    });
  }, []);

  async function select(id) {
    setOpen(await api.lesson(id));
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Learn</h1>
          <p>Short lessons covering pieces, tactics, openings, and endgames.</p>
        </div>
      </div>
      <div className="play-layout">
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          {lessons.map((l) => (
            <div
              key={l.id}
              className={`card ${open?.id === l.id ? "" : ""}`}
              onClick={() => select(l.id)}
              style={{
                cursor: "pointer",
                outline: open?.id === l.id ? "2px solid var(--green)" : "none",
              }}
            >
              <span className="tag">{l.level}</span>
              <h3>{l.title}</h3>
              <p>
                {l.summary} · {l.minutes} min
              </p>
            </div>
          ))}
        </div>
        <div className="side-panel">
          {open && (
            <>
              <span className="tag gold">{open.level}</span>
              <h3>{open.title}</h3>
              <p className="muted" style={{ marginBottom: 12 }}>
                {open.minutes} minutes
              </p>
              <ul className="lesson-body">
                {open.content.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
