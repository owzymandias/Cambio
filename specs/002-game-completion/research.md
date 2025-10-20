# Research: Game Completion - Special Powers & Scoring

**Date**: 2025-10-20
**Feature**: Game Completion - Special Powers & Scoring
**Branch**: 002-game-completion

## Research Questions

### 1. Modal Dialog Implementation in Nuxt UI

**Question**: What is the best practice for implementing blocking modal dialogs in Nuxt UI with mobile-first touch interactions?

**Decision**: Use Nuxt UI's `UModal` component with `prevent-close` prop for blocking behavior.

**Rationale**:
- Nuxt UI provides built-in `UModal` component with mobile-responsive design
- `prevent-close` prop enforces user interaction (prevents backdrop click dismissal)
- Built-in focus trap and accessibility features (keyboard navigation, screen reader support)
- Seamless integration with existing Tailwind CSS styling in the project
- Touch-friendly by default with large dismiss buttons and proper touch target sizing

**Alternatives Considered**:
- **Headless UI Modal**: More flexible but requires manual accessibility implementation
- **Custom modal component**: Reinventing the wheel; Nuxt UI already provides tested solution
- **Dialog HTML element**: Native but lacks mobile optimization and Tailwind integration

**Implementation Pattern**:
```vue
<UModal v-model="isOpen" prevent-close :ui="{ width: 'max-w-md' }">
  <UCard>
    <template #header>
      <h3>Select a card to peek</h3>
    </template>
    <div class="grid grid-cols-2 gap-4">
      <!-- Card selection buttons with 44x44px minimum touch targets -->
    </div>
    <template #footer>
      <UButton @click="skipPower">Skip</UButton>
    </template>
  </UCard>
</UModal>
```

---

### 2. Real-Time Peek Visibility (Private Events)

**Question**: How to broadcast peek power card reveals only to the activating player while showing "Player X is peeking" to others?

**Decision**: Implement player-specific event filtering in `gameSocket.ts` using `broadcastToPlayer()` for private events and `broadcastToGame()` for public events.

**Rationale**:
- Server-authoritative principle requires server to control visibility
- Existing `gameSocket.ts` uses SSE (Server-Sent Events) with per-connection tracking
- Can extend with `playerId` association per connection to enable targeted sends
- Public events (power activated, Cambio called) use existing `broadcastToGame()`
- Private events (card reveal) use new `broadcastToPlayer(gameId, playerId, event)`

**Alternatives Considered**:
- **Client-side filtering**: Violates server-authoritative principle; clients could intercept private data
- **Separate WebSocket channels per player**: Overcomplicated; SSE connections already per-player
- **Encrypted payloads**: Unnecessary complexity; proper event filtering is simpler and sufficient

**Implementation Pattern**:
```typescript
// Public event: All players see "Player X activated a peek power"
broadcastToGame(gameId, {
  type: 'POWER_ACTIVATED',
  playerId,
  powerType: 'peek_own',
})

// Private event: Only activating player sees the revealed card
broadcastToPlayer(gameId, playerId, {
  type: 'CARD_REVEALED',
  cardId,
  card: { rank, suit, pointValue },
  expiresAt: Date.now() + 5000, // 5-second peek duration
})
```

---

### 3. Optimistic Locking for Concurrent Power Activations

**Question**: How to prevent race conditions when multiple clients attempt actions simultaneously (e.g., rapid power activation clicks)?

**Decision**: Use Drizzle ORM's transaction support with row-level locking (`FOR UPDATE`) on `game_session` table during state changes.

**Rationale**:
- PostgreSQL provides `SELECT ... FOR UPDATE` to lock rows during transactions
- Drizzle supports explicit transactions via `db.transaction()`
- Lock `game_session` row at start of power activation; release after commit
- Second concurrent request waits for lock, then re-validates game state (may reject if state changed)
- Prevents double-activation, duplicate Cambio calls, and out-of-order turn processing

**Alternatives Considered**:
- **Application-level mutex (in-memory)**: Fails in multi-instance deployments (Cloudflare Workers)
- **Redis distributed lock**: Adds external dependency; overkill for single-database setup
- **Timestamp-based optimistic concurrency**: Requires retry logic; more complex than pessimistic locking

