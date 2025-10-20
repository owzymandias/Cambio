# Data Model: Game Completion - Special Powers & Scoring

**Date**: 2025-10-20
**Feature**: Game Completion - Special Powers & Scoring
**Branch**: 002-game-completion

## Overview

This document describes the data model changes and entity relationships for implementing special powers, Cambio calls, and scoring. Most entities already exist from `001-core-game-mechanics`; this feature primarily **extends existing entities** and **populates previously empty tables** (`special_power`, `game_score`).

---

## Entity Changes

### 1. GameSession (EXTEND EXISTING)

**Table**: `game_session`
**Changes**: No schema changes required; will use existing `phase`, `cambioCallerId`, `winnerId` columns.

**State Transitions**:
```
setup → initial_view → playing → final_round → completed
                                    ↑
                            (Cambio called)
```

**Key Fields Used**:
- `phase`: Enum value transitions to `'final_round'` when Cambio called, then `'completed'` after scoring
- `cambioCallerId`: Set to player ID when Cambio is called (enforces one call per game)
- `winnerId`: Set after scoring to player(s) with lowest score (may be NULL for ties)
- `completedAt`: Set when game reaches `completed` phase

**Validation Rules**:
- `cambioCallerId` can only be set once per game (NULL → playerId, never changes after)
- Transition to `final_round` requires `phase = 'playing'` and `cambioCallerId IS NULL`
- Transition to `completed` requires `phase = 'final_round'` and all non-caller players have `hasTakenFinalTurn = true`

---

### 2. Player (EXTEND EXISTING)

**Table**: `player`
**Changes**: Add new column `hasTakenFinalTurn BOOLEAN DEFAULT FALSE`

**Migration**:
```sql
ALTER TABLE player ADD COLUMN has_taken_final_turn BOOLEAN DEFAULT FALSE;
```

**Key Fields Used**:
- `hasTakenFinalTurn`: Tracks final round completion; set to `true` for Cambio caller immediately when called, then `true` for each other player after their final turn
- `isConnected`: Used for disconnection handling (forfeit final turn if `false` during final round)
- `score`: Populated during game completion with final score (including penalty if applicable)

**Validation Rules**:
- Can only set `hasTakenFinalTurn = true` during `final_round` phase
- Cambio caller automatically gets `hasTakenFinalTurn = true` when Cambio is called
- Cannot take additional turns after `hasTakenFinalTurn = true`

---

### 3. Card (NO CHANGES)

**Table**: `card`
**No schema changes required.**

**Key Fields Used**:
- `visibility`: Temporarily set to `'peeking'` during power activation, reset to `'hidden'` after 5s or next event
- `location`: Used to filter cards for score calculation (`location = 'hand'`)
- `pointValue`: Core field for scoring calculation

**Validation Rules**:
- `visibility = 'peeking'` only allowed for cards targeted by peek powers
- Server resets `visibility = 'hidden'` after peek timeout (enforces 5-second rule)

---

### 4. SpecialPower (POPULATE EXISTING)

**Table**: `special_power`
**No schema changes required; table exists but was unused in 001-core-game-mechanics.**

**Fields**:
- `id`: UUID primary key
- `gameSessionId`: References `game_session.id`
- `turnId`: References `turn.id` (the turn during which power was activated)
- `activatedById`: References `player.id` (who activated the power)
- `powerType`: Enum `'peek_own' | 'peek_opponent' | 'blind_swap' | 'look_own' | 'none'`
- `targetCardId`: References `card.id` (card that was peeked or swapped; NULL for blind_swap until after swap)
- `targetPlayerId`: References `player.id` (opponent player for peek_opponent or blind_swap; NULL for peek_own/look_own)
- `createdAt`: Timestamp

**Relationships**:
- Many `special_power` → One `turn` (a turn may have 0 or 1 power activation)
- Many `special_power` → One `player` (activatedById)
- Many `special_power` → One `card` (targetCardId, optional)
- Many `special_power` → One `player` (targetPlayerId, optional)

**Validation Rules**:
- `powerType = 'peek_own'` or `'look_own'`: `targetPlayerId` must be NULL, `targetCardId` must reference activator's card
- `powerType = 'peek_opponent'`: `targetPlayerId` must be opponent, `targetCardId` must reference opponent's card
- `powerType = 'blind_swap'`: `targetPlayerId` must be opponent, `targetCardId` initially NULL (set after swap completes)
- Power can only be activated during `playing` or `final_round` phase
- Player must be current turn player (`game_session.currentTurnPlayerId = activatedById`)

