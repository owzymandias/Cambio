---
description: "Task list for Game Completion - Special Powers & Scoring"
---

# Tasks: Game Completion - Special Powers & Scoring

**Input**: Design documents from `/specs/002-game-completion/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Branch**: `002-game-completion`

**Tests**: Tests are NOT explicitly requested in the feature specification. Following minimal viable testing strategy (Constitution Principle IV), only server-side game logic validation will be included. Manual QA is acceptable for modal UX.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Nuxt 4 full-stack application
- Server-side: `server/api/`, `server/utils/`, `server/database/`
- Client-side: `app/components/`, `app/composables/`, `app/pages/`
- Shared: `shared/types/`, `shared/constants/`

---

## Phase 1: Setup (Database Migration)

**Purpose**: Add database column for final round tracking

- [X] T001 Add `hasTakenFinalTurn` boolean column to player schema in server/database/schema/game.ts
- [X] T002 Generate Drizzle migration file with `npm run db:generate`
- [X] T003 Update generated migration to include performance indexes (idx_player_final_turn, idx_game_score_game, idx_special_power_game)
- [X] T004 Run migration with `npm run db:migrate` to apply schema changes (migration file ready, run when DB available)

**Checkpoint**: Database schema updated, `player.has_taken_final_turn` column exists

---

## Phase 2: Foundational (Shared Infrastructure)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Create Zod validation schemas (PowerActivationRequestSchema, CambioCallRequestSchema) in shared/types/game.ts with discriminated unions for power types
- [X] T006 [P] Add TypeScript type definitions (PowerActivationRequest, PowerActivationResult, CambioCallResult, PlayerScore, WinnerInfo) in shared/types/game.ts
- [X] T007 [P] Implement `broadcastToPlayer(gameId, playerId, event)` function in server/utils/gameSocket.ts for player-specific SSE events
- [X] T008 Create server/utils/powerHelpers.ts with helper functions: `validatePowerTarget()`, `selectRandomCard()`, `applyPeekPower()`, `applyBlindSwap()`
- [X] T009 Create server/utils/gameService.ts skeleton with function signatures: `activateSpecialPower()`, `callCambio()`, `processFinalRound()`, `calculateScores()`, `determineWinner()`, `completeGame()`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Special Card Powers (Priority: P1) 🎯 MVP

**Goal**: Implement all 4 special power types (peek own, peek opponent, blind swap, auto-peek King) with modal-based UI and server-side validation

**Independent Test**: Start a 2-player game, play until you draw a 7, discard it, verify a modal dialog appears prompting you to peek at a card, select a card position in the modal, verify the card is revealed temporarily only to you within the modal interface, verify the other player doesn't see the revealed card

### Implementation for User Story 1

#### Server-Side Logic

- [X] T010 [P] [US1] Implement `validatePowerTarget()` in server/utils/powerHelpers.ts with validation for card index (0-3), target player existence, and power type constraints
- [X] T011 [P] [US1] Implement `selectRandomCard()` in server/utils/powerHelpers.ts for King (K) auto-peek random selection
- [X] T012 [US1] Implement `applyPeekPower()` in server/utils/powerHelpers.ts with card visibility update, private `broadcastToPlayer()` event, and 5-second auto-hide timer using `setTimeout()`
- [X] T013 [US1] Implement `applyBlindSwap()` in server/utils/powerHelpers.ts with card owner swap logic and public broadcast event
- [X] T014 [US1] Implement `activateSpecialPower()` core logic in server/utils/gameService.ts with transaction support, row-level locking (`FOR UPDATE`), phase validation, and power type routing to helper functions
- [X] T015 [US1] Add special_power table insertion logic in server/utils/gameService.ts to record power activation history (activatedById, powerType, targetCardId, targetPlayerId)
- [ ] T016 [US1] Implement peek timer cancellation logic in server/utils/gameService.ts for "next game event" trigger (store timers in Map<cardId, NodeJS.Timeout>) **[DEFERRED - requires complex state management]**
- [ ] T017 [US1] Implement disconnect handling for pending power activations in server/utils/gameSocket.ts (track pending powers in Map<playerId, { gameId, powerType }>, cancel on disconnect) **[DEFERRED - requires connection lifecycle management]**

#### API Endpoint

- [X] T018 [US1] Implement POST /api/game/[id]/power.post.ts endpoint with Zod validation, skip handling, auth/playerId extraction, and service function call
- [X] T019 [US1] Add error handling in server/api/game/[id]/power.post.ts for 400 (invalid target), 404 (game not found), 409 (wrong phase, power window expired)

#### Client Components

- [X] T020 [P] [US1] Create app/components/Game/PowerModal.vue with props (powerType, players, myCards) and emits (activate, skip)
- [X] T021 [P] [US1] Implement card selection grid (2x2) in PowerModal.vue with touch-friendly buttons (44x44px minimum) and selected state styling
- [X] T022 [P] [US1] Implement opponent selector in PowerModal.vue for peek_opponent and blind_swap power types
- [X] T023 [P] [US1] Add auto-peek display in PowerModal.vue for look_own (K) power with "Card will be auto-selected" message
- [X] T024 [US1] Implement modal footer in PowerModal.vue with Skip button and Activate button (disabled until valid selection)
- [X] T025 [US1] Use Nuxt UI `UModal` component with `prevent-close` prop in PowerModal.vue for blocking interaction
- [X] T026 [US1] Add 5-second countdown timer display in PowerModal.vue for peek powers (client-side UI only, server controls actual timeout)

#### Client Integration

- [ ] T027 [US1] Extend app/composables/useGameActions.ts with `activatePower()` and `skipPower()` functions that POST to /api/game/[id]/power
- [ ] T028 [US1] Add WebSocket event listeners in app/components/Game/GameBoard.vue for `POWER_AVAILABLE`, `CARD_REVEALED`, `CARD_HIDDEN`, `POWER_CANCELLED` events
- [ ] T029 [US1] Integrate PowerModal into GameBoard.vue with conditional rendering based on `POWER_AVAILABLE` event and current player turn
- [ ] T030 [US1] Handle `CARD_REVEALED` event in GameBoard.vue to update card visibility state (only for activating player, private event)
- [ ] T031 [US1] Handle `CARD_HIDDEN` event in GameBoard.vue to reset card visibility and close modal

**Checkpoint**: At this point, User Story 1 should be fully functional - all 4 power types activate via modal, peek reveals are private, timers work correctly

---

## Phase 4: User Story 2 - Cambio Call & Final Round (Priority: P2)

**Goal**: Implement Cambio call mechanism to trigger final round, where caller's turn ends immediately and each other player gets exactly one more turn before game completion

**Independent Test**: Play a game until mid-way through, call Cambio at the start of my turn, verify a "Final Round" indicator appears for all players, verify each other player takes exactly one more turn, verify after all final turns the game ends and scores are calculated

### Implementation for User Story 2

#### Server-Side Logic

- [X] T032 [P] [US2] Implement `callCambio()` in server/utils/gameService.ts with transaction support, row-level locking, phase validation (must be 'playing'), and cambioCallerId uniqueness check
- [X] T033 [US2] Add game_session update logic in `callCambio()` to set phase='final_round' and cambioCallerId=playerId
- [X] T034 [US2] Add player update logic in `callCambio()` to set hasTakenFinalTurn=true for Cambio caller (caller forfeits remaining turn)
- [ ] T035 [US2] Implement turn advancement logic in `callCambio()` to move to next player after caller **[TODO in gameService.ts]**
- [X] T036 [US2] Add `CAMBIO_CALLED` event broadcast in `callCambio()` with public visibility (all players see caller info)
- [X] T037 [US2] Implement `processFinalRound()` in server/utils/gameService.ts to check if all non-caller players have hasTakenFinalTurn=true
- [ ] T038 [US2] Add automatic game completion trigger in turn advancement logic when `processFinalRound()` returns true (all final turns complete) **[Requires integration with turn system]**

#### API Endpoint

- [X] T039 [US2] Implement POST /api/game/[id]/cambio.post.ts endpoint with auth/playerId extraction and `callCambio()` service call
- [X] T040 [US2] Add error handling in server/api/game/[id]/cambio.post.ts for 400 (not player's turn, wrong phase), 404 (game not found), 409 (Cambio already called)

#### Client Components

- [X] T041 [P] [US2] Create app/components/Game/CambioButton.vue with props (canCallCambio, gamePhase) and emit (callCambio)
- [X] T042 [US2] Implement confirmation modal in CambioButton.vue with "Are you sure?" message and cancel/confirm buttons
- [X] T043 [US2] Add button disabled state logic in CambioButton.vue (disabled unless canCallCambio=true and gamePhase='playing')
- [X] T044 [US2] Style CambioButton.vue with prominent red color and large size for touch accessibility

#### Client Integration

- [ ] T045 [US2] Extend app/composables/useGameActions.ts with `callCambio()` function that POSTs to /api/game/[id]/cambio
- [ ] T046 [US2] Add WebSocket event listener in GameBoard.vue for `CAMBIO_CALLED` event
- [ ] T047 [US2] Display "Final Round" indicator in GameBoard.vue when game phase transitions to 'final_round' (visible to all players)
- [ ] T048 [US2] Integrate CambioButton into GameBoard.vue with conditional rendering (only show on current player's turn during 'playing' phase)
- [ ] T049 [US2] Update turn indicator logic in GameBoard.vue to show "Final Turn" label for non-caller players during final round

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - Cambio call triggers final round, all players get correct number of final turns, game transitions to completion

---

## Phase 5: User Story 3 - Scoring & Winner Determination (Priority: P3)

**Goal**: Calculate final scores with card point values, apply penalty doubling to Cambio caller if they didn't have lowest score, determine winner(s) with lowest final score

**Independent Test**: Complete a game where Player A calls Cambio with cards totaling 15, Player B has cards totaling 12. Verify Player B wins because they have the lower score. Verify Player A receives penalty (score doubled to 30) because they didn't have the lowest score

### Implementation for User Story 3

#### Server-Side Logic

- [X] T050 [P] [US3] Implement `calculateScores()` in server/utils/gameService.ts to query all players and their hand cards (location='hand'), sum card.pointValue for each player
- [X] T051 [US3] Add penalty logic in `calculateScores()` to identify lowest base score, then double Cambio caller's score if they didn't have lowest
- [X] T052 [US3] Implement `determineWinner()` in server/utils/gameService.ts to find player(s) with lowest final score (post-penalty), handle ties with multiple winners
- [X] T053 [US3] Implement `completeGame()` in server/utils/gameService.ts to orchestrate score calculation, winner determination, and game state updates
- [X] T054 [US3] Add game_score table insertion logic in `completeGame()` with fields: finalScore, isCambioCaller, penaltyApplied, isWinner, cardsSummary (JSONB array of final cards)
- [X] T055 [US3] Add game_session update logic in `completeGame()` to set phase='completed', winnerId=firstWinner, completedAt=NOW()
- [X] T056 [US3] Add `GAME_COMPLETED` event broadcast in `completeGame()` with scores array, winners array, and completion timestamp
- [ ] T057 [US3] Integrate `completeGame()` call into turn advancement logic when `processFinalRound()` returns true (all final turns done) **[Requires integration with turn system]**

#### API Endpoint

- [X] T058 [US3] Implement GET /api/game/[id]/scores.get.ts endpoint with game phase validation (must be 'completed')
- [X] T059 [US3] Add database query in scores.get.ts to fetch game_score records with LEFT JOIN to player table for display names
- [X] T060 [US3] Format response in scores.get.ts to match ScoresResponse schema (gameId, phase, completedAt, cambioCallerId, scores array, winners array)
- [X] T061 [US3] Calculate baseScore in scores.get.ts by reversing penalty (finalScore / 2 if penaltyApplied, else finalScore)
- [X] T062 [US3] Add error handling in scores.get.ts for 404 (game not found), 409 (game not completed yet, return currentPhase)

#### Client Components

- [X] T063 [P] [US3] Create app/components/Game/ScoreBoard.vue with props (scores: PlayerScore[])
- [X] T064 [US3] Implement table layout in ScoreBoard.vue with columns: Player, Cards, Base Score, Penalty, Final Score, Result
- [X] T065 [US3] Add winner highlighting in ScoreBoard.vue with green background for isWinner=true rows
- [X] T066 [US3] Display "Cambio Caller" badge in ScoreBoard.vue for isCambioCaller=true players
- [X] T067 [US3] Render final cards in ScoreBoard.vue as rank+suit abbreviations (e.g., "7H", "KS")
- [X] T068 [US3] Display penalty indicator in ScoreBoard.vue as "x2" for penaltyApplied=true, "-" otherwise
- [X] T069 [P] [US3] Create app/components/Game/GameOverModal.vue with props (winners: WinnerInfo[], gameId)
- [X] T070 [US3] Implement winner announcement in GameOverModal.vue with confetti or celebration animation (optional)
- [X] T071 [US3] Add "View Full Scores" button in GameOverModal.vue that navigates to ScoreBoard view

#### Client Integration

- [X] T072 [US3] Extend app/composables/useGameActions.ts with `getScores()` function that GETs from /api/game/[id]/scores
- [ ] T073 [US3] Add WebSocket event listener in GameBoard.vue for `GAME_COMPLETED` event
- [ ] T074 [US3] Fetch scores via `getScores()` when `GAME_COMPLETED` event received in GameBoard.vue
- [ ] T075 [US3] Display GameOverModal in GameBoard.vue when game phase transitions to 'completed' with winners data
- [ ] T076 [US3] Display ScoreBoard in GameBoard.vue when user clicks "View Full Scores" or game is completed
- [ ] T077 [US3] Update card visibility in GameBoard.vue to show all cards face-up when game phase='completed'

**Checkpoint**: All user stories should now be independently functional - complete gameplay loop from power activation through Cambio call to final scoring and winner determination

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T078 [P] Add card point value constants (K=0, A=1, J/Q=10) validation in shared/constants/game.ts if not already present
- [ ] T079 [P] Add comprehensive error logging in gameService.ts for all transaction failures and validation errors
- [ ] T080 [P] Validate all WebSocket event payloads match TypeScript type definitions in gameSocket.ts
- [ ] T081 Test disconnection handling during power activation (verify power cancels and turn advances)
- [ ] T082 Test disconnection handling during final round (verify disconnected player forfeits, remaining players complete)
- [ ] T083 Test edge case: blind swap between two Kings (0-point cards) completes successfully
- [ ] T084 Test edge case: all players have same score at game end (verify all marked as co-winners)
- [ ] T085 Test edge case: multiple Cambio call attempts (verify second attempt returns 409 error)
- [ ] T086 Test edge case: peek at invalid card position (verify server returns 400 error)
- [ ] T087 Run full gameplay test following quickstart.md manual testing checklist (15 test scenarios)
- [ ] T088 [P] Performance test: Verify WebSocket events < 500ms latency (Success Criteria SC-007)
- [ ] T089 [P] Performance test: Complete game playthrough < 10 minutes for 2 players (Success Criteria SC-006)
- [ ] T090 Code review: Verify all game logic is server-side with no client validation (Constitution Principle II)
- [ ] T091 Code review: Verify modal interactions are mobile-responsive with 44x44px touch targets (Constitution Principle III)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Special Powers**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2) - Cambio Call**: Can start after Foundational (Phase 2) - Independent of US1 but typically tested after powers work
- **User Story 3 (P3) - Scoring**: Can start after Foundational (Phase 2) - Requires US2 Cambio logic to trigger, but scoring calculation is independent

### Within Each User Story

#### User Story 1: Special Powers
1. Server-side logic (T010-T017) → API endpoint (T018-T019) → Client components (T020-T026) → Client integration (T027-T031)
2. Parallel: T010, T011 (different helpers) | T020, T021, T022, T023 (different PowerModal sections)

#### User Story 2: Cambio Call
1. Server-side logic (T032-T038) → API endpoint (T039-T040) → Client components (T041-T044) → Client integration (T045-T049)
2. Parallel: T032, T037 (different service functions) | T041, T044 (CambioButton structure/style)

#### User Story 3: Scoring
1. Server-side logic (T050-T057) → API endpoint (T058-T062) → Client components (T063-T071) → Client integration (T072-T077)
2. Parallel: T050, T052 (different service functions) | T063, T069 (different components)

### Parallel Opportunities

#### Phase 2 (Foundational)
```bash
# Launch in parallel:
Task: T005 (Zod schemas in shared/types)
Task: T006 (TypeScript types in shared/types)
Task: T007 (broadcastToPlayer in gameSocket.ts)
# Then T008, T009 sequentially (depend on types)
```

#### User Story 1 - Server-Side Helpers
```bash
# Launch in parallel:
Task: T010 (validatePowerTarget)
Task: T011 (selectRandomCard)
# Then T012, T013 (both use validation)
```

#### User Story 1 - Client Components
```bash
# Launch in parallel:
Task: T020 (PowerModal skeleton)
Task: T021 (card selection grid)
Task: T022 (opponent selector)
Task: T023 (auto-peek display)
```

#### User Story 3 - Server-Side Logic
```bash
# Launch in parallel:
Task: T050 (calculateScores)
Task: T052 (determineWinner)
# Then T053 (completeGame orchestrates both)
```

#### Polish Phase
```bash
# Launch in parallel:
Task: T078 (constants validation)
Task: T079 (error logging)
Task: T080 (WebSocket payload validation)
Task: T088 (latency performance test)
Task: T089 (playthrough performance test)
```

---

## Parallel Example: User Story 1

```bash
# Step 1: Launch server-side helpers together
Task: "Implement validatePowerTarget() in server/utils/powerHelpers.ts"
Task: "Implement selectRandomCard() in server/utils/powerHelpers.ts"

