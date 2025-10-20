# Research: Core Cambio Game Mechanics

**Feature**: 003-core-game-mechanics
**Date**: 2025-10-20
**Purpose**: Technical research and decision documentation for implementation planning

## Overview

This document captures technical research, architectural decisions, and best practices for implementing the Cambio multiplayer card game. All decisions align with the project constitution and leverage the existing NuxSaaS infrastructure.

---

## 1. Real-Time Communication Architecture

### Decision: WebSocket with h3-websocket

**Rationale**:
- Nuxt 4/Nitro provides native WebSocket support via h3-websocket
- Bidirectional real-time communication required for game state updates
- Lower latency than Server-Sent Events (SSE) or polling
- Already familiar pattern in the ecosystem

**Alternatives Considered**:
- **Server-Sent Events (SSE)**: One-way only, would require separate POST for client→server actions
- **Polling**: High latency, inefficient for real-time game updates
- **Socket.io**: Additional dependency overhead, h3-websocket sufficient for our needs

**Implementation Pattern**:
```typescript
// server/api/game/ws.ts
export default defineWebSocketHandler({
  open(peer) {
    // Handle connection, authenticate user, join game room
  },
  message(peer, message) {
    // Handle game actions, broadcast to room participants
  },
  close(peer) {
    // Handle disconnection, start reconnection timer
  }
})
```

**References**:
- [Nuxt WebSocket Documentation](https://nitro.unjs.io/guide/websocket)
- h3 WebSocket handler API

---

## 2. Game State Management

### Decision: Server-Authoritative State with Event Sourcing Lite

**Rationale**:
- Constitution Principle II requires all game logic server-side
- Event sourcing provides audit trail (FR-026: log all actions with timestamps)
- Enables state reconstruction for reconnection (US8)
- Simplifies bot takeover by replaying state

**Architecture**:
- **Source of Truth**: PostgreSQL game sessions table
- **Action Log**: PostgreSQL game_actions table (event store)
- **In-Memory Cache**: Active game states in server memory for performance
- **Client State**: Optimistic UI updates, server validates and corrects

**Alternatives Considered**:
- **Full Event Sourcing**: Over-engineering for this scope, adds complexity
- **Pure REST**: Doesn't support real-time updates efficiently
- **Client-Side State**: Violates constitution, enables cheating

**Database Schema Pattern**:
```sql
-- Game session (current state)
game_sessions { id, room_code, status, current_turn, draw_pile, discard_pile }

-- Game actions (event log)
game_actions { id, game_id, player_id, action_type, payload, timestamp, sequence }

-- Players (derived state)
game_players { id, game_id, user_id, position, cards, score, is_bot }
```

**References**:
- Martin Fowler: Event Sourcing pattern
- Drizzle ORM relations and transactions

---

## 3. Card Shuffling & Random Number Generation

### Decision: Fisher-Yates Shuffle with crypto.randomInt()

**Rationale**:
- Fisher-Yates guarantees uniform distribution (unbiased shuffle)
- `crypto.randomInt()` provides cryptographic randomness (FR-003)
- Node.js native API, no external dependencies
- Prevents predictable deck patterns that could be exploited

**Alternatives Considered**:
- **Math.random()**: Not cryptographically secure, predictable seed
- **UUID-based shuffle**: Slower, unnecessary complexity
- **External RNG library**: Adds dependency, crypto module sufficient

**Implementation**:
```typescript
import { randomInt } from 'node:crypto'

function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
```

**References**:
- [Node.js crypto.randomInt()](https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback)
- Fisher-Yates shuffle algorithm

---

## 4. Room Code Generation

### Decision: 6-character alphanumeric codes (base32 subset)

**Rationale**:
- FR-001: unique 6-character codes excluding similar characters (0/O, 1/I, L)
- Easy to communicate verbally or via text
- 32^6 = ~1 billion combinations (collision-resistant for scope)
- No database lookup required, generated on-demand with uniqueness check

**Character Set**: `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (32 chars, excludes 0,1,I,L,O)

**Implementation**:
```typescript
const ROOM_CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    const index = randomInt(0, ROOM_CODE_CHARS.length)
    code += ROOM_CODE_CHARS[index]
  }
  return code
}
```

**Collision Handling**: Database unique constraint + retry on conflict (max 3 retries)

**References**:
- Base32 encoding standards (RFC 4648)
- Friendly ID generation patterns

---

## 5. AI Bot Decision Logic

### Decision: Rule-Based AI with Card Memory and Heuristics

**Rationale**:
- Scope limited to "strategically reasonable" (SC-004: 80% sound decisions)
- Rule-based simpler than ML, sufficient for solo/practice mode
- Three difficulty levels via heuristic tuning (easy, medium, hard)
- Deterministic and testable

**Bot Strategy Components**:
1. **Card Memory**: Track which cards have been revealed (initial view, peeks)
2. **Discard Pile Heuristic**: Take low cards (≤4) from discard with high probability
3. **Swap Heuristic**: Replace top-row cards (unknown) over bottom-row (known)
4. **Cambio Decision**: Call when estimated score < threshold (varies by difficulty)
5. **Power Usage**: Use peek powers on unknown cards, blind swap high-estimated cards

**Difficulty Tuning**:
- **Easy**: Poor memory, random swaps, high Cambio threshold
- **Medium**: Good memory, reasonable swaps, medium threshold
- **Hard**: Perfect memory, optimal swaps, accurate Cambio timing

**Alternatives Considered**:
- **Machine Learning**: Over-engineering, requires training data and infrastructure
- **Monte Carlo Tree Search**: Complex, unnecessary for casual gameplay
- **Random AI**: Too weak, no strategic value for practice

**References**:
- Game AI heuristics patterns
- Card game bot architectures

---

## 6. Player Reconnection & Bot Takeover

### Decision: 60-Second Grace Period with In-Memory Timer

**Rationale**:
- FR-021/FR-022: 60-second reconnection window, then bot takeover
- In-memory timer sufficient (game abandonment after 5 min handles server restart)
- WebSocket connection tracking via peer IDs
- Session-based authentication for reconnection validation

**Implementation Pattern**:
```typescript
const disconnectionTimers = new Map<string, NodeJS.Timeout>()

