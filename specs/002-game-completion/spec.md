# Feature Specification: Game Completion - Special Powers & Scoring

**Feature Branch**: `002-game-completion`
**Created**: 2025-10-20
**Status**: Draft
**Depends On**: Core game mechanics (001-core-game-mechanics) - Phases 1-4 completed

## Overview

This feature completes the core Cambio game mechanics by implementing:
1. Special card powers (7/8 peek own, 9/10 peek opponent, J/Q blind swap, K auto-peek)
2. Cambio call mechanism (end game trigger)
3. Scoring system with penalties
4. Winner determination

**What's Already Built** (from 001-core-game-mechanics):
- ✅ Database schema with all tables (game_session, player, card, turn, special_power, game_score)
- ✅ Game creation and joining
- ✅ Card dealing and initial game setup
- ✅ Turn-based gameplay (draw from deck/discard, swap cards, discard)
- ✅ WebSocket real-time updates
- ✅ Game state management

**What Needs Implementation**:
- ❌ Special card power activation and effects
- ❌ Cambio call logic and final round
- ❌ Score calculation with penalties
- ❌ Game completion and winner determination

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Special Card Powers (Priority: P1) 🎯 MVP

When a player discards certain cards during their turn, they can activate special powers to gain strategic advantages by peeking at hidden cards or swapping cards blindly.

**Why this priority**: Special powers are the core mechanic that makes Cambio unique and strategic. Without these, the game is just a simple card-swapping game with no depth.

**Independent Test**: Start a 2-player game, play until you draw a 7, discard it, verify a modal dialog appears prompting you to peek at a card, select a card position in the modal, verify the card is revealed temporarily only to you within the modal interface, verify the other player doesn't see the revealed card.

**Acceptance Scenarios**:

1. **Given** I draw a 7 or 8 from the deck, **When** I discard it, **Then** a modal dialog appears allowing me to select and peek at one of my own cards
2. **Given** I draw a 9 or 10 from the deck, **When** I discard it, **Then** a modal dialog appears allowing me to select an opponent and peek at one of their cards
3. **Given** I draw a Jack or Queen from the deck, **When** I discard it, **Then** a modal dialog appears allowing me to perform a blind swap (select one of my cards and one target player's card without seeing either)
4. **Given** I draw a King from the deck, **When** I discard it, **Then** a modal dialog appears showing an automatically selected one of my own cards (no player choice required)
5. **Given** a special power is activated and a card is revealed in the modal, **When** the next game event occurs or 5 seconds elapse (whichever comes first), **Then** the revealed card returns to hidden state and the modal closes
6. **Given** a special power modal is displayed, **When** I choose to skip using it, **Then** the modal closes and my turn ends without activating the power

**Power Mapping**:
- **7, 8**: Peek at own card (player chooses which position)
- **9, 10**: Peek at opponent's card (player chooses which opponent and position)
- **J, Q**: Blind swap (player chooses their position and target player's position)
- **K**: Auto-peek own card (system randomly selects one of player's own cards, no player choice required)

---

### User Story 2 - Cambio Call & Final Round (Priority: P2)

A player can call "Cambio!" at the start of their turn if they believe they have the lowest score. This triggers a final round where all other players get exactly one more turn, then all cards are revealed and scored.

**Why this priority**: The Cambio call is the core end-game mechanic. Without it, games have no clear ending condition.

**Independent Test**: Play a game until mid-way through, call Cambio at the start of my turn, verify a "Final Round" indicator appears for all players, verify each other player takes exactly one more turn, verify after all final turns the game ends and scores are calculated.

**Acceptance Scenarios**:

1. **Given** it's my turn and the game is in "playing" phase, **When** I call Cambio before drawing, **Then** the game enters "final_round" phase, I am marked as the Cambio caller, and my turn immediately ends
2. **Given** Cambio has been called and the caller's turn has ended, **When** the final round begins, **Then** each other player (excluding the caller, in turn order) gets exactly one final turn
3. **Given** I am not the Cambio caller and it's the final round, **When** I complete my turn, **Then** the next player in turn order takes their final turn
4. **Given** all non-caller players have taken their final turn, **When** the last player's turn ends, **Then** all cards are revealed and the game moves to "completed" phase
5. **Given** Cambio has been called, **When** another player tries to call Cambio, **Then** they receive an error (only one Cambio call per game)

---

### User Story 3 - Scoring & Winner Determination (Priority: P3)

When the game ends (after final round), all cards are revealed, scores are calculated (with penalties), and the winner is determined.

**Why this priority**: Scoring determines the outcome of the game. Must happen after Cambio mechanism is working.

**Independent Test**: Complete a game where Player A calls Cambio with cards totaling 15, Player B has cards totaling 12. Verify Player B wins because they have the lower score. Verify Player A receives no penalty because they didn't have the highest score.

**Acceptance Scenarios**:

1. **Given** the final round has ended, **When** all cards are revealed, **Then** each player's score is calculated as the sum of their card point values
2. **Given** scoring is complete, **When** the Cambio caller does NOT have the lowest score, **Then** their score is doubled as a penalty
3. **Given** scoring is complete, **When** scores are compared, **Then** the player with the LOWEST score is determined as the winner
4. **Given** the game is completed, **When** I view the final results, **Then** I see all players' cards, their scores, penalties applied, and the winner highlighted
5. **Given** the game is completed, **When** scores are tied, **Then** all tied players are marked as co-winners

**Card Point Values**:
- **K** (King): 0 points
- **A** (Ace): 1 point
- **2-10**: Face value (2 = 2 points, 10 = 10 points)
- **J, Q**: 10 points each

**Penalty Rule**:
- If Cambio caller does NOT have the lowest score, their score is DOUBLED

---

### Edge Cases

- **Player disconnection during final round**: Disconnected player forfeits their final turn; remaining connected players complete their final turns normally; game proceeds to scoring with disconnected player's current cards
- **Player disconnects during special power activation**: Power activation is cancelled; turn ends automatically; no power effect is applied
- **Blind swap between two Kings (0-point cards)**: Swap executes normally (cards change positions but both are 0 points)
- **All players have same score at game end**: All tied players are marked as co-winners (as per acceptance scenario in User Story 3)
- **Multiple Cambio calls prevented**: Database constraint or service-level check ensures cambioCallerId can only be set once per game; subsequent attempts return error
- **Peek at invalid card position**: Server validates position exists before revealing; returns error if position < 0 or >= player's card count
- **Rapid special power activations**: Server uses optimistic locking or transaction isolation to ensure only one power activation processes per discard event

## Requirements *(mandatory)*

### Functional Requirements

**Special Powers:**
- **FR-001**: System MUST detect when a player discards a power card (7, 8, 9, 10, J, Q, K) and trigger a modal dialog for power activation
- **FR-002**: System MUST enforce power visibility rules (peek powers show cards only to the activating player within the modal)
- **FR-003**: System MUST allow players to skip/decline using a special power via a skip button in the modal
- **FR-004**: System MUST prevent power activation after the power window has expired (immediately after discard)
- **FR-005**: System MUST record all power activations in the special_power table for game history
- **FR-019**: System MUST hide peeked cards and close the modal when the next game event occurs OR after 5 seconds elapse (whichever comes first)
- **FR-020**: System MUST randomly select one of the player's own cards for King (K) power activation and display it in the modal without requiring player input
- **FR-024**: System MUST block all other game actions while a special power modal is active (modal must be resolved or skipped before turn continues)

**Cambio Call:**
- **FR-006**: System MUST allow Cambio call only at the START of a player's turn (before drawing)
- **FR-007**: System MUST allow only ONE Cambio call per game
- **FR-008**: System MUST transition game to "final_round" phase when Cambio is called and immediately end the caller's turn
- **FR-009**: System MUST ensure each non-caller player gets exactly ONE final turn after Cambio (caller does not receive an additional turn)
- **FR-010**: System MUST end the game after all non-caller players complete their final turns

**Scoring:**
- **FR-011**: System MUST calculate scores using card point values (K=0, A=1, 2-10=face, J/Q=10)
- **FR-012**: System MUST double the Cambio caller's score if they do NOT have the lowest score
- **FR-013**: System MUST determine winner(s) as the player(s) with the lowest final score
- **FR-014**: System MUST persist final scores in the game_score table
- **FR-015**: System MUST reveal all cards to all players when the game ends

**State Management:**
- **FR-016**: System MUST broadcast all state changes (power activations, Cambio calls, game completion) via WebSocket
- **FR-017**: System MUST validate all actions server-side (never trust client)
- **FR-018**: System MUST handle concurrent action attempts gracefully (optimistic locking)

**Disconnection Handling:**
- **FR-021**: System MUST forfeit a disconnected player's final turn and allow remaining players to complete their turns
- **FR-022**: System MUST cancel any in-progress special power activation if the activating player disconnects
- **FR-023**: System MUST proceed to game completion and scoring using disconnected players' current card states

### Key Entities

- **SpecialPower** (already in DB schema): Records power activation, type, activator, target card/player
- **GameScore** (already in DB schema): Records final scores, penalties, winner status
- **GameSession.phase**: Enum values include "final_round" and "completed" states
- **GameSession.cambioCallerId**: References the player who called Cambio

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can activate all 4 types of special powers (peek own, peek opponent, blind swap, auto-peek) without errors
- **SC-002**: Peek power card reveals are visible only to the activating player (verified via WebSocket event filtering)
- **SC-003**: Cambio call immediately ends the caller's turn and triggers final round with exactly N-1 additional turns (where N = number of players, excluding the caller)
- **SC-004**: Scoring calculation is accurate 100% of the time (K=0, A=1, 2-10=face, J/Q=10, with penalty doubling)
- **SC-005**: Winner determination is correct for all score combinations including ties
- **SC-006**: Complete game playthrough (create → join → play → powers → Cambio → scoring) completes in < 10 minutes for 2 players
- **SC-007**: All game state changes are broadcast via WebSocket with < 500ms latency

### Technical Validation

- **All server-side validation**: No game logic on client
- **WebSocket event filtering**: Private events (peek) only sent to relevant players
- **Database consistency**: Final scores match calculated scores from cards
- **Error handling**: Graceful handling of invalid power targets, duplicate Cambio calls, disconnections

## Dependencies

**Requires (from 001-core-game-mechanics)**:
- ✅ Database schema with special_power and game_score tables
- ✅ Game session management (createGame, joinGame, startGame)
- ✅ Turn-based gameplay (draw, swap, discard)
- ✅ WebSocket infrastructure (gameEvents, real-time updates)
- ✅ Card utilities (shuffle, deal, point values)

**API Endpoints (exist but return 501)**:
- `POST /api/game/[id]/power` - Needs implementation
- `POST /api/game/[id]/cambio` - Needs implementation
- `GET /api/game/[id]/scores` - Needs implementation

**Service Functions Needed**:
- `activateSpecialPower(gameId, playerId, powerType, target)`
- `callCambio(gameId, playerId)`
- `calculateScores(gameId)`
- `determineWinner(gameId)`
- `completeGame(gameId)`

## Clarifications

### Session 2025-10-20

- Q: When does a peeked card return to hidden state? → A: Peeked card revealed until next game event or 5s timeout (whichever first)
- Q: For King (K) power, how is the card to peek selected? → A: Auto-select random card, no player choice
- Q: Does the Cambio caller take a normal turn after calling Cambio? → A: Caller turn immediately ends, then final round starts, everyone but the caller gets one more go
- Q: When a player disconnects during the final round, what happens? → A: Disconnected player forfeits, remaining players complete final turns
- Q: How should special power interactions be presented to the player? → A: Modal dialog (blocks other actions)

## Out of Scope

The following are explicitly NOT included in this feature (may be in future features):

- ❌ AI bot decision-making for special powers (bots will skip powers)
- ❌ Player reconnection during final round
- ❌ Game history/replay functionality
- ❌ Statistics tracking (wins/losses per player)
- ❌ Tournament mode or multi-round games
- ❌ Custom power variations or house rules
