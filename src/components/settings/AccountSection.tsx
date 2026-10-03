'use client'

import { Cloud, CloudOff, LogOut } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { signInWithGoogle, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/auth/GoogleIcon'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { SettingsSection } from './SettingsSection'

export function AccountSection() {
    const { user, loading } = useUser()

    return (
        <SettingsSection title="Account">
            {loading ? (
                <div className="flex items-center gap-3 py-2">
                    <div className="h-10 w-10 rounded-full bg-zinc-800 animate-pulse" />
                    <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-3 w-48 bg-zinc-800 rounded animate-pulse" />
                    </div>
                </div>
            ) : user ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <UserAvatar user={user} className="h-10 w-10 text-sm ring-zinc-700" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user.user_metadata?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                            <Cloud className="h-3.5 w-3.5" />
                            <span>Synced</span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => signOut('/settings')}
                        className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <CloudOff className="h-3.5 w-3.5" />
                        <span>Local only — sign in to sync across devices</span>
                    </div>
                    <button
                        onClick={() => signInWithGoogle('/settings')}
                        className="flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-800 font-medium py-2.5 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98] text-sm cursor-pointer"
                    >
                        <GoogleIcon className="h-4 w-4" />
                        Sign in with Google
                    </button>
                </div>
            )}
        </SettingsSection>
    )
}
