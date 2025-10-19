import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth'

// Enums for game-related fields
export const gamePhaseEnum = pgEnum('game_phase', ['setup', 'initial_view', 'playing', 'final_round', 'completed'])
export const playerTypeEnum = pgEnum('player_type', ['human', 'bot'])
export const drawSourceEnum = pgEnum('draw_source', ['deck', 'discard'])
export const specialPowerTypeEnum = pgEnum('special_power_type', ['peek_own', 'peek_opponent', 'blind_swap', 'look_own', 'none'])
export const cardVisibilityEnum = pgEnum('card_visibility', ['hidden', 'visible', 'peeking'])

// Game Session table
export const gameSession = pgTable('game_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  phase: gamePhaseEnum('phase').notNull().default('setup'),
  currentTurnPlayerId: uuid('current_turn_player_id'),
  cambioCallerId: uuid('cambio_caller_id'),
  winnerId: uuid('winner_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  completedAt: timestamp('completed_at'),
})

// Player table (can be linked to user or anonymous)
export const player = pgTable('player', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameSessionId: uuid('game_session_id')
    .notNull()
    .references(() => gameSession.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
  displayName: text('display_name').notNull(),
  type: playerTypeEnum('type').notNull().default('human'),
  score: integer('score').notNull().default(0),
  turnOrder: integer('turn_order').notNull(),
  isConnected: boolean('is_connected').notNull().default(true),
  hasViewedInitialCards: boolean('has_viewed_initial_cards').notNull().default(false),
  botMemory: jsonb('bot_memory'), // Store bot's card memory and strategy state
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

// Card table
export const card = pgTable('card', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameSessionId: uuid('game_session_id')
    .notNull()
    .references(() => gameSession.id, { onDelete: 'cascade' }),
  ownerId: uuid('owner_id').references(() => player.id, { onDelete: 'set null' }),
  suit: text('suit').notNull(), // 'hearts', 'diamonds', 'clubs', 'spades'
  rank: text('rank').notNull(), // 'A', '2'-'10', 'J', 'Q', 'K'
  pointValue: integer('point_value').notNull(),
  positionRow: integer('position_row'), // 0 or 1 for 2x2 grid
  positionCol: integer('position_col'), // 0 or 1 for 2x2 grid
  visibility: cardVisibilityEnum('visibility').notNull().default('hidden'),
  location: text('location').notNull().default('deck'), // 'deck', 'hand', 'discard'
  orderInPile: integer('order_in_pile'), // For deck/discard pile ordering
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

// Turn history table
export const turn = pgTable('turn', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameSessionId: uuid('game_session_id')
    .notNull()
    .references(() => gameSession.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id')
    .notNull()
    .references(() => player.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // 'draw', 'swap', 'discard', 'cambio', 'power'
  drawSource: drawSourceEnum('draw_source'),
  cardDrawnId: uuid('card_drawn_id').references(() => card.id, { onDelete: 'set null' }),
  oldCardId: uuid('old_card_id').references(() => card.id, { onDelete: 'set null' }),
  newCardId: uuid('new_card_id').references(() => card.id, { onDelete: 'set null' }),
  specialPowerType: specialPowerTypeEnum('special_power_type'),
  targetCardId: uuid('target_card_id').references(() => card.id, { onDelete: 'set null' }),
  targetPlayerId: uuid('target_player_id').references(() => player.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata'), // Additional turn data
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Special Power activations table (for tracking power usage)
export const specialPower = pgTable('special_power', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameSessionId: uuid('game_session_id')
    .notNull()
    .references(() => gameSession.id, { onDelete: 'cascade' }),
  turnId: uuid('turn_id')
    .notNull()
    .references(() => turn.id, { onDelete: 'cascade' }),
  activatedById: uuid('activated_by_id')
    .notNull()
    .references(() => player.id, { onDelete: 'cascade' }),
  powerType: specialPowerTypeEnum('power_type').notNull(),
  targetCardId: uuid('target_card_id').references(() => card.id, { onDelete: 'set null' }),
  targetPlayerId: uuid('target_player_id').references(() => player.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Game scores table (final scores for completed games)
export const gameScore = pgTable('game_score', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameSessionId: uuid('game_session_id')
    .notNull()
    .references(() => gameSession.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id')
    .notNull()
    .references(() => player.id, { onDelete: 'cascade' }),
  finalScore: integer('final_score').notNull(),
  isCambioCaller: boolean('is_cambio_caller').notNull().default(false),
  penaltyApplied: boolean('penalty_applied').notNull().default(false),
  isWinner: boolean('is_winner').notNull().default(false),
  cardsSummary: jsonb('cards_summary'), // Final cards held by player
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
