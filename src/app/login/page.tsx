'use client'

import Link from 'next/link'
import { Timer } from 'lucide-react'
import { signInWithGoogle } from '@/lib/auth'
import { GoogleIcon } from '@/components/auth/GoogleIcon'

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#1A1B24] flex items-center justify-center px-4">
            <div className="w-full max-w-sm space-y-8">
                {/* Logo */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <Timer className="h-8 w-8 text-[#e74c6f]" />
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            PomoLock
                        </h1>
                    </div>
                    <p className="text-zinc-500 text-sm">
                        Sign in to sync your settings and sessions across devices
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/60 rounded-2xl p-6 space-y-6">
                    <button
                        onClick={() => signInWithGoogle('/')}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-800 font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98] cursor-pointer"
                    >
                        <GoogleIcon className="h-5 w-5" />
                        Continue with Google
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-zinc-900/60 px-3 text-xs text-zinc-600">
                                or
                            </span>
                        </div>
                    </div>

                    <Link
                        href="/"
                        className="block w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
                    >
                        Continue without an account
                    </Link>
                </div>

                <p className="text-center text-xs text-zinc-600">
                    Your data stays on this device until you sign in.
                    <br />
                    Signing in enables cloud sync across devices.
                </p>
            </div>
        </div>
    )
}
