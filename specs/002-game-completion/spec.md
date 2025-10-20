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

**Independent Test**: Start a 2-player game, play until you draw a 7, discard it, verify peek power modal appears, select a card position, verify card is revealed temporarily only to you, verify other player doesn't see the revealed card.

**Acceptance Scenarios**:

1. **Given** I draw a 7 or 8 from the deck, **When** I discard it, **Then** I can peek at one of my own cards
2. **Given** I draw a 9 or 10 from the deck, **When** I discard it, **Then** I can peek at one of my opponent's cards
3. **Given** I draw a Jack or Queen from the deck, **When** I discard it, **Then** I can perform a blind swap (swap one of my cards with any other player's card without seeing either)
4. **Given** I draw a King from the deck, **When** I discard it, **Then** I automatically peek at one of my own cards (auto-selected)
5. **Given** a special power is activated, **When** the peek duration expires (5 seconds), **Then** the revealed card returns to hidden state
6. **Given** I have a special power available, **When** I choose to skip using it, **Then** my turn ends without activating the power

**Power Mapping**:
- **7, 8**: Peek at own card (player chooses which position)
- **9, 10**: Peek at opponent's card (player chooses which opponent and position)
- **J, Q**: Blind swap (player chooses their position and target player's position)
- **K**: Auto-peek own card (automatically reveals a random own card)

---

### User Story 2 - Cambio Call & Final Round (Priority: P2)

A player can call "Cambio!" at the start of their turn if they believe they have the lowest score. This triggers a final round where all other players get exactly one more turn, then all cards are revealed and scored.

**Why this priority**: The Cambio call is the core end-game mechanic. Without it, games have no clear ending condition.

**Independent Test**: Play a game until mid-way through, call Cambio at the start of my turn, verify a "Final Round" indicator appears for all players, verify each other player takes exactly one more turn, verify after all final turns the game ends and scores are calculated.

**Acceptance Scenarios**:

1. **Given** it's my turn and the game is in "playing" phase, **When** I call Cambio before drawing, **Then** the game enters "final_round" phase and I am marked as the Cambio caller
2. **Given** Cambio has been called, **When** the Cambio caller finishes their turn, **Then** each other player (in turn order) gets exactly one final turn
3. **Given** I am not the Cambio caller and it's the final round, **When** I complete my turn, **Then** the next player in turn order takes their final turn
4. **Given** all players have taken their final turn, **When** the last player's turn ends, **Then** all cards are revealed and the game moves to "completed" phase
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

- What happens when a player disconnects during a special power activation?
- How does the system handle a blind swap between two Kings (0-point cards)?
- What happens if all players have the same score at game end?
- How does the system prevent multiple Cambio calls in the same game?
- What happens if a player tries to peek at a card position that doesn't exist?
- How does the system handle rapid special power activations (prevent double-activation)?
- What happens if the Cambio caller disconnects during the final round?

## Requirements *(mandatory)*

### Functional Requirements

**Special Powers:**
- **FR-001**: System MUST detect when a player discards a power card (7, 8, 9, 10, J, Q, K) and trigger the corresponding power activation flow
- **FR-002**: System MUST enforce power visibility rules (peek powers show cards only to the activating player)
- **FR-003**: System MUST allow players to skip/decline using a special power
- **FR-004**: System MUST prevent power activation after the power window has expired (immediately after discard)
- **FR-005**: System MUST record all power activations in the special_power table for game history

**Cambio Call:**
- **FR-006**: System MUST allow Cambio call only at the START of a player's turn (before drawing)
- **FR-007**: System MUST allow only ONE Cambio call per game
- **FR-008**: System MUST transition game to "final_round" phase when Cambio is called
- **FR-009**: System MUST ensure each non-caller player gets exactly ONE final turn after Cambio
- **FR-010**: System MUST end the game after all final turns are complete

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

### Key Entities

- **SpecialPower** (already in DB schema): Records power activation, type, activator, target card/player
- **GameScore** (already in DB schema): Records final scores, penalties, winner status
- **GameSession.phase**: Enum values include "final_round" and "completed" states
- **GameSession.cambioCallerId**: References the player who called Cambio

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can activate all 4 types of special powers (peek own, peek opponent, blind swap, auto-peek) without errors
- **SC-002**: Peek power card reveals are visible only to the activating player (verified via WebSocket event filtering)
- **SC-003**: Cambio call correctly triggers final round with exactly N-1 additional turns (where N = number of players)
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

## Out of Scope

The following are explicitly NOT included in this feature (may be in future features):

- ❌ AI bot decision-making for special powers (bots will skip powers)
- ❌ Player reconnection during final round
- ❌ Game history/replay functionality
- ❌ Statistics tracking (wins/losses per player)
- ❌ Tournament mode or multi-round games
- ❌ Custom power variations or house rules
