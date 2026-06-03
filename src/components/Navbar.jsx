import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">
          WC<span>2026</span> — Predictions
        </span>
        {user && (
          <ul className="navbar-nav">
            <li>
              <NavLink to="/matches" className={({ isActive }) => isActive ? 'active' : ''}>
                Matches
              </NavLink>
            </li>
            <li>
              <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>
                Leaderboard
              </NavLink>
            </li>
            <li>
              <button onClick={logout}>Sign out</button>
            </li>
          </ul>
        )}
      </div>
    </nav>
  )
}
