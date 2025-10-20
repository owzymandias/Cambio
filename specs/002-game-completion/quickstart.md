# Quickstart: Game Completion - Special Powers & Scoring

**Feature**: Game Completion - Special Powers & Scoring
**Branch**: `002-game-completion`
**Date**: 2025-10-20

## Overview

This quickstart guides implementation of special card powers, Cambio call mechanism, and scoring/winner determination for the Cambio card game. Follow the phases sequentially to build on existing infrastructure from `001-core-game-mechanics`.

---

## Prerequisites

**Before starting**, ensure:
- ✅ Branch `001-core-game-mechanics` merged to main (Phases 1-4 complete)
- ✅ Database schema includes `special_power` and `game_score` tables
- ✅ Existing API endpoints for draw/swap/discard are functional
- ✅ WebSocket (SSE) real-time events working for game state updates
- ✅ Development environment set up (`npm run dev` works, database connected)

**Create feature branch**:
```bash
git checkout -b 002-game-completion
```

---

## Phase 1: Database Migration

**Duration**: ~15 minutes
**Goal**: Add `hasTakenFinalTurn` column to track final round progress.

### Step 1.1: Create Drizzle Migration

```bash
npm run db:generate
```

Update the generated migration file (in `server/database/migrations/`) to include:

```sql
ALTER TABLE player ADD COLUMN has_taken_final_turn BOOLEAN DEFAULT FALSE NOT NULL;

-- Optional performance indexes
CREATE INDEX idx_player_final_turn ON player(game_session_id, has_taken_final_turn) WHERE has_taken_final_turn = false;
CREATE INDEX idx_game_score_game ON game_score(game_session_id);
CREATE INDEX idx_special_power_game ON special_power(game_session_id, created_at);
```

### Step 1.2: Update Drizzle Schema

Edit `server/database/schema/game.ts`:

```typescript
export const player = pgTable('player', {
  // ... existing fields ...
  hasTakenFinalTurn: boolean('has_taken_final_turn').notNull().default(false),
  // ... existing fields ...
})
```

### Step 1.3: Run Migration

```bash
npm run db:migrate
```

**Checkpoint**: Verify migration succeeded, column exists in database.

---

## Phase 2: Server-Side Game Logic

**Duration**: ~2 hours
**Goal**: Implement service layer functions for powers, Cambio, and scoring.

### Step 2.1: Create `server/utils/gameService.ts`

Implement core game logic functions:

