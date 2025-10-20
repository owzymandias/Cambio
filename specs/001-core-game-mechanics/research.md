# Research: Core Cambio Game Mechanics

**Branch**: `001-core-game-mechanics` | **Date**: 2025-10-19
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## 1. Real-Time Communication: WebSocket vs Server-Sent Events

### Decision: WebSockets

**Rationale**:
- **Bidirectional communication required**: Players send actions (draw card, swap, call Cambio) AND receive real-time updates from other players' actions. SSE is unidirectional (server → client only).
- **Low latency critical**: <500ms synchronization requirement (SC-003) benefits from WebSocket's persistent connection vs SSE's HTTP overhead.
- **Nuxt/Nitro built-in support**: Nuxt 4's Nitro server has excellent WebSocket support via `h3` library with `crossws` integration.
- **Connection state management**: WebSocket connection lifecycle maps naturally to game session lifecycle (connect = join game, disconnect = leave/reconnect).

**Alternatives Considered**:
- **Server-Sent Events (SSE)**: Rejected because unidirectional. Would require separate HTTP POST requests for player actions, adding latency and complexity.
- **HTTP Polling**: Rejected due to high latency (>500ms), inefficient server load, poor mobile battery performance.
- **Nuxt's built-in realtime utilities**: Nuxt Hub provides some real-time features, but WebSocket gives more control for game-specific needs.

**Implementation Approach**:
- Use Nitro's WebSocket support via `defineWebSocketHandler()`
- Implement room-based broadcasting (one room per game session)
- Handle reconnection with player ID verification
- Fallback to HTTP API for browsers without WebSocket support (rare, <2% of users)

**References**:
- Nuxt Nitro WebSocket docs: https://nitro.unjs.io/guide/websocket
- h3 WebSocket utilities: https://github.com/unjs/h3#websocket

---

## 2. Game State Management Pattern

### Decision: Event Sourcing Lite (Action Log + Computed State)

**Rationale**:
- **Audit trail**: Store every game action (draw, swap, power use, Cambio call) for replay, debugging, and cheat detection.
- **State reconstruction**: Can rebuild game state from action log, useful for reconnecting players or investigating disputes.
- **Simpler than full CQRS**: Don't need separate read/write models. Single source of truth in database with in-memory cache for active games.
- **Aligns with FR-019**: Server validates and stores each action before broadcasting, ensuring authoritative state.

**Alternatives Considered**:
- **Snapshot-only state**: Rejected because loses action history, makes debugging impossible, no replay capability.
- **Full Event Sourcing (CQRS)**: Over-engineered for a card game. Adds complexity without proportional benefit at this scale.
- **Pure in-memory (no persistence)**: Rejected because can't handle server restarts, no reconnection support.

**Implementation**:
```typescript
// Database tables
- game_sessions (id, status, current_turn, created_at)
- game_players (game_id, user_id, position, cards, bot_type)
- game_actions (id, game_id, player_id, action_type, payload, timestamp)

// In-memory cache
- ActiveGameCache (Map<gameId, GameState>) - hot game data for fast reads
- Invalidate on game completion, rebuild from DB on server restart
```

---

## 3. Bot AI Strategy: Rule-Based State Machine

### Decision: Simple rule-based decision tree with card memory

**Rationale**:
- **Meets SC-004**: "80% strategically reasonable moves" - doesn't require ML or complex algorithms
- **Fast execution**: Bot decisions in <100ms, well under 1-3 second requirement
- **Predictable behavior**: Easier to test and debug than neural networks
- **Incremental improvement**: Can add more sophisticated rules over time if needed

**Bot Decision Logic**:
```
1. Card Memory:
   - Track which cards bot has seen (own peek, opponent reveals)
   - Estimate opponent card values based on their actions

2. Turn Decision (draw vs discard pile):
   - If discard pile card is low (≤4): take it, swap with estimated high card
   - Otherwise: draw from deck

3. Swap Decision:
   - Prefer swapping cards in top row (unseen) over bottom row (seen at start)
   - Target highest estimated value card in hand

4. Special Power Decisions:
   - Peek own: Target unseen cards first
   - Peek opponent: Target opponent with most unknown cards
   - Blind swap: Swap top-row card with opponent's estimated high card

5. Cambio Decision:
   - Estimate own score from known/peeked cards
   - Estimate opponent scores from visible actions
   - Call Cambio if confidence >70% of having lowest score
```

**Alternatives Considered**:
- **Random moves**: Too weak, players would never lose, no practice value
- **Machine learning**: Over-engineered, requires training data and infrastructure
- **Monte Carlo Tree Search**: Too slow for real-time gameplay, overkill for simple card game

---

## 4. Card Shuffling: Fisher-Yates with Crypto-Secure RNG