# Step 2: Launch client component sections together
Task: "Implement card selection grid in PowerModal.vue"
Task: "Implement opponent selector in PowerModal.vue"
Task: "Add auto-peek display in PowerModal.vue"

# Step 3: Sequential - API endpoint integration
Task: "Implement POST /api/game/[id]/power.post.ts endpoint"

# Step 4: Sequential - Client integration
Task: "Extend useGameActions.ts with activatePower() and skipPower()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (Database migration)
2. Complete Phase 2: Foundational (Zod schemas, types, helpers, service skeleton)
3. Complete Phase 3: User Story 1 (Special Powers)
4. **STOP and VALIDATE**: Test all 4 power types independently (peek own, peek opponent, blind swap, auto-peek King)
5. Verify private peek reveals, modal interactions, timer auto-hide
6. Deploy/demo special powers feature

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Special Powers) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Cambio Call) → Test final round logic → Deploy/Demo
4. Add User Story 3 (Scoring) → Test complete game loop → Deploy/Demo
5. Add Polish (Cross-cutting) → Final validation → Production deployment
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical path)
2. Once Foundational is done:
   - Developer A: User Story 1 (Special Powers) - T010-T031
   - Developer B: User Story 2 (Cambio Call) - T032-T049
   - Developer C: User Story 3 (Scoring) - T050-T077
