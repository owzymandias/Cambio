# Data Model: Core Cambio Game Mechanics

**Feature**: 003-core-game-mechanics
**Date**: 2025-10-20
**Purpose**: Entity definitions, relationships, and database schema for the Cambio card game

---

## Overview

This document defines the data structures for managing game sessions, players, cards, and actions. The model supports real-time multiplayer gameplay, AI bots, reconnection handling, and complete audit trails.

**Design Principles**:
- Server-authoritative: All game state persisted and validated server-side
- Event sourcing lite: Action log enables state reconstruction
- Optimized for reads: In-memory cache for active games
- Type-safe: Drizzle ORM with TypeScript types

---

## Entity Diagram

```
┌─────────────────┐
│  GameSession    │
│  (game state)   │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐         ┌──────────────┐
│  GamePlayer     │◄────────┤  User        │
│  (player in     │  N   1  │  (from Auth) │
│   game session) │         └──────────────┘
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐
│  GameAction     │
│  (event log)    │
└─────────────────┘

┌─────────────────┐
│  GameHistory    │
│  (completed     │
│   games)        │
└─────────────────┘
```

---

## Entities

### 1. GameSession

Represents a single game instance from creation through completion.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique game session ID |
| `room_code` | VARCHAR(6) | UNIQUE, NOT NULL | 6-character room code (uppercase) |
| `status` | ENUM | NOT NULL | Game status: `waiting`, `active`, `final_round`, `completed`, `abandoned` |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Game creation timestamp |
| `started_at` | TIMESTAMP | NULL | When game started (transitions to `active`) |
| `ended_at` | TIMESTAMP | NULL | When game ended (transitions to `completed`) |
| `current_turn` | INTEGER | NULL | Index of current player (0-3), NULL if not started |
| `turn_sequence` | INTEGER | DEFAULT 0 | Increments each turn, tracks game progress |
| `draw_pile` | JSONB | NOT NULL | Array of remaining cards in draw pile |
| `discard_pile` | JSONB | NOT NULL | Array of cards in discard pile (top card visible) |
| `cambio_caller_id` | UUID | NULL, FK → game_players.id | Player who called Cambio (if any) |
| `cambio_called_at` | TIMESTAMP | NULL | When Cambio was called |
| `final_round_turns_remaining` | INTEGER | NULL | Turns left in final round (after Cambio) |
| `winner_id` | UUID | NULL, FK → game_players.id | Winning player ID |
| `max_players` | INTEGER | NOT NULL, DEFAULT 4 | Maximum players (2-4) |
| `min_players` | INTEGER | NOT NULL, DEFAULT 2 | Minimum players to start |

**Indexes**:
- `room_code` (unique, for join lookups)
- `status` (for active game queries)
- `created_at` (for cleanup of abandoned games)

**Validation Rules**:
- `room_code`: Must match pattern `^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$`
- `current_turn`: Must be in range `[0, max_players)` when not NULL
- `max_players`: Between 2 and 4 inclusive
- `draw_pile`: Array of Card objects (see Card structure below)
- `discard_pile`: Array of Card objects

**State Transitions**:
```
waiting → active → final_round → completed
   ↓                                ↓
abandoned ←──────────────────────────┘
```

**Card Structure (JSONB)**:
```typescript
{
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: number // Point value (K=0, A=1, J/Q=10, ranks=face value)
}
```

---

### 2. GamePlayer