```typescript
// server/utils/gameService.ts
import { db } from './db'
import { gameSession, player, card, specialPower, gameScore, turn } from '~/server/database/schema/game'
import { eq, and, ne } from 'drizzle-orm'
import { broadcastToGame, broadcastToPlayer } from './gameSocket'

export async function activateSpecialPower(
  gameId: string,
  playerId: string,
  powerRequest: PowerActivationRequest
): Promise<PowerActivationResult> {
  return await db.transaction(async (tx) => {
    // Lock game session to prevent race conditions
    const [game] = await tx
      .select()
      .from(gameSession)
      .where(eq(gameSession.id, gameId))
      .for('update')

    // Validate: Is it player's turn? Is phase correct? Was power card just discarded?
    // (Implementation details based on research.md patterns)

    // Execute power based on type
    if (powerRequest.powerType === 'peek_own' || powerRequest.powerType === 'peek_opponent') {
      // Update card visibility, broadcast private reveal, start 5s timer
    } else if (powerRequest.powerType === 'blind_swap') {
      // Swap card owners, broadcast public swap event
    } else if (powerRequest.powerType === 'look_own') {
      // Auto-select random card, reveal to player
    }

    // Record power activation in special_power table
    // Return success response
  })
}

export async function callCambio(
  gameId: string,
  playerId: string
): Promise<CambioCallResult> {
  return await db.transaction(async (tx) => {
    const [game] = await tx
      .select()
      .from(gameSession)
      .where(eq(gameSession.id, gameId))
      .for('update')

    // Validate: phase = 'playing', cambioCallerId is NULL, current turn is playerId

    // Update game: phase = 'final_round', cambioCallerId = playerId
    await tx.update(gameSession).set({
      phase: 'final_round',
      cambioCallerId: playerId,
    }).where(eq(gameSession.id, gameId))

    // Mark caller as having taken their turn (they forfeit)
    await tx.update(player).set({
      hasTakenFinalTurn: true,
    }).where(eq(player.id, playerId))

    // Broadcast CAMBIO_CALLED event
    broadcastToGame(gameId, { type: 'CAMBIO_CALLED', playerId, callerName: '...' })

    // Advance to next player
    // Return success response
  })
}

export async function completeGame(gameId: string): Promise<void> {
  return await db.transaction(async (tx) => {
    // Query all players and their hand cards
    const players = await tx.select().from(player).where(eq(player.gameSessionId, gameId))
    const cards = await tx.select().from(card).where(and(
      eq(card.gameSessionId, gameId),
      eq(card.location, 'hand')
    ))

    // Calculate base scores
    const playerScores = new Map<string, number>()
    for (const p of players) {
      const playerCards = cards.filter(c => c.ownerId === p.id)
      const baseScore = playerCards.reduce((sum, c) => sum + c.pointValue, 0)
      playerScores.set(p.id, baseScore)
    }

    // Find lowest score
    const lowestScore = Math.min(...playerScores.values())

    // Apply penalty if Cambio caller didn't have lowest
    const game = await tx.select().from(gameSession).where(eq(gameSession.id, gameId)).get()
    let finalScores = new Map(playerScores)
    if (game.cambioCallerId) {
      const callerScore = playerScores.get(game.cambioCallerId)!
      if (callerScore !== lowestScore) {
        finalScores.set(game.cambioCallerId, callerScore * 2) // Double penalty
      }
    }

    // Determine winner(s) (lowest final score)
    const lowestFinalScore = Math.min(...finalScores.values())
    const winners = [...finalScores.entries()].filter(([_, score]) => score === lowestFinalScore).map(([id]) => id)

    // Insert game_score records
    for (const p of players) {
      const baseScore = playerScores.get(p.id)!
      const finalScore = finalScores.get(p.id)!
      const isCambioCaller = p.id === game.cambioCallerId
      const penaltyApplied = isCambioCaller && finalScore !== baseScore
      const isWinner = winners.includes(p.id)

      await tx.insert(gameScore).values({
        gameSessionId: gameId,
        playerId: p.id,
        finalScore,
        isCambioCaller,
        penaltyApplied,
        isWinner,
        cardsSummary: cards.filter(c => c.ownerId === p.id).map(c => ({ rank: c.rank, suit: c.suit, pointValue: c.pointValue })),
      })
    }

    // Update game: phase = 'completed', winnerId = first winner, completedAt = NOW
    await tx.update(gameSession).set({
      phase: 'completed',
      winnerId: winners[0] || null,
      completedAt: new Date(),
    }).where(eq(gameSession.id, gameId))

    // Broadcast GAME_COMPLETED event with scores
    broadcastToGame(gameId, { type: 'GAME_COMPLETED', scores: [...] })
  })
}
```

### Step 2.2: Create `server/utils/powerHelpers.ts`

Extract power-specific validation and helper functions:

```typescript
// server/utils/powerHelpers.ts

export function validatePowerTarget(
  powerType: SpecialPowerType,
  cardIndex: number,
  targetPlayerId?: string,
  allPlayers: Player[] = [],
  playerCards: Card[] = []
): { valid: boolean, error?: string } {
  // Validate card index in range 0-3
  if (cardIndex < 0 || cardIndex > 3) {
    return { valid: false, error: 'Card index out of range (expected 0-3)' }
  }

  // Validate target player exists (for peek_opponent, blind_swap)
  if ((powerType === 'peek_opponent' || powerType === 'blind_swap') && !targetPlayerId) {
    return { valid: false, error: 'Target player required' }
  }

  // Additional validations...
  return { valid: true }
}

export function selectRandomCard(playerCards: Card[]): Card {
  const randomIndex = Math.floor(Math.random() * playerCards.length)
  return playerCards[randomIndex]
}

export async function applyPeekPower(
  cardId: string,
  playerId: string,
  gameId: string,
  durationMs: number = 5000
): Promise<void> {
  // Update card visibility to 'peeking'
  await db.update(card).set({ visibility: 'peeking' }).where(eq(card.id, cardId))

  // Broadcast private CARD_REVEALED event to player
  const revealedCard = await db.select().from(card).where(eq(card.id, cardId)).get()
  broadcastToPlayer(gameId, playerId, {
    type: 'CARD_REVEALED',
    cardId,
    card: { rank: revealedCard.rank, suit: revealedCard.suit, pointValue: revealedCard.pointValue },
    expiresAt: Date.now() + durationMs,
  })

  // Schedule auto-hide after durationMs
  setTimeout(async () => {
    await db.update(card).set({ visibility: 'hidden' }).where(eq(card.id, cardId))
    broadcastToPlayer(gameId, playerId, { type: 'CARD_HIDDEN', cardId })
  }, durationMs)
}
```

