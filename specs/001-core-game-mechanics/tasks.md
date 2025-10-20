---
description: "Implementation tasks for Core Cambio Game Mechanics feature"
---

# Tasks: Core Cambio Game Mechanics

**Input**: Design documents from `/specs/001-core-game-mechanics/`
**Prerequisites**: plan.md ✅, data-model.md ✅, research.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are included in this feature per project standards (Vitest for unit tests, Playwright for E2E)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Nuxt 4 unified structure**: `server/` for backend, `app/` for frontend
- **Database schema**: `server/database/schema/`
- **API endpoints**: `server/api/game/`
- **Services**: `server/services/game/`
- **Components**: `app/components/game/`
- **Tests**: `tests/unit/` and `tests/e2e-playwright/`

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETED

**Purpose**: Project initialization and basic game infrastructure

- [x] T001 Create game database schema file at server/database/schema/game.ts
- [x] T002 Create TypeScript interfaces file at shared/types/game.ts
- [x] T003 [P] Create validation schemas at shared/utils/validation.ts
- [x] T004 Generate and apply database migrations with npm run db:generate && npm run db:migrate
- [x] T005 [P] Create base game service at server/services/gameService.ts

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETED

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement card deck creation and Fisher-Yates shuffle in server/utils/cardUtils.ts
- [x] T007 Implement card dealing function in server/utils/cardUtils.ts
- [x] T008 [P] Create game session manager service in server/services/gameService.ts
- [x] T009 [P] Implement WebSocket handler in server/utils/gameSocket.ts
- [x] T010 [P] Create WebSocket client composable in app/composables/useGameEvents.ts
- [x] T011 [P] Create game state management composable in app/composables/useGameState.ts
- [x] T012 Implement game state updates in server/services/gameService.ts
- [x] T013 [P] Create game constants in shared/constants/game.ts
- [x] T014 [P] Setup card utilities in server/utils/cardUtils.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Game Creation & Lobby (Priority: P1) 🎯 MVP ✅ COMPLETED

**Goal**: Players can create new games with room codes, configure bot opponents, and have games persisted in database

**Independent Test**: Create a game via API, verify room code is generated, add bots, verify game appears in database with correct configuration

### Tests for User Story 1

- [ ] T015 [P] [US1] Unit test for room code generation in tests/unit/gameHelpers.test.ts
- [ ] T016 [P] [US1] Unit test for deck creation and shuffling in tests/unit/cardDeck.test.ts
- [ ] T017 [P] [US1] Integration test for game creation API in tests/unit/gameApi.test.ts

### Implementation for User Story 1

- [x] T018 [US1] Implement POST /api/game/create endpoint in server/api/game/create.post.ts
- [x] T019 [US1] Implement game creation logic in server/services/gameService.ts
- [x] T020 [P] [US1] Create lobby page UI at app/pages/game/index.vue
- [x] T021 [P] [US1] Create game board UI at app/pages/game/[id].vue
- [x] T022 [US1] Wire up game creation to API endpoint
- [x] T023 [US1] Add validation for player count and bot configuration
- [x] T024 [US1] Display game session to user after creation

**Checkpoint**: At this point, players can create games and have them persisted in database

---

## Phase 4: User Story 2 - Join Game & Turn-Based Gameplay (Priority: P2) ✅ COMPLETED

**Goal**: Players can join existing games, start games, and play turns (draw, swap, discard cards)

**Independent Test**: Create a game in one browser, join from another browser, start game, play turns with drawing and swapping cards

### Tests for User Story 2

- [ ] T025 [P] [US2] Unit test for player joining validation in tests/unit/gameSession.test.ts
- [ ] T026 [P] [US2] E2E test for multi-player lobby in tests/e2e-playwright/lobby.spec.ts
- [ ] T027 [P] [US2] Integration test for join game API in tests/unit/gameApi.test.ts

### Implementation for User Story 2

