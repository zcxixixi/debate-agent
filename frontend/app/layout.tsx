import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '辩论代理 | AI驱动的决策助手',
  description: '让AI为您深入分析问题的正反两面，做出更明智的决策',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className="bg-zinc-50 text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  )
}