function handleDisconnect(playerId: string, gameId: string) {
  const timer = setTimeout(() => {
    // 60 seconds elapsed, convert player to bot
    convertPlayerToBot(playerId, gameId)
  }, 60000)

  disconnectionTimers.set(playerId, timer)
  broadcastToGame(gameId, { type: 'player_disconnected', playerId })
}

function handleReconnect(playerId: string, gameId: string) {
  clearTimeout(disconnectionTimers.get(playerId))
  disconnectionTimers.delete(playerId)
  broadcastToGame(gameId, { type: 'player_reconnected', playerId })
}
```

**Alternatives Considered**:
- **Database-persisted timers**: Over-engineering, server restart rare
- **Immediate bot takeover**: Poor UX for brief network glitches
- **Longer grace period (>60s)**: Slows game pace too much

**References**:
- WebSocket reconnection patterns
- Grace period UX best practices

---

## 7. Card Visibility & Security

### Decision: Server-Side Visibility Filtering with Player Perspective

**Rationale**:
- FR-024: Filter card visibility based on player perspective
- Prevents cheating via network inspection
- Each card has `visible_to: string[]` (player IDs who can see it)
- Server filters game state before sending to each client

**Visibility Rules**:
- **Own cards**: Initially visible bottom 2 (10s), then hidden unless peeked
- **Opponent cards**: Hidden unless peeked with power
- **Discard pile top**: Visible to all
- **Draw pile**: Hidden to all

**Implementation**:
```typescript
function filterGameStateForPlayer(gameState: GameState, playerId: string) {
  return {
    ...gameState,
    players: gameState.players.map(player => ({
      ...player,
      cards: player.cards.map(card =>
        card.visible_to.includes(playerId)
          ? card
          : { ...card, rank: null, suit: null } // Hide card face
      )
    }))
  }
}
```

**References**:
- Security in multiplayer games
- Server-authoritative architecture patterns

---

## 8. Mobile Touch Interactions

### Decision: Vue 3 Touch Events with 44x44px Minimum Targets

**Rationale**:
- Constitution Principle III: Mobile-responsive touch-first design
- SC-006: Minimum 44×44px touch targets
- Vue 3 native touch event support (`@touchstart`, `@touchend`)
- CSS `touch-action` for drag/swipe gestures

**Touch Patterns**:
- **Card Selection**: Tap card to select, tap again to confirm
- **Drag-and-Drop**: Optional enhancement, tap-to-select primary
- **Draw Pile**: Large button (60x80px minimum)
- **Discard Pile**: Large button (60x80px minimum)

**Accessibility**:
- Visual feedback on touch (highlight, scale)
- Haptic feedback via `navigator.vibrate()` (optional)
- Minimum spacing between touch targets (8px gap)

**Alternatives Considered**:
- **Drag-only interface**: Poor mobile UX, requires precise gestures
- **Smaller touch targets**: Violates constitution and UX guidelines
- **Hover interactions**: Doesn't work on touch devices

**References**:
- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/layout)
- Vue 3 event handling documentation

---

## 9. Performance & Scalability

### Decision: In-Memory Game State with PostgreSQL Persistence

**Rationale**:
- SC-007: Support 100 concurrent game sessions
- Active games cached in server memory for <500ms latency (SC-002)
- PostgreSQL for persistence (session recovery, audit log, history)
- Stateless server design (can scale horizontally if needed)

**Architecture**:
- **Hot Path**: WebSocket → In-Memory State → Broadcast (no DB read)
- **Write Path**: Action → Update Memory → Async DB Write
- **Recovery**: Server restart → Load active games from DB to memory

**Scalability Considerations**:
- 100 concurrent games × 4 players × 52 cards = ~21K objects in memory (~10MB)
- Well within Node.js memory limits (default 512MB)
- Can shard by room code if needed (future optimization)

**Alternatives Considered**:
- **Pure database**: Too slow for real-time (<500ms requirement)
- **Redis cache**: Additional dependency, in-memory sufficient for scope
- **Stateful server**: Simpler for current scale, can refactor if needed

**References**:
- Node.js performance best practices
- Real-time game server architectures

---

## 10. Testing Strategy

### Decision: Focused Testing per Constitution Principle IV

**Test Coverage Priorities** (High to Low):
1. **Game Rules**: Card values, turn order, win conditions, special powers
2. **Server Validation**: All action validation, cheating prevention
3. **State Transitions**: Game lifecycle (lobby → active → final → completed)
4. **Bot AI**: Decision logic correctness (80% reasonable moves)
5. **API Contracts**: Request/response validation, error handling

**Test Types**:
- **Unit Tests (Vitest)**: Game engine, bot AI, card deck, validation
- **E2E Tests (Playwright)**: Critical flows (create → join → play → end)
- **Manual QA**: UI/UX, mobile responsiveness, visual polish

**Not Tested** (per constitution):
- UI component unit tests (manual QA sufficient)
- Non-critical edge cases
- Performance benchmarks (manual validation against SC metrics)

**References**:
- Vitest documentation
- Playwright for Vue/Nuxt

---

## 11. TypeScript Type Safety & Validation

### Decision: Zod for Runtime Validation at API Boundaries

**Rationale**:
- Constitution Principle V: Runtime validation for client-server communication
- Zod integrates well with TypeScript (type inference)
- Single schema definition for both compile-time and runtime validation
- Validates WebSocket messages and REST payloads

**Pattern**:
```typescript
import { z } from 'zod'