- [x] T028 [US2] Implement POST /api/game/[gameId]/join endpoint in server/api/game/[id]/join.post.ts
- [x] T029 [US2] Implement player join validation logic in server/services/gameService.ts
- [x] T030 [US2] Add WebSocket event handlers in server/utils/gameSocket.ts
- [x] T031 [P] [US2] Create game components at app/components/Game/
- [x] T032 [P] [US2] Create game UI in app/pages/game/[id].vue
- [x] T033 [US2] Implement real-time updates via WebSocket in app/composables/useGameState.ts
- [x] T034 [US2] Add start game functionality in server/services/gameService.ts
- [x] T035 [US2] Handle game state validation in server/services/gameService.ts

### Turn-Based Gameplay (Phase 4 continuation)

- [x] T036 [US2] Implement draw from deck in server/services/gameService.ts
- [x] T037 [US2] Implement draw from discard in server/services/gameService.ts
- [x] T038 [US2] Implement swap card logic in server/services/gameService.ts
- [x] T039 [US2] Implement discard card logic in server/services/gameService.ts
- [x] T040 [US2] Create API endpoints for draw/swap/discard in server/api/game/[id]/
- [x] T041 [US2] Create Card component at app/components/Game/Card.vue
- [x] T042 [US2] Create DrawPile component at app/components/Game/DrawPile.vue
- [x] T043 [US2] Create DiscardPile component at app/components/Game/DiscardPile.vue
- [x] T044 [US2] Create GameBoard component at app/components/Game/GameBoard.vue
- [x] T045 [US2] Create PlayerHand component at app/components/Game/PlayerHand.vue
- [x] T046 [US2] Implement turn progression logic in server/services/gameService.ts
- [x] T047 [US2] Implement view initial cards in server/api/game/[id]/view-initial.post.ts

**Checkpoint**: At this point, multiple players can join games and play basic turn-based gameplay (draw, swap, discard)

---

---

## 📊 PROGRESS SUMMARY

**✅ COMPLETED (Phases 1-4):**
- Phase 1: Setup (Database, Types, Validation, Constants)
- Phase 2: Foundational (Card utilities, Game service, WebSocket, State management)
- Phase 3: User Story 1 (Game Creation & Lobby)
- Phase 4: User Story 2 (Join Game & Turn-Based Gameplay - draw, swap, discard)

**🚧 REMAINING WORK (Phases 5-12):**
- Phase 5-7: Special Powers, Cambio & Scoring, AI Bots
- Phase 8-11: Reconnection, State Retrieval, Edge Cases
- Phase 12: Polish, Testing, Production Readiness

**Next Phase: Phase 5 - Special Card Powers**

---

## Phase 5: User Story 3 - Special Card Powers (Priority: P3) ⚠️ NOT STARTED

**Goal**: Implement special card powers (7/8 peek own, 9/10 peek opponent, J/Q blind swap, K auto-peek)

**Independent Test**: Start a 2-player game, verify each player receives 4 cards, verify initial view phase shows bottom 2 cards, verify cards flip to hidden after timeout

### Tests for User Story 3

- [ ] T036 [P] [US3] Unit test for card dealing logic in tests/unit/cardDeck.test.ts
- [ ] T037 [P] [US3] Unit test for initial view phase timing in tests/unit/gameEngine.test.ts
- [ ] T038 [P] [US3] E2E test for game start sequence in tests/e2e-playwright/game-flow.spec.ts

### Implementation for User Story 3

- [ ] T039 [US3] Implement deal cards logic in server/services/game/gameEngine.ts
- [ ] T040 [US3] Implement initial view phase state management in server/services/game/gameEngine.ts
- [ ] T041 [US3] Add WebSocket events for game_started and cards_dealt in server/api/game/ws.ts
- [ ] T042 [P] [US3] Create Card component with flip animation at app/components/game/Card.vue
- [ ] T043 [P] [US3] Create PlayerHand component with 2x2 grid layout at app/components/game/PlayerHand.vue
- [ ] T044 [P] [US3] Create GameBoard layout component at app/components/game/GameBoard.vue
- [ ] T045 [US3] Implement card visibility logic based on visible_to array
- [ ] T046 [US3] Add initial view timer (10 seconds) and auto-flip to hidden
- [ ] T047 [US3] Create game page at app/pages/game/[id].vue
- [ ] T048 [US3] Wire up WebSocket events to update game board state

