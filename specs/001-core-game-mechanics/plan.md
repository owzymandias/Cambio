# Implementation Plan: Core Cambio Game Mechanics

**Branch**: `001-core-game-mechanics` | **Date**: 2025-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-game-mechanics/spec.md`

## Summary

Implement the complete Cambio card game including real-time multiplayer gameplay, server-authoritative game logic, AI bot opponents, and mobile-responsive UI. Players join game sessions, take turns drawing and swapping cards, use special card powers, and call "Cambio!" to end rounds. The system handles 2-4 players (human or AI), enforces all game rules server-side, and synchronizes state in real-time across all connected clients.

## Technical Context

**Language/Version**: TypeScript 5.9+ (Nuxt 4 with Vue 3.5+)
**Primary Dependencies**:
- Nuxt 4.1+ (full-stack framework)
- Drizzle ORM 0.44+ with PostgreSQL (game state persistence)
- WebSockets or Server-Sent Events (real-time communication) - NEEDS CLARIFICATION: which to use
- Zod 4.1+ (runtime validation)
- Better Auth 1.3+ (player authentication)

**Storage**: PostgreSQL for game sessions, player data, game history
**Testing**: Vitest 3.2+ for unit tests, Playwright 1.56+ for E2E tests
**Target Platform**: Web (Node.js server) + Mobile web browsers (iOS Safari 15+, Chrome Mobile)
**Project Type**: Full-stack web application (Nuxt unified structure)
**Performance Goals**:
- <500ms game state synchronization (SC-003)
- <10 minute complete game rounds with 4 players (SC-001)
- 60 FPS card animations on mobile devices

**Constraints**:
- Mobile-first touch interface (44x44px minimum touch targets)
- Server-authoritative (zero client-side game logic)
- Real-time multiplayer from day one
- Offline AI bot play for practice mode

**Scale/Scope**:
- 2-4 concurrent players per game session
- Support for 100+ concurrent game rooms initially
- 5 user stories (P1-P5)
- ~15 API endpoints for game actions
- Bot AI with basic memory and strategy

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Real-Time Multiplayer First
**Status**: PASS
**Evidence**: FR-017 requires real-time state synchronization. Architecture includes WebSocket/SSE for live updates. All game actions broadcast to connected players immediately.

### ✅ II. Server-Authoritative Game Logic (NON-NEGOTIABLE)
**Status**: PASS
**Evidence**: FR-019 explicitly requires server validation of all actions. Game logic will reside in `server/services/game/` with zero business logic in client. Clients only render state and send player intentions.

### ✅ III. Mobile-Responsive Touch-First Design
**Status**: PASS
**Evidence**: SC-006 requires 95% success rate for mobile actions. Design will use touch-optimized card interactions, large touch targets, and mobile-first layouts.

### ✅ IV. Minimal Viable Testing Strategy
**Status**: PASS
**Evidence**: Testing will focus on:
- Game rule validation (turn order, card scoring, Cambio logic)
- Server action validation (prevent cheating, rule enforcement)
- Critical game flows (join → play → end)
- Bot AI decisions
- API contracts for game actions

UI testing will be manual with Playwright for critical paths only.

### ✅ V. TypeScript Type Safety & Runtime Validation
**Status**: PASS
**Evidence**: Using TypeScript 5.9+ with strict mode. All client-server payloads validated with Zod schemas. Game state objects have explicit TypeScript interfaces. No `any` types except documented third-party integrations.

### Technology Stack Alignment
**Status**: PASS
- ✅ Nuxt 4 (Vue 3 + TypeScript) - inherited from base
- ✅ PostgreSQL with Drizzle ORM - inherited from base
- ✅ Better Auth - inherited from base
- ✅ Real-time: WebSocket/SSE - NEW, needs implementation choice
- ✅ Game session management - NEW, server-side
- ✅ Bot AI system - NEW, server-side

## Project Structure

### Documentation (this feature)

```
specs/001-core-game-mechanics/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── game-api.yaml    # OpenAPI spec for game endpoints
│   └── websocket-events.md  # WebSocket event contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Nuxt 4 unified full-stack structure
server/
├── services/
│   └── game/
│       ├── gameEngine.ts        # Core game logic (turn processing, rule enforcement)
│       ├── gameSession.ts       # Session management, player connections
│       ├── botAI.ts             # AI opponent decision logic
│       ├── cardDeck.ts          # Card shuffling, dealing, deck management
│       └── specialPowers.ts     # Power activation logic (peek, swap, etc.)
├── api/
│   └── game/
│       ├── create.post.ts       # POST /api/game/create - Create new game
│       ├── [gameId]/
│       │   ├── join.post.ts     # POST /api/game/:id/join - Join existing game
│       │   ├── action.post.ts   # POST /api/game/:id/action - Take turn action
│       │   ├── cambio.post.ts   # POST /api/game/:id/cambio - Call Cambio
│       │   └── state.get.ts     # GET /api/game/:id/state - Get current state
│       └── ws.ts                # WebSocket handler for real-time events
├── database/
│   └── schema/
│       ├── game.ts              # Game session, player, card tables
│       └── gameHistory.ts       # Completed game records
└── utils/
    └── gameValidation.ts        # Zod schemas for game actions

app/
├── components/
│   └── game/
│       ├── GameBoard.vue        # Main game board layout
│       ├── PlayerHand.vue       # Player's 2x2 card grid
│       ├── Card.vue             # Single card component with flip animation
│       ├── DrawPile.vue         # Draw and discard piles
│       ├── TurnIndicator.vue    # Shows whose turn it is
│       ├── CambioButton.vue     # Cambio call button
│       └── SpecialPowerModal.vue # Power selection UI (peek target, swap target)
├── pages/
│   └── game/
│       ├── [id].vue             # Active game page
│       └── lobby.vue            # Game creation/joining
├── composables/
│   ├── useGameState.ts          # Game state management
│   ├── useGameActions.ts        # Player action handlers
│   └── useWebSocket.ts          # Real-time connection management
└── types/
    └── game.ts                  # Shared TypeScript interfaces

tests/
├── unit/
│   ├── gameEngine.test.ts       # Game rule logic tests
│   ├── botAI.test.ts            # Bot decision tests
│   └── specialPowers.test.ts    # Power activation tests
└── e2e-playwright/
    ├── game-flow.spec.ts        # Complete game playthrough
    └── multiplayer.spec.ts      # Multi-client synchronization
```

**Structure Decision**: Using Nuxt 4's unified full-stack structure as inherited from NuxSaaS base. Server-side game logic in `server/services/game/`, API endpoints in `server/api/game/`, client components in `app/components/game/`. This aligns with the existing project structure and separates concerns while keeping everything in one repository.

## Complexity Tracking

No violations. All requirements align with constitution principles. No new complexity beyond necessary real-time communication layer.
