# Quick Start: Cambio Game Mechanics Development

**Branch**: `001-core-game-mechanics`
**Audience**: Developers implementing the core game features

## Prerequisites

- Node.js 22+ installed
- PostgreSQL database running
- Better Auth configured (from base NuxSaaS project)
- Git repository cloned

## Initial Setup

```bash
# 1. Checkout the feature branch
git checkout 001-core-game-mechanics

# 2. Install dependencies (if not already done)
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env to configure DATABASE_URL and other required vars

# 4. Generate database schema for game tables
npm run db:generate

# 5. Apply migrations
npm run db:migrate

# 6. Start development server
npm run dev
```

Visit `http://localhost:3000` - you should see the existing NuxSaaS home page.

---

## Development Workflow

### Phase 1: Database Schema (Start Here)

Create the game database schema in `server/database/schema/game.ts`:

```typescript
// server/database/schema/game.ts
import { pgTable, uuid, varchar, integer, timestamp, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core'

export const gameStatusEnum = pgEnum('game_status', ['waiting', 'active', 'final_round', 'completed', 'abandoned'])
export const gamePhaseEnum = pgEnum('game_phase', ['setup', 'initial_view', 'playing', 'final_round', 'scoring', 'complete'])

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomCode: varchar('room_code', { length: 6 }).notNull().unique(),
  status: gameStatusEnum('status').notNull().default('waiting'),
  currentTurn: integer('current_turn').notNull().default(0),
  phase: gamePhaseEnum('phase').notNull().default('setup'),
  drawPile: jsonb('draw_pile').notNull(),
  discardPile: jsonb('discard_pile').notNull(),
  cambioCallerId: uuid('cambio_caller_id'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
})

// ... add gamePlayers, gameActions, gameHistory tables (see data-model.md)
```

**Generate migration**:
```bash
npm run db:generate
npm run db:migrate
```

---

### Phase 2: Shared Types

Define TypeScript interfaces in `app/types/game.ts`:

```typescript
// app/types/game.ts
export interface Card {
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: number // 0-10
  visible_to: string[] // player IDs
}

export interface GameState {
  id: string
  room_code: string
  status: 'waiting' | 'active' | 'final_round' | 'completed'
  phase: 'setup' | 'initial_view' | 'playing' | 'final_round' | 'complete'
  current_turn: number
  players: Player[]
  draw_pile_count: number
  top_discard: Card | null
}

export interface Player {
  id: string
  user_id: string | null
  position: number
  is_bot: boolean
  cards: Card[] // Length 4
  score: number
  connection_status: 'connected' | 'disconnected' | 'bot_takeover'
}
```

---

### Phase 3: Server-Side Game Logic

Implement core game engine in `server/services/game/`:

**File Structure**:
```
server/services/game/
├── cardDeck.ts        # Shuffle, deal, deck management
├── gameEngine.ts      # Turn processing, rule enforcement
├── gameSession.ts     # Session lifecycle, player management
├── botAI.ts           # AI decision logic
└── specialPowers.ts   # Power activation handlers
```

**Example: cardDeck.ts**
```typescript
// server/services/game/cardDeck.ts
import { randomInt } from 'node:crypto'
import type { Card } from '~/types/game'

export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
  const ranks: Card['rank'][] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
  const values: Record<Card['rank'], number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 10, 'Q': 10, 'K': 0, 'A': 1
  }

  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit, value: values[rank], visible_to: [] })
    }
  }

  return shuffleDeck(deck)
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(deck: Card[], playerCount: number): { hands: Card[][], remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])

  // Deal 4 cards to each player
  for (let i = 0; i < 4; i++) {
    for (let p = 0; p < playerCount; p++) {
      hands[p].push(deck.pop()!)
    }
  }

  return { hands, remaining: deck }
}
```

---

### Phase 4: API Endpoints

Create REST API handlers in `server/api/game/`:

**Example: create.post.ts**
```typescript
// server/api/game/create.post.ts
import { z } from 'zod'
import { createDeck, dealCards } from '~/server/services/game/cardDeck'

const createGameSchema = z.object({
  player_count: z.number().min(2).max(4),
  bot_count: z.number().min(0).max(3).default(0),
  bot_difficulty: z.enum(['easy', 'medium', 'hard']).default('medium')
})

export default defineEventHandler(async (event) => {
  // 1. Validate request body
  const body = await readBody(event)
  const { player_count, bot_count, bot_difficulty } = createGameSchema.parse(body)

  // 2. Get authenticated user
  const session = await requireUserSession(event)
  const userId = session.user.id

  // 3. Generate room code
  const roomCode = generateRoomCode() // 6-char alphanumeric

  // 4. Create game session
  const deck = createDeck()
  const gameId = await db.insert(gameSessions).values({
    roomCode,
    status: 'waiting',
    phase: 'setup',
    drawPile: JSON.stringify(deck),
    discardPile: JSON.stringify([]),
  }).returning({ id: gameSessions.id })

  // 5. Add human player
  await db.insert(gamePlayers).values({
    gameId: gameId[0].id,
    userId,
    position: 0,
    isBot: false,
    cards: JSON.stringify([]), // Dealt when game starts
  })

  // 6. Add AI bots if requested
  for (let i = 0; i < bot_count; i++) {
    await db.insert(gamePlayers).values({
      gameId: gameId[0].id,
      userId: null,
      position: i + 1,
      isBot: true,
      botDifficulty: bot_difficulty,
      cards: JSON.stringify([]),
    })
  }

  return {
    game_id: gameId[0].id,
    room_code: roomCode,
    status: 'waiting',
  }
})

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar-looking chars
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
```

