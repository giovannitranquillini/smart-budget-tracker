// src/components/ui/Navbar.tsx
import type { ReactNode } from 'react'
import { PlusIcon } from './icons'

type NavbarProps = {
  title: string
  icon: ReactNode
  actionLabel: string
  onAction: () => void
}

export default function Navbar({ title, icon, actionLabel, onAction }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-indigo-600">{icon}</span>
          <span className="text-lg font-semibold text-slate-900">{title}</span>
        </div>

        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          title={actionLabel}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{actionLabel}</span>
        </button>
      </div>
    </header>
  )
}
