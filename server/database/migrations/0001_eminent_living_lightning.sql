ALTER TABLE "player" ADD COLUMN "has_taken_final_turn" boolean DEFAULT false NOT NULL;

-- Performance indexes for game completion features
CREATE INDEX "idx_player_final_turn" ON "player"("game_session_id", "has_taken_final_turn") WHERE "has_taken_final_turn" = false;
CREATE INDEX "idx_game_score_game" ON "game_score"("game_session_id");
CREATE INDEX "idx_special_power_game" ON "special_power"("game_session_id", "created_at");