Represents a player (human or bot) participating in a game session.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique player instance ID |
| `game_id` | UUID | NOT NULL, FK → game_sessions.id | Associated game session |
| `user_id` | UUID | NULL, FK → users.id | User account (NULL for bots) |
| `position` | INTEGER | NOT NULL | Player position (0-3) in turn order |
| `cards` | JSONB | NOT NULL | Array of 4 cards in player's hand |
| `score` | INTEGER | NULL | Final score (calculated at game end) |
| `is_bot` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether this is an AI bot |
| `bot_difficulty` | ENUM | NULL | Bot difficulty: `easy`, `medium`, `hard` |
| `connection_status` | ENUM | NOT NULL | Connection status: `connected`, `disconnected`, `bot_takeover` |
| `disconnected_at` | TIMESTAMP | NULL | When player disconnected |
| `joined_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | When player joined game |
| `bot_memory` | JSONB | NULL | Bot's memory of revealed cards |

**Indexes**:
- `(game_id, position)` (unique composite, for turn order)
- `(game_id, user_id)` (unique composite, prevent duplicate joins)
- `user_id` (for player history queries)

**Validation Rules**:
- `position`: Must be unique within `game_id`, range [0, 3]
- `cards`: Array of exactly 4 Card objects with `visible_to` array
- `is_bot`: Must be TRUE if `user_id` is NULL
- `bot_difficulty`: Required if `is_bot` is TRUE
- `bot_memory`: Only populated for bots

**Card Structure with Visibility (JSONB)**:
```typescript
{
  rank: '2' | '3' | ... | 'A'
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: number
  position: 0 | 1 | 2 | 3 // Position in 2x2 grid (TL, TR, BL, BR)
  visible_to: string[] // Array of player IDs who can see this card
}
```

**Bot Memory Structure (JSONB)**:
```typescript
{
  own_cards: {
    [position: number]: { rank: string, suit: string, confidence: number }
  }
  opponent_cards: {
    [player_id: string]: {
      [position: number]: { rank: string, suit: string, confidence: number }
    }
  }
  discard_history: Array<{ rank: string, suit: string, timestamp: number }>
}
```

---

### 3. GameAction

Event log capturing all game actions for audit trail and state reconstruction.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique action ID |
| `game_id` | UUID | NOT NULL, FK → game_sessions.id | Associated game session |
| `player_id` | UUID | NULL, FK → game_players.id | Player who performed action (NULL for system) |
| `sequence` | INTEGER | NOT NULL | Action sequence number (increments per game) |
| `action_type` | ENUM | NOT NULL | Type of action (see below) |
| `payload` | JSONB | NOT NULL | Action-specific data |
| `timestamp` | TIMESTAMP | NOT NULL, DEFAULT NOW() | When action occurred |
| `is_validated` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether action passed server validation |

**Indexes**:
- `(game_id, sequence)` (unique composite, for ordered retrieval)
- `game_id` (for game history queries)
- `timestamp` (for temporal queries)

**Action Types**:
- `player_joined`: Player joined game
- `game_started`: Game transitioned to active
- `cards_dealt`: Initial cards dealt to all players
- `card_drawn_deck`: Player drew from deck
- `card_drawn_discard`: Player drew from discard pile
- `card_swapped`: Player swapped drawn card with hand card
- `card_discarded`: Player discarded without swapping
- `power_activated`: Special power triggered
- `power_skipped`: Player declined special power
- `turn_ended`: Turn completed, advanced to next player
- `cambio_called`: Player called Cambio
- `game_ended`: Game completed with winner
- `player_disconnected`: Player connection lost
- `player_reconnected`: Player reconnected
- `bot_takeover`: Bot assumed control of player

**Payload Examples**:

```typescript
// card_drawn_deck
{ card: { rank: '7', suit: 'hearts', value: 7 } }

// card_swapped
{ drawn_card: Card, position: 2, replaced_card: Card }

// power_activated (peek own)
{ power_type: 'peek_own', target_position: 1, revealed_card: Card }

// cambio_called
{ caller_score: 12, final_round_turns: 3 }

// game_ended
{ winner_id: UUID, scores: { [player_id]: number }, duration_seconds: number }
```

**Validation Rules**:
- `sequence`: Must be sequential within `game_id` (no gaps)
- `player_id`: NULL only for system actions (game_started, game_ended)
- `payload`: Structure validated against action_type schema

---

### 4. GameHistory

Denormalized table for completed games, optimized for history queries and statistics.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique history record ID |
| `game_id` | UUID | NOT NULL, FK → game_sessions.id | Original game session |
| `room_code` | VARCHAR(6) | NOT NULL | Room code (denormalized for queries) |
| `winner_id` | UUID | NOT NULL, FK → game_players.id | Winning player |
| `winner_user_id` | UUID | NULL, FK → users.id | Winner's user account (NULL if bot) |
| `final_scores` | JSONB | NOT NULL | Map of player_id → score |
| `player_count` | INTEGER | NOT NULL | Number of players (2-4) |
| `bot_count` | INTEGER | NOT NULL | Number of bots in game |
| `total_turns` | INTEGER | NOT NULL | Total turns taken |
| `duration_seconds` | INTEGER | NOT NULL | Game duration from start to end |
| `cambio_caller_id` | UUID | NOT NULL | Who called Cambio |
| `cambio_penalty_applied` | BOOLEAN | NOT NULL | Whether Cambio caller's score was doubled |
| `completed_at` | TIMESTAMP | NOT NULL | When game ended |
| `created_at` | TIMESTAMP | NOT NULL | When game was created |

**Indexes**:
- `winner_user_id` (for player statistics)
- `completed_at` (for recent games queries)
- `room_code` (for game lookup by code)

**Validation Rules**:
- `final_scores`: JSONB object with player IDs as keys, scores as values
- `player_count`: Between 2 and 4 inclusive
- `total_turns`: Minimum 1 (at least one turn must be taken)

---

## Relationships

### GameSession ↔ GamePlayer
- **Type**: One-to-Many
- **Cardinality**: 1 game session has 2-4 players
- **Cascade**: DELETE game session → DELETE associated players
- **Foreign Key**: `game_players.game_id` → `game_sessions.id`

### GameSession ↔ GameAction
- **Type**: One-to-Many
- **Cardinality**: 1 game session has N actions (event log)
- **Cascade**: DELETE game session → DELETE associated actions
- **Foreign Key**: `game_actions.game_id` → `game_sessions.id`

### User ↔ GamePlayer
- **Type**: One-to-Many
- **Cardinality**: 1 user can participate in many games (over time)
- **Cascade**: DELETE user → SET NULL on `game_players.user_id` (preserve game data)
- **Foreign Key**: `game_players.user_id` → `users.id`

### GamePlayer ↔ GameAction
- **Type**: One-to-Many
- **Cardinality**: 1 player performs many actions
- **Cascade**: DELETE player → DELETE associated actions
- **Foreign Key**: `game_actions.player_id` → `game_players.id`

### GameSession ↔ GameHistory
- **Type**: One-to-One
- **Cardinality**: 1 completed game has 1 history record
- **Cascade**: DELETE game session → DELETE history record
- **Foreign Key**: `game_history.game_id` → `game_sessions.id`

---

## Database Schema (Drizzle ORM)

### Enums

```typescript
// server/database/schema/game.ts
export const gameStatusEnum = pgEnum('game_status', [
  'waiting',
  'active',
  'final_round',
  'completed',
  'abandoned'
])

