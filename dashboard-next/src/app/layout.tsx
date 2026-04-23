import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/nav/Sidebar'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Running Analytics',
  description: 'Personal running data dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </body>
    </html>
  )
}
