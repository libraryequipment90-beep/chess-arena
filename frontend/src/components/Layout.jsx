import { NavLink, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Home", icon: "⌂" },
  { to: "/play", label: "Play", icon: "♟" },
  { to: "/puzzles", label: "Puzzles", icon: "♞" },
  { to: "/learn", label: "Learn", icon: "♖" },
  { to: "/watch", label: "Watch", icon: "♔" },
  { to: "/community", label: "Club", icon: "♟♟" },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">C</div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `nav-item ${isActive || (l.to !== "/" && pathname.startsWith(l.to)) ? "active" : ""}`
            }
          >
            <span className="icon">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