**Checkpoint**: Service functions compile without errors. Run `npm run build` to verify.

---

## Phase 3: API Endpoints

**Duration**: ~1 hour
**Goal**: Implement API routes that call service functions with validation.

### Step 3.1: Implement `server/api/game/[id]/power.post.ts`

```typescript
import { PowerActivationRequestSchema } from '~/shared/types/game'
import { activateSpecialPower } from '~/server/utils/gameService'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Handle skip request
  if (body.skip === true) {
    // Mark turn as completed, advance to next player
    return { success: true, message: 'Power skipped' }
  }

  // Validate request with Zod
  const validated = PowerActivationRequestSchema.parse(body)

  // Get player ID from session/auth
  const playerId = event.context.user?.playerId // Adjust based on auth setup

  // Call service function
  const result = await activateSpecialPower(gameId, playerId, validated)

  return result
})
```

### Step 3.2: Implement `server/api/game/[id]/cambio.post.ts`

```typescript
import { callCambio } from '~/server/utils/gameService'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const playerId = event.context.user?.playerId

  const result = await callCambio(gameId, playerId)

  return result
})
```

### Step 3.3: Implement `server/api/game/[id]/scores.get.ts`

```typescript
import { db } from '~/server/utils/db'
import { gameSession, gameScore, player } from '~/server/database/schema/game'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')

  // Verify game is completed
  const [game] = await db.select().from(gameSession).where(eq(gameSession.id, gameId))

  if (!game) {
    throw createError({ statusCode: 404, message: 'Game not found' })
  }

  if (game.phase !== 'completed') {
    throw createError({ statusCode: 409, message: 'Game not completed yet', data: { currentPhase: game.phase } })
  }

  // Query scores with player details
  const scores = await db
    .select()
    .from(gameScore)
    .leftJoin(player, eq(gameScore.playerId, player.id))
    .where(eq(gameScore.gameSessionId, gameId))

  const winners = scores.filter(s => s.game_score.isWinner)

  return {
    gameId,
    phase: game.phase,
    completedAt: game.completedAt,
    cambioCallerId: game.cambioCallerId,
    scores: scores.map(s => ({
      playerId: s.game_score.playerId,
      displayName: s.player.displayName,
      baseScore: s.game_score.finalScore / (s.game_score.penaltyApplied ? 2 : 1), // Reverse penalty for display
      finalScore: s.game_score.finalScore,
      isCambioCaller: s.game_score.isCambioCaller,
      penaltyApplied: s.game_score.penaltyApplied,
      isWinner: s.game_score.isWinner,
      cards: s.game_score.cardsSummary,
    })),
    winners: winners.map(w => ({
      playerId: w.game_score.playerId,
      displayName: w.player.displayName,
      finalScore: w.game_score.finalScore,
    })),
  }
})
```

**Checkpoint**: Test API endpoints with `curl` or Postman. Verify 501 errors replaced with actual responses.

---

## Phase 4: Client Components

**Duration**: ~3 hours
**Goal**: Build Vue components for power modal, Cambio button, and scoreboard.

### Step 4.1: Create `app/components/Game/PowerModal.vue`

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  powerType: 'peek_own' | 'peek_opponent' | 'blind_swap' | 'look_own'
  players: Player[]
  myCards: Card[]
}>()

const emit = defineEmits<{
  activate: [target: PowerTarget]
  skip: []
}>()

const isOpen = ref(true)
const selectedCardIndex = ref<number>()
const selectedOpponentId = ref<string>()