export const connectionStatusEnum = pgEnum('connection_status', [
  'connected',
  'disconnected',
  'bot_takeover'
])

export const botDifficultyEnum = pgEnum('bot_difficulty', [
  'easy',
  'medium',
  'hard'
])

export const actionTypeEnum = pgEnum('action_type', [
  'player_joined',
  'game_started',
  'cards_dealt',
  'card_drawn_deck',
  'card_drawn_discard',
  'card_swapped',
  'card_discarded',
  'power_activated',
  'power_skipped',
  'turn_ended',
  'cambio_called',
  'game_ended',
  'player_disconnected',
  'player_reconnected',
  'bot_takeover'
])
```

### Tables

```typescript
import { pgTable, uuid, varchar, timestamp, integer, jsonb, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomCode: varchar('room_code', { length: 6 }).notNull().unique(),
  status: gameStatusEnum('status').notNull().default('waiting'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  currentTurn: integer('current_turn'),
  turnSequence: integer('turn_sequence').notNull().default(0),
  drawPile: jsonb('draw_pile').notNull(),
  discardPile: jsonb('discard_pile').notNull(),
  cambioCallerId: uuid('cambio_caller_id').references(() => gamePlayers.id),
  cambioCalledAt: timestamp('cambio_called_at'),
  finalRoundTurnsRemaining: integer('final_round_turns_remaining'),
  winnerId: uuid('winner_id').references(() => gamePlayers.id),
  maxPlayers: integer('max_players').notNull().default(4),
  minPlayers: integer('min_players').notNull().default(2)
}, (table) => ({
  statusIdx: index('game_status_idx').on(table.status),
  createdAtIdx: index('game_created_at_idx').on(table.createdAt)
}))

export const gamePlayers = pgTable('game_players', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  position: integer('position').notNull(),
  cards: jsonb('cards').notNull(),
  score: integer('score'),
  isBot: boolean('is_bot').notNull().default(false),
  botDifficulty: botDifficultyEnum('bot_difficulty'),
  connectionStatus: connectionStatusEnum('connection_status').notNull().default('connected'),
  disconnectedAt: timestamp('disconnected_at'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  botMemory: jsonb('bot_memory')
}, (table) => ({
  gamePositionIdx: uniqueIndex('game_player_position_idx').on(table.gameId, table.position),
  gameUserIdx: uniqueIndex('game_user_idx').on(table.gameId, table.userId),
  userIdx: index('player_user_idx').on(table.userId)
}))

export const gameActions = pgTable('game_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  playerId: uuid('player_id').references(() => gamePlayers.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  actionType: actionTypeEnum('action_type').notNull(),
  payload: jsonb('payload').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  isValidated: boolean('is_validated').notNull().default(true)
}, (table) => ({
  gameSequenceIdx: uniqueIndex('game_action_sequence_idx').on(table.gameId, table.sequence),
  gameIdx: index('action_game_idx').on(table.gameId),
  timestampIdx: index('action_timestamp_idx').on(table.timestamp)
}))

