
-- Rename Rabbits to AVS-Rabbits Azul in Sub-10
UPDATE public.teams SET name = 'AVS-Rabbits Azul' WHERE id = '6e1c8e7c-427d-474a-b828-8eb92a391043';

-- Create AVS-Rabbits Blanco team in Sub-10
INSERT INTO public.teams (name, category_id, club_id)
VALUES ('AVS-Rabbits Blanco', '3898cbda-c120-48d4-91a4-fdfc80e16c79', 'f7300984-ad94-49a1-8241-96188e0eb573');

-- Create standings_aggregate entry for new team
INSERT INTO public.standings_aggregate (team_id, category_id)
SELECT id, category_id FROM public.teams WHERE name = 'AVS-Rabbits Blanco' AND category_id = '3898cbda-c120-48d4-91a4-fdfc80e16c79';