const canSubmit = computed(() => {
  if (props.powerType === 'peek_own' || props.powerType === 'look_own') {
    return selectedCardIndex.value !== undefined
  }
  return selectedCardIndex.value !== undefined && selectedOpponentId.value
})

function handleActivate() {
  emit('activate', {
    powerType: props.powerType,
    cardIndex: selectedCardIndex.value,
    targetPlayerId: selectedOpponentId.value,
  })
  isOpen.value = false
}

function handleSkip() {
  emit('skip')
  isOpen.value = false
}
</script>

<template>
  <UModal v-model="isOpen" prevent-close>
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ powerType === 'peek_own' ? 'Peek at Your Card' : 'Use Special Power' }}
        </h3>
      </template>

      <div class="space-y-4">
        <!-- Card selection grid (2x2) -->
        <div v-if="powerType !== 'look_own'" class="grid grid-cols-2 gap-4">
          <button
            v-for="(card, index) in myCards"
            :key="index"
            class="btn-card-select"
            :class="{ selected: selectedCardIndex === index }"
            @click="selectedCardIndex = index"
          >
            Position {{ index + 1 }}
          </button>
        </div>

        <!-- Opponent selection (for peek_opponent, blind_swap) -->
        <div v-if="powerType === 'peek_opponent' || powerType === 'blind_swap'">
          <label>Select opponent:</label>
          <select v-model="selectedOpponentId">
            <option v-for="p in players" :key="p.id" :value="p.id">
              {{ p.displayName }}
            </option>
          </select>
        </div>

        <!-- Auto-peek display (for look_own) -->
        <div v-if="powerType === 'look_own'">
          <p class="text-sm text-gray-600">Card will be auto-selected</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton color="gray" @click="handleSkip">Skip</UButton>
          <UButton :disabled="!canSubmit" @click="handleActivate">Activate</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<style scoped>
.btn-card-select {
  @apply min-h-[44px] min-w-[44px] border-2 rounded-lg hover:bg-gray-100;
}
.btn-card-select.selected {
  @apply bg-blue-500 text-white border-blue-600;
}
</style>
```

### Step 4.2: Create `app/components/Game/CambioButton.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  canCallCambio: boolean
  gamePhase: string
}>()

const emit = defineEmits<{
  callCambio: []
}>()

const showConfirm = ref(false)

function handleClick() {
  if (props.canCallCambio && props.gamePhase === 'playing') {
    showConfirm.value = true
  }
}

function confirmCambio() {
  emit('callCambio')
  showConfirm.value = false
}
</script>

<template>
  <div>
    <UButton
      color="red"
      size="lg"
      :disabled="!canCallCambio || gamePhase !== 'playing'"
      @click="handleClick"
    >
      Call Cambio!
    </UButton>

    <UModal v-model="showConfirm">
      <UCard>
        <template #header>Confirm Cambio Call</template>
        <p>Are you sure you want to call Cambio? Your turn will end immediately.</p>
        <template #footer>
          <UButton color="gray" @click="showConfirm = false">Cancel</UButton>
          <UButton color="red" @click="confirmCambio">Confirm</UButton>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
```

### Step 4.3: Create `app/components/Game/ScoreBoard.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  scores: PlayerScore[]
}>()
</script>

<template>
  <div class="scoreboard">
    <h2 class="text-2xl font-bold mb-4">Final Scores</h2>
    <table class="w-full">
      <thead>
        <tr>
          <th>Player</th>
          <th>Cards</th>
          <th>Base Score</th>
          <th>Penalty</th>
          <th>Final Score</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="score in scores" :key="score.playerId" :class="{ winner: score.isWinner }">
          <td>
            {{ score.displayName }}
            <span v-if="score.isCambioCaller" class="badge">Cambio Caller</span>
          </td>
          <td>
            <div class="flex gap-1">
              <span v-for="card in score.cards" :key="`${card.rank}-${card.suit}`">
                {{ card.rank }}{{ card.suit[0].toUpperCase() }}
              </span>
            </div>
          </td>
          <td>{{ score.baseScore }}</td>
          <td>{{ score.penaltyApplied ? 'x2' : '-' }}</td>
          <td class="font-bold">{{ score.finalScore }}</td>
          <td>
            <span v-if="score.isWinner" class="text-green-600 font-bold">WINNER</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.scoreboard { @apply p-6 bg-white rounded-lg shadow; }
