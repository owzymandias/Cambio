CREATE TYPE "public"."card_visibility" AS ENUM('hidden', 'visible', 'peeking');--> statement-breakpoint
CREATE TYPE "public"."draw_source" AS ENUM('deck', 'discard');--> statement-breakpoint
CREATE TYPE "public"."game_phase" AS ENUM('setup', 'initial_view', 'playing', 'final_round', 'completed');--> statement-breakpoint
CREATE TYPE "public"."player_type" AS ENUM('human', 'bot');--> statement-breakpoint
CREATE TYPE "public"."special_power_type" AS ENUM('peek_own', 'peek_opponent', 'blind_swap', 'look_own', 'none');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"category" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"ip_address" text,
	"user_agent" text,
	"status" text DEFAULT 'success' NOT NULL,
	"details" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'incomplete',
	"period_start" timestamp,
	"period_end" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"seats" integer
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"stripe_customer_id" text,
	"polar_customer_id" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file" (
	"id" uuid PRIMARY KEY NOT NULL,
	"original_name" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_type" text NOT NULL,
	"size" integer NOT NULL,
	"path" text NOT NULL,
	"url" text,
	"storage_provider" text NOT NULL,
	"uploaded_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"owner_id" uuid,
	"suit" text NOT NULL,
	"rank" text NOT NULL,
	"point_value" integer NOT NULL,
	"position_row" integer,
	"position_col" integer,
	"visibility" "card_visibility" DEFAULT 'hidden' NOT NULL,
	"location" text DEFAULT 'deck' NOT NULL,
	"order_in_pile" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"final_score" integer NOT NULL,
	"is_cambio_caller" boolean DEFAULT false NOT NULL,
	"penalty_applied" boolean DEFAULT false NOT NULL,
	"is_winner" boolean DEFAULT false NOT NULL,
	"cards_summary" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase" "game_phase" DEFAULT 'setup' NOT NULL,
	"current_turn_player_id" uuid,
	"cambio_caller_id" uuid,
	"winner_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"user_id" uuid,
	"display_name" text NOT NULL,
	"type" "player_type" DEFAULT 'human' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"turn_order" integer NOT NULL,
	"is_connected" boolean DEFAULT true NOT NULL,
	"has_viewed_initial_cards" boolean DEFAULT false NOT NULL,
	"bot_memory" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_power" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"turn_id" uuid NOT NULL,
	"activated_by_id" uuid NOT NULL,
	"power_type" "special_power_type" NOT NULL,
	"target_card_id" uuid,
	"target_player_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"action" text NOT NULL,
	"draw_source" "draw_source",
	"card_drawn_id" uuid,
	"old_card_id" uuid,
	"new_card_id" uuid,
	"special_power_type" "special_power_type",
	"target_card_id" uuid,
	"target_player_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_game_session_id_game_session_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_owner_id_player_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."player"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_score" ADD CONSTRAINT "game_score_game_session_id_game_session_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_score" ADD CONSTRAINT "game_score_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_game_session_id_game_session_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_power" ADD CONSTRAINT "special_power_game_session_id_game_session_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_power" ADD CONSTRAINT "special_power_turn_id_turn_id_fk" FOREIGN KEY ("turn_id") REFERENCES "public"."turn"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_power" ADD CONSTRAINT "special_power_activated_by_id_player_id_fk" FOREIGN KEY ("activated_by_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_power" ADD CONSTRAINT "special_power_target_card_id_card_id_fk" FOREIGN KEY ("target_card_id") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_power" ADD CONSTRAINT "special_power_target_player_id_player_id_fk" FOREIGN KEY ("target_player_id") REFERENCES "public"."player"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn" ADD CONSTRAINT "turn_game_session_id_game_session_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn" ADD CONSTRAINT "turn_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn" ADD CONSTRAINT "turn_card_drawn_id_card_id_fk" FOREIGN KEY ("card_drawn_id") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn" ADD CONSTRAINT "turn_old_card_id_card_id_fk" FOREIGN KEY ("old_card_id") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn" ADD CONSTRAINT "turn_new_card_id_card_id_fk" FOREIGN KEY ("new_card_id") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn" ADD CONSTRAINT "turn_target_card_id_card_id_fk" FOREIGN KEY ("target_card_id") REFERENCES "public"."card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn" ADD CONSTRAINT "turn_target_player_id_player_id_fk" FOREIGN KEY ("target_player_id") REFERENCES "public"."player"("id") ON DELETE set null ON UPDATE no action;