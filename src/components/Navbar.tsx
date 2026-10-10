'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { signOut } from '@/lib/auth'
import { confirmAndResetStatistics } from '@/lib/syncController'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { BarChart3, Timer, Settings, LogIn, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Navbar() {
    const { user } = useUser()
    const [showDropdown, setShowDropdown] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Frost the bar only once content scrolls under it, like a macOS toolbar.
    useEffect(() => {
        const update = () => setScrolled(window.scrollY > 4)
        update()
        window.addEventListener('scroll', update, { passive: true })
        return () => window.removeEventListener('scroll', update)
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showDropdown])

    const handleResetStats = () => {
        setShowDropdown(false)
        confirmAndResetStatistics()
    }

    // Let clicks pass through the transparent space when page content scrolls underneath.
    return (
        <nav
            className={cn(
                'pointer-events-none fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-[var(--ease-apple)]',
                scrolled
                    ? 'bg-[#1A1B24]/70 border-white/5 backdrop-blur-xl backdrop-saturate-150'
                    : 'bg-transparent border-transparent',
            )}
        >
            <Link
                href="/"
                className="pointer-events-auto flex items-center gap-2 text-white/90 hover:text-white transition-colors"
            >
                <Timer className="h-5 w-5" />
                <span className="font-bold text-lg tracking-tight hidden sm:inline">
                    PomoLock
                </span>
            </Link>

            <div className="pointer-events-auto flex items-center gap-1">
                <Link href="/dashboard">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full cursor-pointer"
                        aria-label="Dashboard"
                    >
                        <BarChart3 className="h-5 w-5" />
                    </Button>
                </Link>

                <Link href="/settings">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full cursor-pointer"
                        aria-label="Settings"
                    >
                        <Settings className="h-5 w-5" />
                    </Button>
                </Link>

                {user ? (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="h-10 w-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:ring-2 hover:ring-white/20"
                            aria-label="Account menu"
                        >
                            <UserAvatar user={user} className="h-7 w-7 text-xs" />
                        </button>

                        {/* Dropdown menu */}
                        {showDropdown && (
                            <div className="absolute right-0 top-12 w-56 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/40 py-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-200 ease-[var(--ease-apple)] origin-top-right">
                                {/* User info */}
                                <div className="px-3 py-2 border-b border-zinc-800">
                                    <p className="text-sm font-medium text-white truncate">
                                        {user.user_metadata?.full_name || 'User'}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {user.email}
                                    </p>
                                </div>

                                {/* Reset stats */}
                                <button
                                    onClick={handleResetStats}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Reset Statistics
                                </button>

                                {/* Logout */}
                                <button
                                    onClick={() => signOut('/')}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href="/login">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/70 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full cursor-pointer"
                            aria-label="Login"
                        >
                            <LogIn className="h-5 w-5" />
                        </Button>
                    </Link>
                )}
            </div>
        </nav>
    )
}