---

### 5. GameScore (POPULATE EXISTING)

**Table**: `game_score`
**No schema changes required; table exists but was unused in 001-core-game-mechanics.**

**Fields**:
- `id`: UUID primary key
- `gameSessionId`: References `game_session.id`
- `playerId`: References `player.id`
- `finalScore`: Integer (sum of card point values, potentially doubled if penalty applied)
- `isCambioCaller`: Boolean (true if this player called Cambio)
- `penaltyApplied`: Boolean (true if Cambio caller penalty doubled score)
- `isWinner`: Boolean (true if player has lowest final score)
- `cardsSummary`: JSONB (array of final cards held: `[{ rank, suit, pointValue }]`)
- `createdAt`: Timestamp

**Relationships**:
- Many `game_score` → One `game_session` (one score per player per game)
- One `game_score` → One `player` (unique constraint on `gameSessionId + playerId`)

**Validation Rules**:
- `isCambioCaller = true` only for player matching `game_session.cambioCallerId`
- `penaltyApplied = true` only if `isCambioCaller = true` AND player did NOT have lowest score
- `finalScore` = base score (sum of card points) * 2 if `penaltyApplied = true`, else base score
- `isWinner = true` for player(s) with lowest `finalScore` (may be multiple for ties)
- Created only when `game_session.phase = 'completed'`

---

### 6. Turn (EXTEND EXISTING)

**Table**: `turn`
**No schema changes required.**

**Key Fields Used**:
- `action`: Set to `'power'` for power activation turns, `'cambio'` for Cambio call turns
- `specialPowerType`: Enum value matches `special_power.powerType` when `action = 'power'`
- `targetCardId`: References card affected by power (for peek) or swap
- `targetPlayerId`: References opponent player (for peek_opponent or blind_swap)

**Validation Rules**:
- `action = 'cambio'` only allowed when `game_session.phase = 'playing'` AND `cambioCallerId IS NULL`
- `action = 'power'` only allowed after discard of power card (7, 8, 9, 10, J, Q, K)
- One turn per power activation (turn created when power starts, finalized when completed/skipped)

---

## State Diagrams

### Special Power Activation Flow

```
Player discards power card (7, 8, 9, 10, J, Q, K)
   ↓
Server detects power card rank
   ↓
Server creates turn record (action = 'power', specialPowerType = [type])
   ↓
Server broadcasts POWER_AVAILABLE event to activating player
   ↓
Client opens PowerModal with appropriate UI (card selector, player selector, etc.)
   ├─ Option A: Player selects target → POST /api/game/[id]/power
   │    ↓
   │    Server validates target, updates card visibility (if peek), creates special_power record
   │    ↓
   │    Server broadcasts CARD_REVEALED (private to player) or SWAP_COMPLETED (public)
   │    ↓
   │    Server starts 5-second timer (for peek) or immediately proceeds (for swap)
   │    ↓
   │    Timer expires OR next game event → Server resets visibility, broadcasts CARD_HIDDEN
   │
   └─ Option B: Player clicks Skip → POST /api/game/[id]/power (with skip: true)
        ↓
        Server marks turn as completed without power effect, advances to next turn
```

### Cambio Call & Final Round Flow

```
Player's turn starts (phase = 'playing')
   ↓
Player clicks "Call Cambio" button → POST /api/game/[id]/cambio
   ↓
Server validates: cambioCallerId IS NULL AND phase = 'playing'
   ↓
Server updates game_session: phase = 'final_round', cambioCallerId = [playerId]
   ↓
Server marks Cambio caller: hasTakenFinalTurn = true (caller forfeits remaining turn)
   ↓
Server broadcasts CAMBIO_CALLED event (public to all players)
   ↓
Server advances to next player in turn order
   ↓
Each non-caller player takes exactly one final turn
   ├─ After each turn: Server marks hasTakenFinalTurn = true for that player
   ├─ Server checks: Are all non-callers done? (WHERE hasTakenFinalTurn = false AND id != cambioCallerId)
   │
   └─ If all done:
        ↓
        Server calls completeGame(gameId)
        ↓
        Server calculates scores → creates game_score records
        ↓
        Server determines winner(s) → updates game_score.isWinner
        ↓
        Server updates game_session: phase = 'completed', winnerId = [winnerId], completedAt = NOW()
        ↓
        Server broadcasts GAME_COMPLETED event (public with final scores)
```

### Scoring Calculation Flow