### Decision: Fisher-Yates shuffle with `crypto.randomInt()`

**Rationale**:
- **Fair and unbiased**: Fisher-Yates guarantees uniform distribution of all permutations
- **Cryptographically secure**: Node's `crypto.randomInt()` prevents prediction attacks
- **Standard practice**: Industry standard for card game shuffling
- **Meets assumption**: "Card shuffling uses cryptographically secure random number generator" (spec line 161)

**Implementation**:
```typescript
import { randomInt } from 'node:crypto'

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
```

**Alternatives Considered**:
- **Math.random()**: Not cryptographically secure, predictable with enough observations
- **Third-party shuffle libraries**: Unnecessary dependency, Fisher-Yates is simple enough to implement

---

## 5. Player Reconnection Strategy

### Decision: 60-second grace period with session token validation

**Rationale**:
- **Matches spec assumption**: "60 seconds balanced approach" (line 163)
- **Handles network blips**: Mobile users frequently experience brief disconnects
- **Prevents abuse**: Session tokens prevent unauthorized reconnection as different player
- **Bot takeover fallback**: If >60s, AI bot takes over to keep game moving

**Reconnection Flow**:
```
1. Player disconnects:
   - Mark player as "disconnected" in game state
   - Start 60-second timer
   - Pause turn timer if it's their turn
   - Broadcast "Player X disconnected" to other players

2. Player reconnects within 60s:
   - Verify session token matches player ID
   - Send full game state snapshot
   - Resume turn timer
   - Broadcast "Player X reconnected"

3. Player doesn't reconnect within 60s:
   - Convert player to AI bot for remainder of game
   - Bot uses rule-based strategy (research item #3)
   - Broadcast "Player X replaced by bot"
   - Game continues without pause
```

**Alternatives Considered**:
- **No reconnection**: Too harsh, mobile users would abandon games
- **Infinite wait**: Unfair to other players, games would stall
- **30-second window**: Too short for users to close app and reopen
- **Game pause until return**: Vulnerable to griefing, poor UX for waiting players

---

## 6. Database Schema Best Practices for Real-Time Games

### Decision: Optimistic locking with version numbers

**Rationale**:
- **Prevents race conditions**: Multiple players acting simultaneously won't corrupt state
- **Better than pessimistic locks**: No deadlocks, better performance for web-scale
- **Drizzle ORM support**: Can use `WHERE version = X` and increment on update

**Pattern**:
```typescript
// Optimistic lock on turn actions
UPDATE game_sessions
SET current_turn = next_player,
    version = version + 1,
    updated_at = NOW()
WHERE id = ? AND version = ?
-- If affected rows = 0, version mismatch, retry with fresh read
```

**Alternatives Considered**:
- **Row-level locks (SELECT FOR UPDATE)**: Slower, risk of deadlocks with multiple updates
- **No concurrency control**: Rejected due to risk of data corruption with simultaneous actions
- **Redis-based locking**: Over-engineered, PostgreSQL sufficient for <100 concurrent games

---

## 7. Mobile Touch Interactions for Card Game

### Decision: Vue Touch Events with Gesture Recognition

**Rationale**:
- **Native to Vue 3**: `@touchstart`, `@touchmove`, `@touchend` events built-in
- **Custom gestures**: Can detect tap, long-press (peek), swipe (discard)
- **Meets mobile-first principle**: No hover dependencies, 44x44px touch targets
- **Haptic feedback**: Can add `navigator.vibrate()` for tactile card interactions

**Touch Gestures**:
```
- Tap card: Select for swap/peek target
- Long-press card (500ms): Quick peek at own card (if power allows)
- Drag card to discard pile: Discard with animation
- Tap draw pile: Draw card
- Tap discard pile: Take from discard
```

**Alternatives Considered**:
- **Third-party gesture library**: VueUse has `useSwipe`, but custom implementation gives more control
- **Mouse-only with mobile polyfill**: Rejected, doesn't feel native on touch devices
- **Drag-and-drop API**: Too complex for simple tap interactions, poor mobile support

---

## Summary of Decisions

| Topic | Decision | Key Benefit |
|-------|----------|-------------|
| Real-time Communication | WebSockets | Bidirectional, low latency (<500ms) |
| State Management | Event Sourcing Lite | Action audit trail, state reconstruction |
| Bot AI | Rule-based decision tree | Fast, predictable, 80% reasonable moves |
| Card Shuffling | Fisher-Yates + crypto RNG | Fair, secure, industry standard |
| Reconnection | 60s grace + bot takeover | Handles network blips, prevents stalling |
| Concurrency Control | Optimistic locking | No deadlocks, good performance |
| Touch Interactions | Vue native touch events | Mobile-first, native feel |

All decisions align with constitution principles and resolve NEEDS CLARIFICATION items.