**Checkpoint**: At this point, games can start and players see their initial cards with proper visibility

---

## Phase 6: User Story 4 - Turn-Based Gameplay (Draw, Swap, Discard) (Priority: P4)

**Goal**: Players can take turns drawing cards from deck or discard pile, swap with their cards, or discard without swapping

**Independent Test**: Start game, draw card from deck, swap with position 0, verify old card goes to discard pile; next turn draw from discard, verify card is visible; discard without swap, verify turn ends

### Tests for User Story 4

- [ ] T049 [P] [US4] Unit test for draw from deck action in tests/unit/gameEngine.test.ts
- [ ] T050 [P] [US4] Unit test for draw from discard action in tests/unit/gameEngine.test.ts
- [ ] T051 [P] [US4] Unit test for swap card logic in tests/unit/gameEngine.test.ts
- [ ] T052 [P] [US4] Unit test for turn validation in tests/unit/gameEngine.test.ts
- [ ] T053 [P] [US4] E2E test for complete turn sequence in tests/e2e-playwright/game-flow.spec.ts

### Implementation for User Story 4

- [ ] T054 [US4] Implement turn validation logic in server/services/game/gameEngine.ts
- [ ] T055 [US4] Implement draw from deck action handler in server/services/game/gameEngine.ts
- [ ] T056 [US4] Implement draw from discard action handler in server/services/game/gameEngine.ts
- [ ] T057 [US4] Implement swap card action handler in server/services/game/gameEngine.ts
- [ ] T058 [US4] Implement discard without swap action handler in server/services/game/gameEngine.ts
- [ ] T059 [US4] Implement turn progression logic in server/services/game/gameEngine.ts
- [ ] T060 [US4] Create POST /api/game/[gameId]/action endpoint in server/api/game/[gameId]/action.post.ts
- [ ] T061 [US4] Add WebSocket events for card_drawn, card_swapped, card_discarded, turn_changed in server/api/game/ws.ts
- [ ] T062 [P] [US4] Create DrawPile component at app/components/game/DrawPile.vue
- [ ] T063 [P] [US4] Create DiscardPile component at app/components/game/DiscardPile.vue
- [ ] T064 [P] [US4] Create TurnIndicator component at app/components/game/TurnIndicator.vue
- [ ] T065 [US4] Create game actions composable at app/composables/useGameActions.ts
- [ ] T066 [US4] Implement card drag-and-drop for swapping
- [ ] T067 [US4] Add turn timer UI (optional, for future enhancement)
- [ ] T068 [US4] Wire up all action buttons to API endpoints
- [ ] T069 [US4] Handle action validation errors and display to user

**Checkpoint**: At this point, players can take turns and play a basic game without special powers

---

## Phase 7: User Story 5 - Special Card Powers (Priority: P5)

**Goal**: When specific cards are discarded, players can activate special powers: 7/8 (peek own), 9/10 (peek opponent), J/Q (blind swap), K (auto-peek own)

**Independent Test**: Discard a 7, verify peek power activates and reveals chosen card; discard a 9, select opponent and position, verify only current player sees revealed card; discard K, verify automatic peek

### Tests for User Story 5

- [ ] T070 [P] [US5] Unit test for power activation detection in tests/unit/specialPowers.test.ts
- [ ] T071 [P] [US5] Unit test for peek own power in tests/unit/specialPowers.test.ts
- [ ] T072 [P] [US5] Unit test for peek opponent power in tests/unit/specialPowers.test.ts
- [ ] T073 [P] [US5] Unit test for blind swap power in tests/unit/specialPowers.test.ts
- [ ] T074 [P] [US5] E2E test for power activation sequence in tests/e2e-playwright/special-powers.spec.ts

### Implementation for User Story 5

