"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import type React from "react"

const Header = () => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)

  return (
    <header className="bg-[#252623] text-gray-100 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold">
            Digital Scorekeeper
          </Link>
          <nav className="hidden md:flex space-x-4">
            <NavLink href="/manage-team">Manage Team</NavLink>
            <NavLink href="/manage-team">Score a Game</NavLink>
          </nav>
          <button className="md:hidden" onClick={toggleMenu}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-[#252623]">
          <nav className="px-2 pt-2 pb-4 space-y-1">
            <MobileNavLink href="/manage-team" onClick={toggleMenu}>
              Manage Teams
            </MobileNavLink>
            <MobileNavLink href="/manage-team" onClick={toggleMenu}>
              Score a Game
            </MobileNavLink>
          </nav>
        </div>
      )}
    </header>
  )
}

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-gray-200 hover:text-gray-100 transition-colors duration-300">
    {children}
  </Link>
)

const MobileNavLink = ({
  href,
  children,
  onClick,
}: { href: string; children: React.ReactNode; onClick: () => void }) => (
  <Link
    href={href}
    className="block px-3 py-2 rounded-md text-base font-medium text-gray-200 hover:text-white hover:bg-gray-700"
    onClick={onClick}
  >
    {children}
  </Link>
)

export default Header

