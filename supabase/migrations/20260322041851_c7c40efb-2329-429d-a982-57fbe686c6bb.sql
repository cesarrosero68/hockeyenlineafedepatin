ALTER TABLE public.penalties ALTER COLUMN penalty_minutes TYPE numeric USING penalty_minutes::numeric;
ALTER TABLE public.penalties ALTER COLUMN penalty_minutes SET DEFAULT 2;

-- Fix existing 1:30 penalties that were incorrectly stored as 2
-- We can't distinguish them from actual 2-minute penalties, so leave existing data as-is