- [ ] T075 [US5] Create special powers service at server/services/game/specialPowers.ts
- [ ] T076 [US5] Implement power detection logic on discard in server/services/game/gameEngine.ts
- [ ] T077 [US5] Implement peek own card power (7, 8) in server/services/game/specialPowers.ts
- [ ] T078 [US5] Implement peek opponent card power (9, 10) in server/services/game/specialPowers.ts
- [ ] T079 [US5] Implement blind swap power (J, Q) in server/services/game/specialPowers.ts
- [ ] T080 [US5] Implement auto-peek power for King in server/services/game/specialPowers.ts
- [ ] T081 [US5] Add power activation to action endpoint in server/api/game/[gameId]/action.post.ts
- [ ] T082 [US5] Add WebSocket event for power_activated in server/api/game/ws.ts
- [ ] T083 [P] [US5] Create SpecialPowerModal component at app/components/game/SpecialPowerModal.vue
- [ ] T084 [P] [US5] Create power target selection UI (player + position picker)
- [ ] T085 [US5] Implement power activation flow in app/composables/useGameActions.ts
- [ ] T086 [US5] Add card reveal animation for peek powers
- [ ] T087 [US5] Handle power visibility (private vs public events)
- [ ] T088 [US5] Add power skip option (allow declining power use)

**Checkpoint**: At this point, all special card powers work correctly

---

## Phase 8: User Story 6 - Cambio Call & Scoring (Priority: P6)

**Goal**: Players can call "Cambio!" to trigger final round, all remaining players take one more turn, then cards are revealed and scores calculated, winner determined

**Independent Test**: Play until mid-game, call Cambio, verify final round starts, verify each other player gets exactly one turn, verify all cards revealed, verify scores calculated correctly (K=0, J/Q=10, A=1, etc.), verify winner has lowest score

### Tests for User Story 6

- [ ] T089 [P] [US6] Unit test for Cambio call validation in tests/unit/gameEngine.test.ts
- [ ] T090 [P] [US6] Unit test for final round logic in tests/unit/gameEngine.test.ts
- [ ] T091 [P] [US6] Unit test for score calculation in tests/unit/gameEngine.test.ts
- [ ] T092 [P] [US6] Unit test for winner determination in tests/unit/gameEngine.test.ts
- [ ] T093 [P] [US6] E2E test for complete game with Cambio in tests/e2e-playwright/game-flow.spec.ts

### Implementation for User Story 6

- [ ] T094 [US6] Implement Cambio call validation logic in server/services/game/gameEngine.ts
- [ ] T095 [US6] Implement final round phase management in server/services/game/gameEngine.ts
- [ ] T096 [US6] Implement score calculation logic in server/services/game/gameEngine.ts
- [ ] T097 [US6] Implement winner determination logic in server/services/game/gameEngine.ts
- [ ] T098 [US6] Implement Cambio penalty logic (incorrect call doubles score) in server/services/game/gameEngine.ts
- [ ] T099 [US6] Create POST /api/game/[gameId]/cambio endpoint in server/api/game/[gameId]/cambio.post.ts
- [ ] T100 [US6] Create GameHistory record on game completion in server/services/game/gameSession.ts
- [ ] T101 [US6] Add WebSocket events for cambio_called and game_ended in server/api/game/ws.ts
- [ ] T102 [P] [US6] Create CambioButton component at app/components/game/CambioButton.vue
- [ ] T103 [P] [US6] Create GameEndModal component with scores at app/components/game/GameEndModal.vue
- [ ] T104 [US6] Wire up Cambio button to API endpoint
- [ ] T105 [US6] Display final round indicator to all players
- [ ] T106 [US6] Animate card reveal at game end
- [ ] T107 [US6] Display final scores and winner announcement
- [ ] T108 [US6] Add return to lobby button after game ends

**Checkpoint**: At this point, complete games can be played from start to finish with scoring

---

## Phase 9: User Story 7 - AI Bot Opponents (Priority: P7)

**Goal**: AI bots can play automatically using rule-based decision logic with card memory, making strategically reasonable moves

**Independent Test**: Create game with 3 bots, start game, verify bots take turns automatically, verify bots make reasonable decisions (take low cards from discard, swap high-value cards, call Cambio when estimated score is low)

### Tests for User Story 7

- [ ] T109 [P] [US7] Unit test for bot decision logic in tests/unit/botAI.test.ts
- [ ] T110 [P] [US7] Unit test for bot card memory in tests/unit/botAI.test.ts
- [ ] T111 [P] [US7] Unit test for bot Cambio decision in tests/unit/botAI.test.ts
- [ ] T112 [P] [US7] Integration test for bot turn execution in tests/unit/gameEngine.test.ts

