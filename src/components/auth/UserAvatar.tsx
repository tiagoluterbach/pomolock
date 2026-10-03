import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'

/** Google avatar, or the first letter of the name/email when there is none. */
export function UserAvatar({ user, className }: { user: User; className?: string }) {
    const avatarUrl = user.user_metadata?.avatar_url as string | undefined
    if (avatarUrl) {
        // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar, tiny and already sized
        return <img src={avatarUrl} alt="Avatar" className={cn('rounded-full ring-2 ring-white/20', className)} />
    }

    const initial = (user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()
    return (
        <div className={cn('rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold', className)}>
            {initial}
        </div>
    )
}