**Implementation Pattern**:
```typescript
await db.transaction(async (tx) => {
  // Lock game session row
  const [game] = await tx
    .select()
    .from(gameSession)
    .where(eq(gameSession.id, gameId))
    .for('update') // Row-level lock

  // Validate current phase allows power activation
  if (game.phase !== 'playing') {
    throw new Error('Cannot activate power outside playing phase')
  }

  // Process power activation, update game state
  await tx.insert(specialPower).values({ ... })
  await tx.update(card).set({ visibility: 'peeking' }).where(...)

  // Commit releases lock
})
```

---

### 4. Final Round Turn Sequencing

**Question**: How to track which players have taken their final turn after Cambio is called?

**Decision**: Add `hasTakenFinalTurn` boolean column to `player` table (transient state, cleared when new game starts).

**Rationale**:
- Simple boolean flag per player tracks final turn completion
- Server checks: "Has every player except Cambio caller taken their final turn?"
- After last final turn, game transitions to `completed` phase automatically
- No need for separate tracking table; player table already exists and is game-scoped
- Boolean resets to `false` on game creation (default value)

**Alternatives Considered**:
- **Count turns in final_round phase**: Complex query; error-prone if turn history has gaps
- **Separate `final_round_status` table**: Over-engineering; adds join overhead
- **In-memory tracking**: Lost on server restart; violates database-as-source-of-truth

**Implementation Pattern**:
```typescript
// When Cambio is called
await db.update(gameSession).set({
  phase: 'final_round',
  cambioCallerId: playerId,
})

// Mark Cambio caller as already having taken their turn (they forfeit)
await db.update(player).set({
  hasTakenFinalTurn: true,
}).where(eq(player.id, playerId))

// After each final turn
await db.update(player).set({
  hasTakenFinalTurn: true,
}).where(eq(player.id, currentPlayerId))

// Check if all non-caller players finished
const remainingPlayers = await db
  .select()
  .from(player)
  .where(
    and(
      eq(player.gameSessionId, gameId),
      eq(player.hasTakenFinalTurn, false),
      ne(player.id, cambioCallerId),
    )
  )

if (remainingPlayers.length === 0) {
  // Transition to completed phase, calculate scores
}
```

---

### 5. Client-Side Auto-Dismiss Peek Modal (5-Second Timer)

**Question**: Should the 5-second peek timer run client-side, server-side, or both?

**Decision**: Server-side authoritative timer with client-side UI countdown. Server sends `CARD_HIDDEN` event after 5 seconds OR on next game event (whichever first).

**Rationale**:
- Server is source of truth for card visibility state
- Client displays countdown for UX, but cannot extend visibility beyond server's timeout
- Server uses `setTimeout()` to auto-hide card after 5000ms, cancellable if next game event occurs first
- Prevents client manipulation (e.g., stopping timer to peek indefinitely)
- Client gracefully handles late `CARD_HIDDEN` event if network delayed

**Alternatives Considered**:
- **Client-only timer**: Violates server-authoritative principle; client could cheat
- **Polling for card state**: Inefficient; SSE events are push-based
- **No auto-dismiss**: Requires manual user action; slows game pace

**Implementation Pattern**:
```typescript
// Server: Schedule auto-hide on peek activation
const hideTimer = setTimeout(async () => {
  await db.update(card).set({ visibility: 'hidden' }).where(eq(card.id, cardId))
  broadcastToPlayer(gameId, playerId, { type: 'CARD_HIDDEN', cardId })
}, 5000)

// Store timer reference in Map<cardId, NodeJS.Timeout> for cancellation
peekTimers.set(cardId, hideTimer)

// On next game event (e.g., discard, swap), cancel all active peek timers
for (const [cardId, timer] of peekTimers.entries()) {
  clearTimeout(timer)
  await db.update(card).set({ visibility: 'hidden' }).where(eq(card.id, cardId))
  // Broadcast CARD_HIDDEN events
}
peekTimers.clear()
```

**Client Pattern**:
```vue
<script setup lang="ts">
const timeRemaining = ref(5000)
const intervalId = setInterval(() => {
  timeRemaining.value -= 100
  if (timeRemaining.value <= 0) {
    clearInterval(intervalId)
  }
}, 100)

// Listen for server's CARD_HIDDEN event
onGameEvent('CARD_HIDDEN', () => {
  clearInterval(intervalId)
  isModalOpen.value = false
})
</script>

<template>
  <div class="countdown">{{ Math.ceil(timeRemaining / 1000) }}s</div>
</template>
```

