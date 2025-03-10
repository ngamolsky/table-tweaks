-- Add indexes for game filtering
CREATE INDEX IF NOT EXISTS idx_games_min_players ON public.games USING btree (min_players);
CREATE INDEX IF NOT EXISTS idx_games_max_players ON public.games USING btree (max_players);
CREATE INDEX IF NOT EXISTS idx_games_bgg_rating ON public.games USING btree (bgg_rating);
CREATE INDEX IF NOT EXISTS idx_games_bgg_weight ON public.games USING btree (bgg_weight);

-- Add a combined index for player count range queries
CREATE INDEX IF NOT EXISTS idx_games_player_count_range ON public.games USING btree (min_players, max_players);