### Implementation for User Story 7

- [ ] T113 [US7] Create bot AI service at server/services/game/botAI.ts
- [ ] T114 [US7] Implement bot card memory tracking system in server/services/game/botAI.ts
- [ ] T115 [US7] Implement bot draw decision logic (deck vs discard) in server/services/game/botAI.ts
- [ ] T116 [US7] Implement bot swap decision logic (which card to replace) in server/services/game/botAI.ts
- [ ] T117 [US7] Implement bot special power decision logic in server/services/game/botAI.ts
- [ ] T118 [US7] Implement bot Cambio call decision logic in server/services/game/botAI.ts
- [ ] T119 [US7] Integrate bot AI with turn processing in server/services/game/gameEngine.ts
- [ ] T120 [US7] Add bot turn delay (1-2 seconds) for natural feel
- [ ] T121 [US7] Implement difficulty levels (easy, medium, hard) with different strategies
- [ ] T122 [P] [US7] Add bot avatar indicators in PlayerList component
- [ ] T123 [P] [US7] Add bot thinking indicator animation

**Checkpoint**: At this point, games can be played solo against AI bots

---

## Phase 10: User Story 8 - Player Reconnection & Bot Takeover (Priority: P8)

**Goal**: When players disconnect, they have 60 seconds to reconnect and resume; if they don't reconnect, a bot takes over their position

**Independent Test**: Start game, disconnect one player (close browser), wait 30 seconds, reconnect, verify player resumes with same cards; disconnect again, wait 65 seconds, verify bot takes over and continues playing

### Tests for User Story 8

- [ ] T124 [P] [US8] Unit test for reconnection window timer in tests/unit/gameSession.test.ts
- [ ] T125 [P] [US8] Unit test for bot takeover logic in tests/unit/gameSession.test.ts
- [ ] T126 [P] [US8] E2E test for player disconnect and reconnect in tests/e2e-playwright/reconnection.spec.ts

### Implementation for User Story 8

- [ ] T127 [US8] Implement connection status tracking in server/services/game/gameSession.ts
- [ ] T128 [US8] Implement 60-second reconnection timer in server/api/game/ws.ts
- [ ] T129 [US8] Implement player reconnection validation in server/api/game/ws.ts
- [ ] T130 [US8] Implement game state snapshot on reconnect in server/services/game/gameSession.ts
- [ ] T131 [US8] Implement bot takeover conversion logic in server/services/game/gameSession.ts
- [ ] T132 [US8] Add WebSocket events for player_disconnected, player_reconnected, bot_takeover in server/api/game/ws.ts
- [ ] T133 [US8] Implement client-side reconnection logic in app/composables/useWebSocket.ts
- [ ] T134 [US8] Add reconnection UI indicator in GameBoard component
- [ ] T135 [US8] Display disconnected player status to other players
- [ ] T136 [US8] Handle game state sync on reconnection

**Checkpoint**: At this point, network interruptions don't break games

---

## Phase 11: User Story 9 - Game State Retrieval (Priority: P9)

**Goal**: Players can retrieve current game state via REST API (for page refreshes or deep links)

**Independent Test**: Join a game, refresh page, verify game state loads correctly from API and displays current cards, turn, and player positions

### Tests for User Story 9

- [ ] T137 [P] [US9] Unit test for game state serialization in tests/unit/gameSession.test.ts
- [ ] T138 [P] [US9] Unit test for card visibility filtering in tests/unit/gameSession.test.ts
- [ ] T139 [P] [US9] Integration test for state API endpoint in tests/unit/gameApi.test.ts

### Implementation for User Story 9

- [ ] T140 [US9] Implement GET /api/game/[gameId]/state endpoint in server/api/game/[gameId]/state.get.ts
- [ ] T141 [US9] Implement game state serialization with visibility filtering in server/services/game/gameSession.ts
- [ ] T142 [US9] Add player-specific state filtering (only show cards visible to requester) in server/services/game/gameSession.ts
- [ ] T143 [US9] Implement state caching for performance in server/services/game/gameSession.ts
- [ ] T144 [US9] Add state fetch on component mount in app/pages/game/[id].vue
- [ ] T145 [US9] Handle loading states and errors in UI

