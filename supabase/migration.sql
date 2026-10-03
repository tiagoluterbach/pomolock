-- ==========================================
-- Supabase Migration: user_settings + focus_sessions
-- Apply via Supabase Dashboard > SQL Editor
-- or via Supabase CLI: supabase db push
-- ==========================================

-- user_settings: stores user preferences (timer config, colors, etc.)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- focus_sessions: history of completed pomodoro sessions
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL,
    actual_duration_seconds INT NOT NULL,
    hyperfocus_seconds INT NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions" ON public.focus_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.focus_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Needed by "Reset Statistics": without it RLS silently deletes nothing
CREATE POLICY "Users can delete own sessions" ON public.focus_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Index for querying sessions by user and date range
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_started
    ON public.focus_sessions(user_id, started_at DESC);
