'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { deleteCloudSessions } from '@/lib/syncController'
import { useTimerStore } from '@/stores/timerStore'
import { BarChart3, Timer, Settings, LogIn, LogOut, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Navbar() {
    const { user } = useUser()
    const resetStats = useTimerStore((s) => s.resetStats)
    const [showDropdown, setShowDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

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

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        setShowDropdown(false)
        window.location.href = '/'
    }

    const handleResetStats = async () => {
        if (window.confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            resetStats()
            localStorage.removeItem('pomodoro-timer-storage')
            // Also delete sessions from Supabase
            await deleteCloudSessions()
            setShowDropdown(false)
            window.location.reload()
        }
    }

    // Let clicks pass through the transparent space when page content scrolls underneath.
    return (
        <nav className="pointer-events-none fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between">
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
                            {user.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt="Avatar"
                                    className="h-7 w-7 rounded-full ring-2 ring-white/20"
                                />
                            ) : (
                                <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold text-xs">
                                    {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                                </div>
                            )}
                        </button>

                        {/* Dropdown menu */}
                        {showDropdown && (
                            <div className="absolute right-0 top-12 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/40 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                                    onClick={handleLogout}
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