```
completeGame(gameId) called
   ↓
Query all players with their hand cards (location = 'hand')
   ↓
For each player:
   ├─ Calculate base score = SUM(card.pointValue)
   ├─ Store base score temporarily
   │
After all base scores calculated:
   ├─ Find lowest base score (lowestScore)
   ├─ Identify player(s) with lowestScore
   │
For each player:
   ├─ finalScore = base score
   ├─ isCambioCaller = (player.id == game.cambioCallerId)
   ├─ penaltyApplied = false
   ├─ isWinner = false
   │
   ├─ IF isCambioCaller AND player does NOT have lowestScore:
   │    ├─ penaltyApplied = true
   │    ├─ finalScore = base score * 2
   │
   ├─ After penalty applied, recalculate lowest finalScore across all players
   ├─ IF player has lowest finalScore: isWinner = true
   │
   └─ INSERT into game_score with all fields
```

---

## Indexes & Performance

**Existing Indexes** (from 001-core-game-mechanics):
- Primary keys on all tables (UUID)
- Foreign key indexes auto-created by PostgreSQL

**Recommended New Indexes**:
```sql
-- Speed up final round turn tracking query
CREATE INDEX idx_player_final_turn ON player(game_session_id, has_taken_final_turn) WHERE has_taken_final_turn = false;

-- Speed up game score retrieval
CREATE INDEX idx_game_score_game ON game_score(game_session_id);

-- Speed up special power history queries
CREATE INDEX idx_special_power_game ON special_power(game_session_id, created_at);
```

---

## Validation Summary

| Entity | Field | Validation Rule |
|--------|-------|----------------|
| `game_session` | `cambioCallerId` | Can only be set once (NULL → UUID, immutable) |
| `game_session` | `phase` | Transitions: `playing → final_round` (requires cambioCallerId set), `final_round → completed` (requires all final turns done) |
| `player` | `hasTakenFinalTurn` | Can only be true during `final_round` phase |
| `card` | `visibility` | `peeking` state auto-resets after 5s or next event |
| `special_power` | `powerType` | Must match discarded card rank (7/8 → peek_own, 9/10 → peek_opponent, J/Q → blind_swap, K → look_own) |
| `special_power` | `targetPlayerId` | Required for `peek_opponent` and `blind_swap`, NULL otherwise |
| `game_score` | `penaltyApplied` | Only true if `isCambioCaller = true` AND player did NOT have lowest base score |
| `game_score` | `isWinner` | True for player(s) with lowest `finalScore` (post-penalty) |

---

## Migration Required

**Single Migration**: Add `has_taken_final_turn` column to `player` table.

```sql
-- Migration: Add final turn tracking
ALTER TABLE player ADD COLUMN has_taken_final_turn BOOLEAN DEFAULT FALSE NOT NULL;

-- Optional: Add performance indexes
CREATE INDEX idx_player_final_turn ON player(game_session_id, has_taken_final_turn) WHERE has_taken_final_turn = false;
CREATE INDEX idx_game_score_game ON game_score(game_session_id);
CREATE INDEX idx_special_power_game ON special_power(game_session_id, created_at);
```

**Drizzle Schema Update**:
```typescript
// server/database/schema/game.ts
export const player = pgTable('player', {
  // ... existing fields ...
  hasTakenFinalTurn: boolean('has_taken_final_turn').notNull().default(false),
  // ... existing fields ...
})
```

---

## Entity Relationship Diagram

```
game_session (1) ──┬─ (N) player
                   ├─ (N) card
                   ├─ (N) turn
                   ├─ (N) special_power
                   └─ (N) game_score

player (1) ──┬─ (N) card (hand)
             ├─ (N) turn (actions)
             ├─ (N) special_power (activatedById)
             └─ (1) game_score

turn (1) ──┬─ (0..1) special_power
           ├─ (0..1) card (cardDrawnId)
           ├─ (0..1) card (targetCardId)
           └─ (0..1) player (targetPlayerId)

special_power (1) ──┬─ (1) player (activatedById)
                    ├─ (1) turn
                    ├─ (0..1) card (targetCardId)
                    └─ (0..1) player (targetPlayerId)

game_score (1) ──┬─ (1) game_session
                 └─ (1) player
```

---

## Summary

- **0 new tables** (all entities already exist)
- **1 new column**: `player.hasTakenFinalTurn` (boolean)
- **2 tables activated**: `special_power`, `game_score` (previously empty)
- **3 recommended indexes** for query performance
- **All validation rules** enforceable at database + application layer
