# Implementation Plan: Core Cambio Game Mechanics

**Branch**: `003-core-game-mechanics` | **Date**: 2025-10-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-core-game-mechanics/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a real-time multiplayer card game (Cambio) with 2-4 players, featuring turn-based gameplay, special card powers, AI bot opponents, and WebSocket-based synchronization. The system provides server-authoritative game logic, mobile-responsive touch interface, player reconnection handling, and complete game lifecycle from lobby creation through Cambio call and scoring.

## Technical Context

**Language/Version**: TypeScript 5.x with Nuxt 4 (Vue 3)
**Primary Dependencies**: Nuxt 4, Vue 3, Drizzle ORM, Better Auth, WebSockets (ws or native Node.js)
**Storage**: PostgreSQL (with Drizzle ORM) for game sessions, player state, and action logs
**Testing**: Vitest for unit tests, Playwright for E2E tests
**Target Platform**: Modern web browsers (desktop and mobile), Node.js server or Cloudflare Workers
**Project Type**: Web application (full-stack)
**Performance Goals**: <500ms real-time synchronization latency, support 100 concurrent game sessions, complete 4-player game in <10 minutes
**Constraints**: Mobile-responsive (44x44px touch targets), server-authoritative (no client-side game logic), real-time WebSocket updates
**Scale/Scope**: 2-4 players per game, 9 user stories, ~160 implementation tasks, AI bot opponents with 3 difficulty levels

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Evidence |
|-----------|-------------|--------|----------|
| **I. Real-Time Multiplayer First** | All game features designed for real-time sync | ✅ PASS | FR-020: System MUST broadcast game state changes to all players in real-time; WebSocket architecture planned for all game actions |
| **II. Server-Authoritative Game Logic** | All game state and rules execute on server only | ✅ PASS | FR-019: System MUST validate all game actions server-side (no client-side game logic); FR-024: System MUST filter card visibility based on player perspective |
| **III. Mobile-Responsive Touch-First** | All UI works on mobile with touch inputs, 44x44px targets | ✅ PASS | SC-006: All interactive elements meet minimum 44×44 pixels for mobile usability; Mobile-first design constraint documented |
| **IV. Minimal Viable Testing** | Tests focus on game rules, server validation, critical flows | ✅ PASS | Test strategy in tasks.md focuses on game rule logic, server validation, critical game flows; Manual QA acceptable for UI/UX |
| **V. TypeScript Type Safety** | Strong typing throughout, runtime validation for boundaries | ✅ PASS | TypeScript 5.x specified; Zod validation planned for API boundaries (per tasks.md T003); Game state objects have explicit types |

**Gate Result**: ✅ **PASS** - All constitution principles satisfied. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
server/                          # Backend (Nitro server)
├── api/game/                    # Game API endpoints
│   ├── create.post.ts          # Create game session
│   ├── [id]/
│   │   ├── join.post.ts        # Join game
│   │   ├── state.get.ts        # Get game state
│   │   ├── action.post.ts      # Game actions (draw, swap, discard)
│   │   ├── cambio.post.ts      # Call Cambio
│   │   └── draw.post.ts        # Draw card action
│   └── ws.ts                   # WebSocket handler
├── database/schema/
│   └── game.ts                 # Game database schema (sessions, players, actions)
├── services/game/              # Game business logic
│   ├── cardDeck.ts            # Deck creation, shuffling, dealing
│   ├── gameEngine.ts          # Core game rules and state machine
│   ├── gameSession.ts         # Session management
│   ├── specialPowers.ts       # Special card power logic
│   ├── botAI.ts               # AI bot decision logic
│   └── actionLogger.ts        # Game action logging
└── utils/
    ├── gameValidation.ts      # Zod schemas for game actions
    └── gameHelpers.ts         # Room code generation, utilities

app/                            # Frontend (Nuxt/Vue)
├── pages/
│   └── game/
│       ├── lobby.vue          # Game lobby (create/join)
│       ├── [id].vue           # Active game page
│       └── history.vue        # Game history
├── components/game/           # Game UI components
│   ├── Card.vue              # Playing card with flip animation
│   ├── PlayerHand.vue        # 2x2 card grid
│   ├── GameBoard.vue         # Main game board layout
│   ├── DrawPile.vue          # Draw pile component
│   ├── DiscardPile.vue       # Discard pile component
│   ├── TurnIndicator.vue     # Current turn display
│   ├── CambioButton.vue      # Cambio call button
│   ├── GameEndModal.vue      # Game results modal
│   ├── SpecialPowerModal.vue # Special power activation UI
│   ├── GameCreationForm.vue  # Create game form
│   ├── JoinGameForm.vue      # Join game form
│   └── PlayerList.vue        # Player list in lobby
├── composables/
│   ├── useGameState.ts       # Game state management
│   ├── useGameActions.ts     # Game action handlers
│   └── useWebSocket.ts       # WebSocket client logic
└── types/
    └── game.ts               # TypeScript interfaces for game entities

tests/
├── unit/                      # Vitest unit tests
│   ├── cardDeck.test.ts
│   ├── gameEngine.test.ts
│   ├── specialPowers.test.ts
│   ├── botAI.test.ts
│   └── gameValidation.test.ts
└── e2e-playwright/           # Playwright E2E tests
    ├── lobby.spec.ts
    ├── game-flow.spec.ts
    ├── special-powers.spec.ts
    └── reconnection.spec.ts
```

**Structure Decision**: Nuxt 4 unified full-stack structure. Backend uses `server/` directory for API endpoints, services, and database schema. Frontend uses `app/` directory for pages, components, and composables. This follows the existing NuxSaaS base structure and keeps all game-related code organized under `game/` subdirectories.

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - All constitution principles are satisfied. No complexity justifications required.