export const gameHistory = pgTable('game_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull().unique().references(() => gameSessions.id, { onDelete: 'cascade' }),
  roomCode: varchar('room_code', { length: 6 }).notNull(),
  winnerId: uuid('winner_id').notNull().references(() => gamePlayers.id),
  winnerUserId: uuid('winner_user_id').references(() => users.id, { onDelete: 'set null' }),
  finalScores: jsonb('final_scores').notNull(),
  playerCount: integer('player_count').notNull(),
  botCount: integer('bot_count').notNull(),
  totalTurns: integer('total_turns').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  cambioCallerId: uuid('cambio_caller_id').notNull().references(() => gamePlayers.id),
  cambioPenaltyApplied: boolean('cambio_penalty_applied').notNull(),
  completedAt: timestamp('completed_at').notNull(),
  createdAt: timestamp('created_at').notNull()
}, (table) => ({
  winnerUserIdx: index('history_winner_user_idx').on(table.winnerUserId),
  completedAtIdx: index('history_completed_at_idx').on(table.completedAt),
  roomCodeIdx: index('history_room_code_idx').on(table.roomCode)
}))
```

---

## TypeScript Interfaces

```typescript
// app/types/game.ts

export interface Card {
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: number
}

export interface PlayerCard extends Card {
  position: 0 | 1 | 2 | 3
  visibleTo: string[] // Player IDs
}

export interface GameState {
  id: string
  roomCode: string
  status: 'waiting' | 'active' | 'final_round' | 'completed' | 'abandoned'
  currentTurn: number | null
  turnSequence: number
  drawPileCount: number // Don't expose actual cards to client
  discardPile: Card[]
  players: PlayerState[]
  cambioCallerId: string | null
  finalRoundTurnsRemaining: number | null
  winnerId: string | null
}

export interface PlayerState {
  id: string
  userId: string | null
  position: number
  cards: PlayerCard[] // Filtered by visibility
  score: number | null
  isBot: boolean
  botDifficulty: 'easy' | 'medium' | 'hard' | null
  connectionStatus: 'connected' | 'disconnected' | 'bot_takeover'
}

export interface GameAction {
  type: 'draw_deck' | 'draw_discard' | 'swap' | 'discard' | 'power' | 'cambio'
  cardPosition?: number
  targetPlayerId?: string
  targetCardPosition?: number
  powerType?: 'peek_own' | 'peek_opponent' | 'blind_swap'
}

export interface BotMemory {
  ownCards: Record<number, { rank: string; suit: string; confidence: number }>
  opponentCards: Record<string, Record<number, { rank: string; suit: string; confidence: number }>>
  discardHistory: Array<{ rank: string; suit: string; timestamp: number }>
}
```

---

## Migration Strategy

### Initial Migration

1. Create enums (game_status, connection_status, bot_difficulty, action_type)
2. Create tables in dependency order:
   - `game_sessions`
   - `game_players` (FK to game_sessions)
   - `game_actions` (FK to game_sessions, game_players)
   - `game_history` (FK to game_sessions, game_players)
3. Create indexes for performance
4. Add foreign key constraints

### Rollback Plan

- DROP tables in reverse order (game_history → game_actions → game_players → game_sessions)
- DROP enums
- No data migration needed (new feature)

---

## Performance Considerations

### Optimizations

1. **Indexes**: Strategic indexes on high-query columns (room_code, status, user_id)
2. **JSONB**: Card data stored as JSONB for flexibility and efficient queries
3. **Cascading Deletes**: Automatic cleanup of related records
4. **Unique Constraints**: Prevent duplicate joins and position conflicts

### Query Patterns

```sql
-- Find active game by room code
SELECT * FROM game_sessions WHERE room_code = $1 AND status = 'active'

-- Get game state with players
SELECT gs.*, gp.*
FROM game_sessions gs
JOIN game_players gp ON gs.id = gp.game_id
WHERE gs.id = $1

-- Get action log for game
SELECT * FROM game_actions
WHERE game_id = $1
ORDER BY sequence ASC

-- Get player's game history
SELECT gh.*
FROM game_history gh
JOIN game_players gp ON gh.game_id = gp.game_id
WHERE gp.user_id = $1
ORDER BY gh.completed_at DESC
LIMIT 20
```

---

## Summary

This data model provides:

✅ **Server-authoritative state** - All game data persisted and validated server-side
✅ **Event sourcing** - Complete action log for audit and reconstruction
✅ **Visibility control** - Card visibility tracked per player
✅ **Bot support** - Bot players with memory and difficulty levels
✅ **Reconnection** - Connection status and disconnection tracking
✅ **Type safety** - Drizzle ORM with TypeScript types throughout
✅ **Performance** - Indexed queries and JSONB flexibility

**Ready for Phase 1 contracts generation** ✅