**Checkpoint**: At this point, page refreshes don't lose game state

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T146 [P] Add mobile touch optimizations (44x44px touch targets) across all game components
- [ ] T147 [P] Add haptic feedback for card interactions in app/components/game/Card.vue
- [ ] T148 [P] Implement card animation polish (smooth flips, swaps, deals)
- [ ] T149 [P] Add sound effects for card actions (optional)
- [ ] T150 [P] Add loading states and skeleton screens for game pages
- [ ] T151 [P] Implement error boundary and error handling UI
- [ ] T152 [P] Add rate limiting for API endpoints in server/middleware/rateLimit.ts
- [ ] T153 [P] Add input sanitization and XSS protection
- [ ] T154 [P] Implement comprehensive logging for debugging
- [ ] T155 [P] Add performance monitoring for WebSocket latency
- [ ] T156 [P] Create game history page at app/pages/game/history.vue
- [ ] T157 [P] Add accessibility improvements (ARIA labels, keyboard navigation)
- [ ] T158 Run full test suite with npm run test:all
- [ ] T159 Run E2E tests on mobile viewport with Playwright
- [ ] T160 Validate against quickstart.md scenarios
- [ ] T161 Performance testing for 100 concurrent game rooms
- [ ] T162 Security audit for WebSocket authentication and authorization

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8 → US9)
- **Polish (Phase 12)**: Depends on core user stories (US1-US6 minimum for MVP)

### User Story Dependencies

- **User Story 1 (Game Creation)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (Join Game)**: Can start after Foundational (Phase 2) - Independent but builds on US1
- **User Story 3 (Card Deal)**: Depends on US2 (need players to join) - Can integrate
- **User Story 4 (Turn Gameplay)**: Depends on US3 (need cards dealt) - Core gameplay
- **User Story 5 (Special Powers)**: Depends on US4 (extends turn gameplay) - Enhancement
- **User Story 6 (Cambio & Scoring)**: Depends on US4 (needs turn system) - Game completion
- **User Story 7 (AI Bots)**: Depends on US4-US6 (needs full game logic) - Can be parallel with US8-US9
- **User Story 8 (Reconnection)**: Depends on US2 (needs WebSocket system) - Independent feature
- **User Story 9 (State Retrieval)**: Can start after Foundational - Independent feature

### Within Each User Story

- Tests (if included) SHOULD be written and FAIL before implementation
- Database schema and models before services
- Services before API endpoints
- API endpoints before UI components
- Core UI components before integration
- Story complete and tested before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All tasks except T004 (depends on T001) can run in parallel
- **Phase 2 (Foundational)**: Tasks T006-T007, T008-T011, T012-T014 can each run in parallel within their groups
- **Within User Stories**:
  - Tests can run in parallel with each other
  - Models can run in parallel with each other
  - Independent UI components can be built in parallel
  - API endpoints for different actions can be built in parallel
- **Across User Stories**: Once Foundational completes:
  - US1 + US9 can start immediately in parallel
  - US2 + US8 can start after US1 in parallel
  - US3-US6 form a sequential chain (gameplay flow)
  - US7 can start once US6 completes

---

## Parallel Example: User Story 4 (Turn Gameplay)

