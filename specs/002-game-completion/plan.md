# Implementation Plan: Game Completion - Special Powers & Scoring

**Branch**: `002-game-completion` | **Date**: 2025-10-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-game-completion/spec.md`

## Summary

This feature completes the core Cambio game implementation by adding special card powers (peek/swap mechanics), the Cambio call end-game trigger, scoring with penalties, and winner determination. Building on the existing game infrastructure (database schema, WebSocket events, turn-based gameplay), this implementation focuses on three integrated workflows: power activation via modal dialogs, final round sequencing when Cambio is called, and score calculation with penalty doubling for incorrect Cambio calls.

**Technical Approach**: Server-authoritative game logic with WebSocket broadcast for real-time updates. Modal dialogs on client for power interactions. All validation and state transitions happen server-side, with optimistic locking to prevent race conditions during power activations and Cambio calls.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 with Vue 3)
**Primary Dependencies**: Nuxt 4, Vue 3, Drizzle ORM (PostgreSQL), Better Auth, Nuxt UI (Tailwind CSS)
**Storage**: PostgreSQL with existing schema (game_session, player, card, turn, special_power, game_score tables already defined)
**Testing**: Vitest with Nuxt test utils, manual QA for modal UX validation
**Target Platform**: Node.js server (primary) / Cloudflare Workers (secondary with Hyperdrive)
**Project Type**: Full-stack web application (Nuxt SSR + API routes)
**Performance Goals**: < 500ms WebSocket broadcast latency for game events; < 200ms API response time for power/cambio actions
**Constraints**: Mobile-responsive touch-first UI (44x44px touch targets); server-side game logic only (no client validation); real-time synchronization across multiple concurrent players
**Scale/Scope**: 2-6 concurrent players per game session; support 10+ concurrent games; handle disconnections gracefully during final round

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Real-Time Multiplayer First
✅ **PASS** - Special powers, Cambio calls, and scoring updates all broadcast via WebSocket to all players. Modal interactions on one client trigger events visible to others (e.g., "Player X is using a power"). Disconnection handling ensures remaining players can continue.

### Principle II: Server-Authoritative Game Logic
✅ **PASS** - All game logic (power activation, Cambio validation, score calculation, winner determination) executes server-side. Client modals are UI-only; all decisions validated by server before state changes. FR-017 explicitly requires server-side validation.

### Principle III: Mobile-Responsive Touch-First Design
✅ **PASS** - Modal dialogs designed for mobile-first interaction. Power selection (card positions, player targets) uses large touch-friendly buttons. No hover-dependent interactions. Modals block game board to prevent accidental touches during power activation (FR-024).

### Principle IV: Minimal Viable Testing Strategy
✅ **PASS** - Focus on server-side game rule logic: power activation correctness, Cambio final round sequencing, score calculation accuracy (including penalty doubling). Manual QA acceptable for modal UX and visual feedback. Independent tests defined in spec for each user story.

### Principle V: TypeScript Type Safety & Runtime Validation
✅ **PASS** - Existing codebase uses TypeScript throughout. Power activation requests will use Zod validation for request payloads (power type, target selections). Game state transitions strongly typed with existing enums (gamePhaseEnum, specialPowerTypeEnum).

**Summary**: All constitution principles satisfied. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```
specs/002-game-completion/
├── plan.md              # This file
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
└── contracts/           # Phase 1 output (to be generated)
    ├── power.yaml       # POST /api/game/[id]/power contract
    ├── cambio.yaml      # POST /api/game/[id]/cambio contract
    └── scores.yaml      # GET /api/game/[id]/scores contract
```

### Source Code (repository root)

**Existing Structure** (from 001-core-game-mechanics):
```
server/
├── api/game/
│   ├── create.post.ts
│   └── [id]/
│       ├── index.get.ts         # Get game state
│       ├── join.post.ts         # Join game
│       ├── draw.post.ts         # Draw card
│       ├── swap.post.ts         # Swap cards
│       ├── discard.post.ts      # Discard card
│       ├── view-initial.post.ts # View initial cards
│       ├── events.get.ts        # SSE event stream
│       ├── power.post.ts        # ⚠️ Stub (returns 501)
│       ├── cambio.post.ts       # ⚠️ Stub (returns 501)
│       └── scores.get.ts        # ⚠️ Stub (returns 501)
├── database/schema/
│   └── game.ts                  # All game tables defined
└── utils/
    ├── cardUtils.ts             # Shuffle, deal, score calculation
    └── gameSocket.ts            # SSE broadcast utilities

app/
└── components/Game/
    ├── Card.vue
    ├── GameBoard.vue
    ├── PlayerHand.vue
    ├── DrawPile.vue
    └── DiscardPile.vue

shared/
├── types/game.ts                # Game types
└── constants/game.ts            # Card values, enums
```

**New Files for This Feature**:
```
server/
├── api/game/[id]/
│   ├── power.post.ts            # ✏️ Implement power activation
│   ├── cambio.post.ts           # ✏️ Implement Cambio call
│   └── scores.get.ts            # ✏️ Implement score retrieval
└── utils/
    ├── gameService.ts           # NEW: Game logic service layer
    │   ├── activateSpecialPower()
    │   ├── callCambio()
    │   ├── processFinalRound()
    │   ├── calculateScores()
    │   ├── determineWinner()
    │   └── completeGame()
    └── powerHelpers.ts          # NEW: Power-specific logic
        ├── validatePowerTarget()
        ├── applyPeekPower()
        ├── applyBlindSwap()
        └── selectRandomCard()

app/
├── components/Game/
│   ├── PowerModal.vue           # NEW: Special power activation modal
│   ├── CambioButton.vue         # NEW: Cambio call button
│   ├── ScoreBoard.vue           # NEW: Final scores display
│   └── GameOverModal.vue        # NEW: Winner announcement
└── composables/
    └── useGameActions.ts        # ✏️ Extend with power/cambio actions

shared/
└── types/game.ts                # ✏️ Add PowerActivationRequest, CambioCallRequest types
```

**Structure Decision**: Following existing Nuxt 4 full-stack structure. API routes in `server/api/game/`, service layer in `server/utils/`, Vue components in `app/components/Game/`. This maintains consistency with 001-core-game-mechanics implementation and leverages existing WebSocket infrastructure.

## Complexity Tracking

*No Constitution violations - this section is empty.*

---

## Phase 0: Research & Unknowns Resolution

See [research.md](./research.md) (to be generated)

## Phase 1: Design & Contracts

See:
- [data-model.md](./data-model.md) (to be generated)
- [contracts/](./contracts/) (to be generated)
- [quickstart.md](./quickstart.md) (to be generated)
