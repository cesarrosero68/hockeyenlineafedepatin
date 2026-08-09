ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS clock_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS clock_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS clock_offset_ms bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_period integer NOT NULL DEFAULT 1;