```bash
# Tests can all run in parallel (if TDD approach):
Task T049: "Unit test for draw from deck"
Task T050: "Unit test for draw from discard"
Task T051: "Unit test for swap card logic"
Task T052: "Unit test for turn validation"

# UI components can run in parallel:
Task T062: "Create DrawPile component"
Task T063: "Create DiscardPile component"
Task T064: "Create TurnIndicator component"

# Core engine actions are sequential (build on each other)
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 + 6)

This is the MINIMUM for a playable game:

1. **Phase 1**: Setup (database, types, validation)
2. **Phase 2**: Foundational (CRITICAL - deck, WebSocket, session management)
3. **Phase 3**: User Story 1 (Create games)
4. **Phase 4**: User Story 2 (Join games)
5. **Phase 5**: User Story 3 (Deal cards)
6. **Phase 6**: User Story 4 (Play turns)
7. **Phase 8**: User Story 6 (Cambio & scoring)
8. **STOP and VALIDATE**: Play complete 2-player games, verify all basic mechanics work
9. **Deploy/demo MVP**

**Skip for MVP**: US5 (special powers), US7 (bots), US8 (reconnection), US9 (state API)

### Incremental Delivery

After MVP, add features incrementally:

1. **MVP** (US1-4, US6): Basic playable game → Deploy
2. **+ US5**: Special card powers → Deploy
3. **+ US7**: AI bot opponents for solo play → Deploy
4. **+ US8**: Reconnection handling → Deploy
5. **+ US9**: State persistence for page refreshes → Deploy
6. **+ Phase 12**: Polish and production hardening → Deploy

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 3 developers:

1. **All together**: Complete Setup + Foundational (critical path)
2. **After Foundational**:
   - Developer A: US1 (Game Creation) → US3 (Card Deal) → US5 (Special Powers)
   - Developer B: US2 (Join Game) → US4 (Turn Gameplay) → US6 (Cambio)
   - Developer C: US9 (State API) → US8 (Reconnection) → US7 (Bots)
3. **Integration**: Merge and test all stories together
4. **All together**: Phase 12 (Polish)

---

## Task Count Summary

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 9 tasks (BLOCKING)
- **Phase 3 (US1 - Game Creation)**: 10 tasks
- **Phase 4 (US2 - Join Game)**: 11 tasks
- **Phase 5 (US3 - Card Deal)**: 13 tasks
- **Phase 6 (US4 - Turn Gameplay)**: 21 tasks
- **Phase 7 (US5 - Special Powers)**: 19 tasks
- **Phase 8 (US6 - Cambio & Scoring)**: 16 tasks
- **Phase 9 (US7 - AI Bots)**: 14 tasks
- **Phase 10 (US8 - Reconnection)**: 13 tasks
- **Phase 11 (US9 - State Retrieval)**: 9 tasks
- **Phase 12 (Polish)**: 17 tasks

**Total**: 162 tasks

**MVP Scope** (US1-4, US6): ~70 tasks
**Full Feature**: 162 tasks

---

## Notes

- **[P] tasks**: Different files, can run in parallel without conflicts
- **[Story] label**: Maps task to specific user story for traceability
- **Server-authoritative**: ALL game logic validation happens server-side, never trust client
- **Real-time first**: Use WebSocket for all game state updates, REST API only for initial requests
- **Mobile-first**: Design for touch, test on mobile devices throughout
- **Test strategy**: Focus on game rule correctness, action validation, and critical flows
- **Commit frequently**: After each task or logical group of parallel tasks
- **Independent stories**: Each user story should be testable on its own
- **Avoid**: Cross-story dependencies that break independence, vague tasks, same-file conflicts

---

## Validation Checklist

Before considering this feature complete, verify:

- [ ] Can create games with room codes
- [ ] Can join games via room code
- [ ] Can play with 2-4 players (human + bots)
- [ ] Cards deal correctly in 2x2 grid
- [ ] Initial view phase works (see bottom 2 cards)
- [ ] Turn system enforces correct player order
- [ ] Can draw from deck or discard pile
- [ ] Can swap or discard drawn cards
- [ ] All special powers work correctly (7/8/9/10/J/Q/K)
- [ ] Cambio call triggers final round
- [ ] Scores calculate correctly
- [ ] Winner determined correctly
- [ ] Bot AI makes reasonable decisions (80%+ strategically sound)
- [ ] Reconnection works within 60 seconds
- [ ] Bot takeover works after 60 seconds
- [ ] WebSocket synchronization < 500ms (SC-003)
- [ ] Mobile touch targets ≥ 44x44px (SC-006)
- [ ] Game completes in < 10 minutes with 4 players (SC-001)
- [ ] No client-side game logic (server-authoritative) (FR-019)
- [ ] All actions validated server-side (FR-019)
- [ ] Complete E2E game playthrough passes
- [ ] 100 concurrent games performance test passes

**Reference**: See quickstart.md for detailed testing scenarios
