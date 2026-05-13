import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-[32px] border border-white/10 bg-slate-950/95 p-10 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  )
}
