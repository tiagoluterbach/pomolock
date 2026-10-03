import { createClient } from '@/lib/supabase/client'

/** Start the Google OAuth flow; the user returns to `next` after signing in. */
export async function signInWithGoogle(next = '/') {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
    })
}

/** Sign out and reload `redirectTo` so every store starts from a clean state. */
export async function signOut(redirectTo = '/') {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = redirectTo
}