**Test the endpoint**:
```bash
curl -X POST http://localhost:3000/api/game/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{"player_count": 2, "bot_count": 1}'

# Response:
# {
#   "game_id": "uuid...",
#   "room_code": "ABC123",
#   "status": "waiting"
# }
```

---

### Phase 5: WebSocket Real-Time Events

Implement WebSocket handler in `server/api/game/ws.ts`:

```typescript
// server/api/game/ws.ts
import { defineWebSocketHandler } from 'h3'

const gameRooms = new Map<string, Set<any>>() // gameId → Set of peers

export default defineWebSocketHandler({
  open(peer) {
    console.log('[WS] Client connected:', peer.id)
  },

  message(peer, message) {
    const data = JSON.parse(message.text())

    switch (data.type) {
      case 'join_game': {
        // Subscribe peer to game room
        const gameId = data.game_id
        peer.subscribe(`game:${gameId}`)

        // Broadcast join event
        peer.publish(`game:${gameId}`, JSON.stringify({
          type: 'game_joined',
          player_id: data.player_id,
          timestamp: new Date().toISOString()
        }))
        break
      }

      case 'leave_game': {
        const gameId = data.game_id
        peer.unsubscribe(`game:${gameId}`)

        peer.publish(`game:${gameId}`, JSON.stringify({
          type: 'player_disconnected',
          player_id: data.player_id,
          timestamp: new Date().toISOString()
        }))
        break
      }
    }
  },

  close(peer) {
    console.log('[WS] Client disconnected:', peer.id)
    // TODO: Start 60-second reconnection timer for player
  },

  error(peer, error) {
    console.error('[WS] Error:', error)
  }
})
```

---

### Phase 6: Client Components

Create Vue components in `app/components/game/`:

**Example: GameBoard.vue**
```vue
<template>
  <div class="game-board">
    <div class="opponents">
      <PlayerHand
        v-for="opponent in opponents"
        :key="opponent.id"
        :player="opponent"
        :is-opponent="true"
      />
    </div>

    <div class="center-area">
      <DrawPile :count="drawPileCount" @click="drawFromDeck" />
      <DiscardPile :top-card="topDiscard" @click="drawFromDiscard" />
    </div>

    <div class="current-player">
      <PlayerHand :player="currentPlayer" :is-opponent="false" />
      <CambioButton @click="callCambio" :disabled="!canCallCambio" />
    </div>

    <TurnIndicator :current-turn="gameState.current_turn" />
  </div>
</template>

<script setup lang="ts">
import type { GameState } from '~/types/game'

const props = defineProps<{
  gameState: GameState
}>()

const currentPlayer = computed(() =>
  props.gameState.players.find(p => p.user_id === useAuth().user.value?.id)
)

const opponents = computed(() =>
  props.gameState.players.filter(p => p.id !== currentPlayer.value?.id)
)

const drawPileCount = computed(() => props.gameState.draw_pile_count)
const topDiscard = computed(() => props.gameState.top_discard)

const canCallCambio = computed(() =>
  props.gameState.phase === 'playing' && !props.gameState.cambio_caller_id
)

async function drawFromDeck() {
  await $fetch(`/api/game/${props.gameState.id}/action`, {
    method: 'POST',
    body: { action_type: 'draw_from_deck' }
  })
}

async function callCambio() {
  await $fetch(`/api/game/${props.gameState.id}/cambio`, { method: 'POST' })
}
</script>
```

---

### Phase 7: WebSocket Integration

Use composable to connect to WebSocket:

```typescript
// app/composables/useGameState.ts
export function useGameState(gameId: string) {
  const gameState = ref<GameState | null>(null)
  const { connect, disconnect } = useWebSocket(gameId)

  // Fetch initial state
  async function loadGame() {
    const data = await $fetch(`/api/game/${gameId}/state`)
    gameState.value = data
  }

  // Connect to WebSocket for real-time updates
  function connectRealtime() {
    connect({
      onMessage: (event) => {
        const data = JSON.parse(event.data)

        // Update local state based on event type
        switch (data.type) {
          case 'turn_changed':
            if (gameState.value) {
              gameState.value.current_turn = data.current_turn
              gameState.value.phase = data.phase
            }
            break

          case 'card_drawn':
            // Update UI to show card drawn
            break

          // ... handle other events
        }
      }
    })
  }

  onMounted(async () => {
    await loadGame()
    connectRealtime()
  })

  onUnmounted(() => {
    disconnect()
  })

  return { gameState }
}
```

---

## Testing Strategy

### Unit Tests (server/services/game/)

```bash
# Run unit tests
npm run test

# With coverage
npm run coverage
```

**Example test**:
```typescript
// tests/unit/gameEngine.test.ts
import { describe, it, expect } from 'vitest'
import { calculateScore } from '~/server/services/game/gameEngine'

describe('Game Engine - Scoring', () => {
  it('calculates correct score for number cards', () => {
    const cards = [
      { rank: '2', suit: 'hearts', value: 2, visible_to: [] },
      { rank: '7', suit: 'clubs', value: 7, visible_to: [] },
      { rank: '10', suit: 'spades', value: 10, visible_to: [] },
      { rank: 'A', suit: 'diamonds', value: 1, visible_to: [] }
    ]

    expect(calculateScore(cards)).toBe(20) // 2+7+10+1
  })

  it('calculates King as 0 points', () => {
    const cards = [
      { rank: 'K', suit: 'hearts', value: 0, visible_to: [] },
      { rank: 'K', suit: 'clubs', value: 0, visible_to: [] },
      { rank: '3', suit: 'spades', value: 3, visible_to: [] },
      { rank: '5', suit: 'diamonds', value: 5, visible_to: [] }
    ]

    expect(calculateScore(cards)).toBe(8) // 0+0+3+5
  })
})
```

### E2E Tests (Playwright)

```bash
# Run Playwright tests
npm run test:e2e

# With UI
npm run test:e2e:ui
```

**Example E2E test**:
```typescript
// tests/e2e-playwright/game-flow.spec.ts
import { test, expect } from '@playwright/test'

test('complete game flow: create, join, play, win', async ({ page, context }) => {
  // Login as player 1
  await page.goto('/signin')
  await page.fill('input[name="email"]', 'player1@test.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // Create game
  await page.goto('/game/lobby')
  await page.click('button:text("Create Game")')

  // Wait for game to be created
  await expect(page.locator('.room-code')).toBeVisible()
  const roomCode = await page.locator('.room-code').textContent()

  // Player 2 joins in new tab
  const page2 = await context.newPage()
  await page2.goto('/game/lobby')
  await page2.fill('input[name="room_code"]', roomCode!)
  await page2.click('button:text("Join")')

  // Game should start
  await expect(page.locator('.game-board')).toBeVisible()
  await expect(page2.locator('.game-board')).toBeVisible()

  // Player 1 takes turn
  await page.click('.draw-pile')
  await page.click('.card[data-position="0"]') // Swap with first card

  // Verify turn changed
  await expect(page2.locator('.your-turn')).toBeVisible()
})
```

---

## Debugging Tips

### View Database State
```bash
# Connect to PostgreSQL
psql -d cambio_dev

# Query game sessions
SELECT * FROM game_sessions;

# Query players in a game
SELECT * FROM game_players WHERE game_id = 'your-game-uuid';

# View action log
SELECT * FROM game_actions WHERE game_id = 'your-game-uuid' ORDER BY sequence_number;
```

### WebSocket Debugging
Open browser DevTools → Network → WS tab to see WebSocket frames.

Or use `wscat` for CLI testing:
```bash
npm install -g wscat
wscat -c "ws://localhost:3000/api/game/ws?token=<jwt>"

# Send join message
> {"type":"join_game","game_id":"uuid","player_id":"uuid"}

# Observe events
< {"type":"game_joined",...}
```

---

## Next Steps

After completing the implementation:

1. Run `npm run test:all` to verify all tests pass
2. Test on mobile device (use ngrok or similar for remote access)
3. Playtest with 2-4 real users to validate game mechanics
4. Review against [spec.md](./spec.md) acceptance criteria
5. Create pull request for code review

See [tasks.md](./tasks.md) for detailed implementation task breakdown (generated by `/speckit.tasks` command).

---

## Reference Links

- [Feature Spec](./spec.md) - Full requirements and user stories
- [Data Model](./data-model.md) - Database schema and entity relationships
- [API Contracts](./contracts/game-api.yaml) - REST API OpenAPI spec
- [WebSocket Events](./contracts/websocket-events.md) - Real-time event documentation
- [Research](./research.md) - Technical decisions and rationale

Happy coding! 🃏
