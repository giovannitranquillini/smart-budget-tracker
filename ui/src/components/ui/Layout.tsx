// src/components/ui/Layout.tsx
import type { ReactNode } from 'react'
import logo from '../../assets/logo.svg'
import Navbar from './Navbar'
import Footer from './Footer'

type LayoutProps = {
  children: ReactNode
}

/** Frame shared by every page: navbar, centered content and footer. */
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafbff] text-slate-900">
      <Navbar title="Smart Budget Tracker" icon={<img src={logo} alt="" className="h-6 w-6" />} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>

      <Footer />
    </div>
  )
}