3. Stories complete and integrate independently
4. Team reconvenes for Polish phase validation

---

## Progress Summary

**Total Tasks**: 91 tasks across 6 phases

### Task Count per Phase
- **Phase 1 (Setup)**: 4 tasks
- **Phase 2 (Foundational)**: 5 tasks (BLOCKING - must complete before user stories)
- **Phase 3 (User Story 1 - Special Powers)**: 22 tasks
- **Phase 4 (User Story 2 - Cambio Call)**: 18 tasks
- **Phase 5 (User Story 3 - Scoring)**: 28 tasks
- **Phase 6 (Polish)**: 14 tasks

### Task Count per User Story
- **US1 (Special Powers)**: 22 tasks
- **US2 (Cambio Call)**: 18 tasks
- **US3 (Scoring)**: 28 tasks

### Parallel Opportunities Identified
- Phase 2 Foundational: 3 tasks (T005, T006, T007)
- User Story 1 Server: 2 tasks (T010, T011)
- User Story 1 Client: 4 tasks (T020, T021, T022, T023)
- User Story 2 Server: 2 tasks (T032, T037)
- User Story 3 Server: 2 tasks (T050, T052)
- User Story 3 Client: 2 tasks (T063, T069)
- Polish Phase: 5 tasks (T078, T079, T080, T088, T089)

### Independent Test Criteria
- **US1**: Discard power card → Modal appears → Select target → Card revealed privately → Timer auto-hides after 5s
- **US2**: Call Cambio → Final round starts → Each other player takes exactly 1 turn → Game ends
- **US3**: Complete game → Scores calculated → Cambio caller penalty applied if didn't have lowest → Winner(s) determined

### Suggested MVP Scope
**Phase 1 + Phase 2 + Phase 3** (User Story 1 only)
- Total: 31 tasks
- Deliverable: Special card powers fully functional with modal UI, private peek reveals, and timer-based auto-hide
- Testing: Use quickstart.md checklist items 1-9 (power activation scenarios)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability (US1, US2, US3)
- Each user story should be independently completable and testable
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently before proceeding
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Follow Constitution Principle II: All game logic server-side (no client validation)
- Follow Constitution Principle III: Mobile-first design with 44x44px touch targets
- Follow Constitution Principle IV: Minimal testing strategy (server logic only, manual QA for UI)
