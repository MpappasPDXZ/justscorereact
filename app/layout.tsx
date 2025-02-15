import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Header from "./components/Header"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Digital Scorekeeper",
  description: "Manage your teams and score games digitally",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  )
}