---

### 6. Handling Disconnections During Power Activation

**Question**: What happens to in-progress power activations if the activating player disconnects?

**Decision**: Server cancels pending power activation on disconnect; broadcasts `POWER_CANCELLED` event; turn ends automatically.

**Rationale**:
- Edge case: Player disconnects between opening modal and selecting target
- Server tracks active power activations in memory (Map<playerId, { powerType, startedAt }>)
- On disconnect (SSE connection close), server clears pending activation, resets game state to pre-power
- Other players see "Player X disconnected" notification; next player's turn begins
- Consistent with edge case resolution: "Power activation is cancelled; turn ends automatically; no power effect is applied"

**Alternatives Considered**:
- **Wait for reconnection**: Stalls game; poor UX for other players
- **Auto-skip power with random selection**: Unfair; player didn't choose target
- **Treat as skip**: Simpler but less clear than explicit cancellation

**Implementation Pattern**:
```typescript
// Track pending activations
const pendingPowers = new Map<string, { gameId: string, powerType: string }>()

// On SSE disconnect
gameSocket.on('disconnect', async (playerId) => {
  const pending = pendingPowers.get(playerId)
  if (pending) {
    // Cancel power, reset turn state
    await db.update(turn).set({ specialPowerType: 'none' })
    broadcastToGame(pending.gameId, {
      type: 'POWER_CANCELLED',
      playerId,
      reason: 'Player disconnected',
    })
    pendingPowers.delete(playerId)
    // Advance to next turn
    await advanceToNextPlayer(pending.gameId)
  }
})
```

---

### 7. Zod Validation Schemas for API Requests

**Question**: What validation library and patterns should be used for power/cambio API request validation?

**Decision**: Use Zod with discriminated unions for power type validation. Define schemas in `shared/types/game.ts` for client/server reuse.

**Rationale**:
- Zod is TypeScript-first, provides type inference and runtime validation
- Discriminated unions handle different power types (peek_own requires `cardIndex`, peek_opponent requires `targetPlayerId` + `cardIndex`, etc.)
- Shared schemas between client and server ensure consistent validation and type safety
- Better error messages than manual validation (e.g., "Expected targetPlayerId for peek_opponent power")

**Alternatives Considered**:
- **Joi**: Less TypeScript integration; older library
- **Yup**: Similar to Zod but less type inference
- **Manual validation**: Error-prone, duplicates type definitions

**Implementation Pattern**:
```typescript
// shared/types/game.ts
import { z } from 'zod'

export const PowerActivationRequestSchema = z.discriminatedUnion('powerType', [
  z.object({
    powerType: z.literal('peek_own'),
    cardIndex: z.number().int().min(0).max(3), // 0-3 for 2x2 grid
  }),
  z.object({
    powerType: z.literal('peek_opponent'),
    targetPlayerId: z.string().uuid(),
    cardIndex: z.number().int().min(0).max(3),
  }),
  z.object({
    powerType: z.literal('blind_swap'),
    myCardIndex: z.number().int().min(0).max(3),
    targetPlayerId: z.string().uuid(),
    targetCardIndex: z.number().int().min(0).max(3),
  }),
  z.object({
    powerType: z.literal('look_own'), // King auto-peek
    // No player input required
  }),
])

export type PowerActivationRequest = z.infer<typeof PowerActivationRequestSchema>

// API route usage
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const validated = PowerActivationRequestSchema.parse(body) // Throws if invalid
  // ... process power activation
})
```

---

## Summary

All technical unknowns resolved. Key decisions:
1. **Modal UI**: Nuxt UI `UModal` with `prevent-close` for blocking interaction
2. **Private Events**: Player-specific SSE filtering via new `broadcastToPlayer()` function
3. **Concurrency Control**: PostgreSQL row-level locking with `FOR UPDATE` in transactions
4. **Final Round Tracking**: `hasTakenFinalTurn` boolean column on `player` table
5. **Peek Timer**: Server-authoritative 5-second timeout with client-side countdown display
6. **Disconnection Handling**: Cancel pending powers on disconnect, advance turn automatically
7. **Validation**: Zod discriminated unions for type-safe request validation

No blocking technical risks identified. Ready to proceed to Phase 1 (Design & Contracts).