// Schema definition
const GameActionSchema = z.object({
  type: z.enum(['draw_deck', 'draw_discard', 'swap', 'discard', 'power']),
  cardPosition: z.number().int().min(0).max(3).optional(),
  targetPlayerId: z.string().optional()
})

// Type inference
type GameAction = z.infer<typeof GameActionSchema>

// Runtime validation
function handleAction(rawAction: unknown) {
  const action = GameActionSchema.parse(rawAction) // Throws if invalid
  // action is now type-safe
}
```

**Validation Layers**:
- API endpoints: Validate all incoming requests
- WebSocket messages: Validate all client messages
- Database writes: Schema enforced by Drizzle types

**Alternatives Considered**:
- **Manual validation**: Error-prone, doesn't sync with types
- **JSON Schema**: Less TypeScript integration than Zod
- **io-ts**: Similar to Zod but less ergonomic

**References**:
- [Zod documentation](https://zod.dev/)
- TypeScript type safety best practices

---

## 12. Error Handling & Edge Cases

### Decision: Graceful Degradation with User-Friendly Messages

**Error Categories**:
1. **Validation Errors**: Return 400 with specific message (e.g., "Not your turn")
2. **Not Found**: Return 404 for invalid room codes or games
3. **Conflict**: Return 409 for full games, duplicate joins
4. **Server Errors**: Return 500, log details, show generic message to user

**Edge Case Handling** (from spec):
- **All players disconnect**: Game marked abandoned after 5 minutes
- **Draw pile exhausted**: Shuffle discard pile (except top card) into new draw pile
- **Power activation during disconnect**: Auto-skip power, end turn
- **Simultaneous joins to last slot**: Database unique constraint ensures one succeeds
- **Cambio before first turn**: Validate minimum one turn completed

**User Feedback**:
- Toast notifications for errors (non-blocking)
- Modal for critical errors (game ended, disconnected)
- Loading states for async actions

**References**:
- HTTP status code best practices
- Error UX patterns

---

## Summary

All technical unknowns have been resolved with concrete decisions aligned to the constitution. Key technologies and patterns:

- **Real-Time**: h3-websocket for bidirectional game updates
- **State**: Server-authoritative with event sourcing lite (action log)
- **Security**: Server-side visibility filtering, cryptographic RNG
- **AI**: Rule-based bots with card memory and heuristics
- **Mobile**: Touch-first with 44x44px targets, Vue 3 touch events
- **Validation**: Zod for runtime validation at all boundaries
- **Testing**: Focused on game rules, server validation, critical flows

**Phase 0 Complete** ✅ - Ready for Phase 1 (Data Model & Contracts)
