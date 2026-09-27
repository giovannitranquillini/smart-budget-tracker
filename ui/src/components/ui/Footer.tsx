// src/components/ui/Footer.tsx
import { GithubIcon, GlobeIcon } from './icons'

const GITHUB_URL = 'https://github.com/giovannitranquillini'
const WEBSITE_URL = 'https://giovannitranquillini.it'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/60">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-6 py-5 sm:flex-row">
        <span className="text-xs text-slate-500">
          © {new Date().getFullYear()} Smart Budget Tracker
        </span>

        <nav className="flex items-center gap-4">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-indigo-600"
          >
            <GithubIcon className="h-4 w-4" />
            GitHub
          </a>

          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-slate-600 transition hover:text-indigo-600"
          >
            <GlobeIcon className="h-4 w-4" />
            Website
          </a>
        </nav>
      </div>
    </footer>
  )
}