tr.winner { @apply bg-green-50; }
.badge { @apply ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded; }
</style>
```

**Checkpoint**: Components render in isolation. Test with mock props.

---

## Phase 5: Integration & Testing

**Duration**: ~2 hours
**Goal**: Wire up client components to API, test full gameplay flow.

### Step 5.1: Update `app/composables/useGameActions.ts`

```typescript
export function useGameActions(gameId: string) {
  const { $fetch } = useNuxtApp()

  async function activatePower(powerRequest: PowerActivationRequest) {
    return await $fetch(`/api/game/${gameId}/power`, {
      method: 'POST',
      body: powerRequest,
    })
  }

  async function skipPower() {
    return await $fetch(`/api/game/${gameId}/power`, {
      method: 'POST',
      body: { skip: true },
    })
  }

  async function callCambio() {
    return await $fetch(`/api/game/${gameId}/cambio`, {
      method: 'POST',
    })
  }

  async function getScores() {
    return await $fetch(`/api/game/${gameId}/scores`)
  }

  return {
    activatePower,
    skipPower,
    callCambio,
    getScores,
  }
}
```

### Step 5.2: Manual Testing Checklist

- [ ] Create 2-player game, join, start
- [ ] Discard a 7 → PowerModal opens with peek_own options
- [ ] Select card → See card revealed for 5 seconds (private)
- [ ] Verify other player doesn't see revealed card
- [ ] Discard a 9 → PowerModal opens with opponent selector
- [ ] Select opponent + card → See opponent's card (private)
- [ ] Discard a J → PowerModal opens with blind swap options
- [ ] Perform blind swap → Verify cards swapped (public event)
- [ ] Discard a K → Auto-peek modal shows random card (no selection)
- [ ] Call Cambio at start of turn → Verify final round starts
- [ ] Verify Cambio caller can't take another turn
- [ ] Verify each other player takes exactly one final turn
- [ ] After last final turn → Game completes, scores calculated
- [ ] Verify penalty applied if Cambio caller didn't have lowest score
- [ ] View scores → See ScoreBoard with correct final scores
- [ ] Test disconnect during power activation → Power cancelled, turn advances

**Checkpoint**: All manual tests pass.

---

## Phase 6: Deployment

**Duration**: ~30 minutes
**Goal**: Merge to main and deploy.

### Step 6.1: Commit and Push

```bash
git add .
git commit -m "Implement game completion: special powers, Cambio, scoring"
git push origin 002-game-completion
```

### Step 6.2: Create Pull Request

- Open PR on GitHub/GitLab
- Reference spec.md and acceptance criteria
- Request code review

### Step 6.3: Merge and Deploy

```bash
git checkout main
git merge 002-game-completion
git push origin main
```

Run database migrations in production:

```bash
npm run db:migrate # (on production environment)
```

---

## Troubleshooting

**Power modal not opening**: Check that `discard.post.ts` detects power cards and broadcasts `POWER_AVAILABLE` event.

**Peek timeout not working**: Verify `setTimeout` is running on server and `CARD_HIDDEN` event broadcasts after 5s.

**Scores incorrect**: Check `calculateScoresWithPenalty` logic in `cardUtils.ts` and penalty doubling in `completeGame`.

**Final round stuck**: Ensure `hasTakenFinalTurn` column exists and updates correctly after each final turn.

---

## Success Criteria

✅ All 3 user stories (Special Powers, Cambio Call, Scoring) pass acceptance tests
✅ SC-001: All 4 power types activate without errors
✅ SC-002: Peek reveals only visible to activating player
✅ SC-003: Cambio triggers N-1 final turns
✅ SC-004: Score calculation 100% accurate (including penalty)
✅ SC-007: WebSocket events < 500ms latency

---

## Next Steps

After completing this feature:
1. Run `/speckit.tasks` to generate detailed implementation tasks
2. Consider adding AI bot power decision logic (currently out of scope)
3. Implement player reconnection during final round (future enhancement)
