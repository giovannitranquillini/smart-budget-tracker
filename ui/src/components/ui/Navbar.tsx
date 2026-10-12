// src/components/ui/Navbar.tsx
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'

type NavbarProps = {
  title: string
  icon: ReactNode
}

const LINKS = [
  { to: '/', label: 'Transactions' },
  { to: '/categories', label: 'Categories' },
]

export default function Navbar({ title, icon }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-indigo-600">{icon}</span>
          <span className="hidden text-lg font-semibold text-slate-900 sm:inline">{title}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              // Without "end", "/" would stay active on every page.
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
