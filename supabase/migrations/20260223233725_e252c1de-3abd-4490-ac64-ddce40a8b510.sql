-- Enable realtime for matches, goal_events, penalties, standings_aggregate, fair_play_aggregate
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goal_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.penalties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.standings_aggregate;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fair_play_aggregate;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_teams;