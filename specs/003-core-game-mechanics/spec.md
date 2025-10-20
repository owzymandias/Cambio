# Feature Specification: Core Cambio Game Mechanics

**Feature Branch**: `003-core-game-mechanics`
**Created**: 2025-10-19
**Status**: Draft
**Input**: User description: "Core Cambio Game Mechanics - multiplayer card game with real-time synchronization"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Host Game (Priority: P1) 🎯 MVP

As a player, I want to create a new game session and receive a shareable room code so that I can invite friends to play Cambio with me.

**Why this priority**: Foundation for all other features - without game creation, no other gameplay is possible. This is the entry point for the entire feature.

**Independent Test**: Player can create a game through the UI, receive a unique 6-character room code, and see the game waiting in a lobby state. Can optionally configure AI bot opponents. Game persists in database.

**Acceptance Scenarios**:

1. **Given** I am a logged-in user, **When** I navigate to the game lobby and click "Create Game", **Then** a new game is created with a unique room code displayed to me
2. **Given** I am creating a game, **When** I select 2 total players with 1 AI bot, **Then** the game is created with one human player slot (me) and one bot opponent slot
3. **Given** I have created a game, **When** I view the lobby, **Then** I see my room code, the list of current players, and a "Start Game" button (disabled until minimum players join)
4. **Given** I create two games sequentially, **When** I check both room codes, **Then** they are different and unique

---

### User Story 2 - Join Existing Game (Priority: P2)

As a player, I want to join an existing game by entering a room code so that I can play with friends who have already created a game session.

**Why this priority**: Second critical piece - enables multiplayer functionality. Required before any actual gameplay can occur.

**Independent Test**: Player can enter a valid room code, join an existing game, and see other players in the lobby in real-time. Invalid codes are rejected with clear error messages.

**Acceptance Scenarios**:

1. **Given** a friend has shared a room code "ABC123" with me, **When** I enter this code in the join form and click "Join", **Then** I am added to that game lobby and see all current players
2. **Given** I am in a game lobby, **When** another player joins using the room code, **Then** I see them appear in the player list immediately (real-time update)
3. **Given** I enter an invalid room code "XYZ999", **When** I try to join, **Then** I see an error message "Game not found"
4. **Given** a game already has 4 players, **When** I try to join with the room code, **Then** I see an error message "Game is full"
5. **Given** I am already in a game, **When** I try to join the same game again, **Then** I see an error message "You are already in this game"

---

### User Story 3 - Game Start and Initial Card Deal (Priority: P3)

As a player, when the game starts, I want to receive 4 cards arranged in a 2x2 grid and see my bottom two cards briefly so that I can begin strategizing.

**Why this priority**: Establishes the initial game state - required before turn-based gameplay can begin.

**Independent Test**: When minimum 2 players are in lobby and host clicks "Start Game", each player receives 4 cards in a 2x2 grid layout. Bottom two cards are revealed for 10 seconds, then flip to hidden. All players see this happen simultaneously.

**Acceptance Scenarios**:

1. **Given** a game has 2 players in the lobby, **When** the host clicks "Start Game", **Then** each player receives exactly 4 cards arranged in a 2x2 grid (positions: top-left, top-right, bottom-left, bottom-right)
2. **Given** the game has just started, **When** cards are dealt, **Then** I can see the faces of my bottom two cards for 10 seconds
3. **Given** the 10-second initial view period has elapsed, **When** I look at my cards, **Then** the bottom two cards flip to face-down and I can no longer see them (unless I use a peek power later)
4. **Given** I am Player 2 in the game, **When** Player 1 receives their cards, **Then** I see 4 face-down cards on their side of the board (I cannot see their card values)
5. **Given** the game has started, **When** all cards are dealt, **Then** a draw pile and an empty discard pile appear in the center of the board

---

### User Story 4 - Turn-Based Gameplay (Draw, Swap, Discard) (Priority: P4) 🎯 MVP

As a player on my turn, I want to draw a card from either the deck or discard pile, decide whether to swap it with one of my cards, and end my turn so that the game progresses strategically.

**Why this priority**: Core gameplay loop - this is what makes Cambio a game. Essential for MVP.

**Independent Test**: Player can take a complete turn: draw from deck or discard, swap with one of their 4 cards (or discard without swapping), and end turn. Turn advances to next player. All players see updates in real-time.

**Acceptance Scenarios**:

1. **Given** it is my turn, **When** I click the draw pile, **Then** I draw a random card from the deck and see its face value
2. **Given** it is my turn and the discard pile has a visible card, **When** I click the discard pile, **Then** I take that card and see its face value
3. **Given** I have drawn a card (e.g., 7 of Hearts), **When** I click one of my four card positions, **Then** that position's card is swapped out and replaced with the drawn card, and the old card goes to the discard pile
4. **Given** I have drawn a card, **When** I choose "Discard without swapping", **Then** the drawn card goes directly to the discard pile and my hand remains unchanged
5. **Given** I complete my turn action (swap or discard), **When** my turn ends, **Then** the turn indicator moves to the next player and they can now take actions
6. **Given** it is not my turn, **When** I try to click the draw pile or discard pile, **Then** the buttons are disabled and I see "Player X's turn"
7. **Given** I draw a card from the deck, **When** I look at the discard pile, **Then** I see the card I just discarded on top

---

### User Story 5 - Special Card Powers (Priority: P5)

As a player, when I discard certain card ranks, I want to activate special powers (peek at cards, blind swap) so that I can gain strategic advantages and memorable gameplay moments.

**Why this priority**: Adds depth and strategic complexity beyond basic draw/swap mechanics. Not required for MVP but significantly enhances gameplay.

**Independent Test**: Player discards a 7 and can peek at one of their own cards. Player discards a 9 and can peek at an opponent's card (only they see it). Player discards a Jack and can blindly swap cards. Player discards a King and automatically peeks at one of their cards. Powers are optional (can be declined).

**Acceptance Scenarios**:

1. **Given** I discard a 7 or 8, **When** the discard action completes, **Then** I am prompted to select one of my four cards to peek at, I see its value temporarily, then it flips back to hidden
2. **Given** I discard a 9 or 10, **When** the power activates, **Then** I am prompted to select an opponent and one of their four card positions, I see that card's value (no one else sees it), then it flips back
3. **Given** I discard a Jack or Queen, **When** the power activates, **Then** I select one of my cards and one of an opponent's cards, and they are swapped without anyone seeing the values
4. **Given** I discard a King, **When** the power activates, **Then** one of my cards is automatically revealed to me (I see its value)
5. **Given** a special power activates, **When** I am prompted to use it, **Then** I can click "Skip Power" to decline and proceed without using it
6. **Given** I use a peek power on a card, **When** other players watch the game, **Then** they see a "Player X used a power" message but do not see which card was revealed

---

### User Story 6 - Cambio Call and Scoring (Priority: P6) 🎯 MVP

As a player, when I think I have the lowest score, I want to call "Cambio" to trigger the final round, after which all cards are revealed and the winner with the lowest score is declared.

**Why this priority**: Game completion mechanic - defines how games end and winners are determined. Essential for MVP.

**Independent Test**: Player calls Cambio after their turn, triggering final round. Each other player takes exactly one more turn. All cards are revealed, scores are calculated correctly (K=0, J/Q=10, A=1, etc.), winner is determined (lowest score), and game ends. If Cambio caller doesn't have lowest score, their score is doubled.

**Acceptance Scenarios**:

1. **Given** it is my turn and I have completed my action, **When** I click the "Call Cambio" button, **Then** the game enters "final round" mode and all players are notified "Player X called Cambio!"
2. **Given** Cambio has been called, **When** the final round begins, **Then** each other player (except the caller) gets exactly one more turn
3. **Given** the final round has completed, **When** all players have taken their last turn, **Then** all cards are revealed face-up and scores are calculated
4. **Given** my hand has cards [K♠, 3♥, 7♦, 2♣], **When** the score is calculated, **Then** my score is 12 (0+3+7+2)
5. **Given** three players have scores [12, 8, 15], **When** the game ends, **Then** the player with score 8 is declared the winner
6. **Given** I called Cambio with a score of 10, **When** another player has a score of 8, **Then** my score is doubled to 20 (penalty for incorrect Cambio call) and the other player wins
7. **Given** I called Cambio with a score of 7, **When** all other players have higher scores, **Then** I win with score 7 (no penalty for correct Cambio call)
8. **Given** the game has ended, **When** the winner is announced, **Then** I see a summary screen with all final scores, the winner highlighted, and a "Return to Lobby" button

---

### User Story 7 - AI Bot Opponents (Priority: P7)

As a solo player, I want to play against AI bot opponents that make reasonable strategic decisions so that I can practice and enjoy the game without needing other human players.

**Why this priority**: Enables single-player practice mode. Not required for multiplayer MVP, but valuable for player retention and learning.

**Independent Test**: Player creates a game with 3 bots, starts the game, and observes bots taking turns automatically with 1-2 second delays. Bots make strategically reasonable decisions (take low cards from discard, swap high-value cards, call Cambio when their estimated score is low).

**Acceptance Scenarios**:

1. **Given** I create a game with 3 AI bots, **When** the game starts, **Then** bots automatically take turns without manual input
2. **Given** it is a bot's turn, **When** the discard pile shows a low-value card (≤4), **Then** the bot has a high probability of taking it instead of drawing from the deck
3. **Given** a bot draws a card, **When** deciding which card to swap, **Then** the bot tends to replace cards in the top row (unseen) over bottom row (known from initial view)
4. **Given** a bot has estimated their score is low, **When** it is their turn, **Then** the bot may call Cambio
5. **Given** a bot takes an action, **When** I watch the game, **Then** there is a 1-2 second delay between their actions to simulate thinking time
6. **Given** I create a game with "hard" difficulty bots, **When** they play, **Then** they make better strategic decisions than "easy" bots (better card memory, more accurate Cambio timing)

---

### User Story 8 - Player Reconnection and Bot Takeover (Priority: P8)

As a player who experiences a network interruption, I want to reconnect within 60 seconds and resume my game so that temporary disconnects don't ruin the experience for me or other players.

**Why this priority**: Network resilience - important for mobile users and poor connections. Prevents game abandonment.

**Independent Test**: Player disconnects mid-game (close browser), reconnects within 30 seconds, and resumes with same cards and game state. Player disconnects and waits 65 seconds - a bot takes over their position and continues playing.

**Acceptance Scenarios**:

1. **Given** I am in an active game, **When** my network connection drops, **Then** other players see "Player X disconnected" and the game pauses briefly (if it's my turn)
2. **Given** I disconnected 30 seconds ago, **When** I reconnect and navigate to the game, **Then** I am rejoined with my same cards, position, and the game continues from where it left off
3. **Given** I disconnected 65 seconds ago, **When** I try to reconnect, **Then** I see a message "A bot has taken over your position" and I can spectate but not play
4. **Given** a bot has taken over my position, **When** I spectate the game, **Then** the bot continues playing with my cards until the game ends
5. **Given** I am mid-turn and disconnect, **When** I reconnect within 60 seconds, **Then** it is still my turn and I can complete my action

---

### User Story 9 - Game State Retrieval (Priority: P9)

As a player, when I refresh my browser or navigate directly to a game URL, I want to load the current game state so that I don't lose my progress or have to memorize the game link.

**Why this priority**: Session persistence - prevents accidental game loss from browser refreshes. Quality-of-life feature.

**Independent Test**: Player joins a game, copies the game URL, closes the tab, reopens the URL in a new tab, and sees the current game state (their cards, turn indicator, other players) loaded correctly.

**Acceptance Scenarios**:

1. **Given** I am in an active game, **When** I refresh the browser page, **Then** the game state reloads showing my current cards, the turn indicator, and all players' positions
2. **Given** I am Player 2 in a game, **When** I request the game state, **Then** I see only the cards that are visible to me (my own cards marked visible, and any opponent cards I've peeked at)
3. **Given** I navigate directly to a game URL `/game/abc-123-xyz`, **When** the page loads, **Then** I am reconnected to that game session if it still exists
4. **Given** I try to load a game that has ended, **When** the page loads, **Then** I see the final scores and winner announcement (archived game state)

---

### Edge Cases

- **What happens when all players disconnect simultaneously?** Game enters "abandoned" state after 5 minutes. When any player reconnects, they see "Game was abandoned" message.
- **What happens when the Cambio caller leaves mid-game?** If within 60s window, game pauses waiting for reconnection. After 60s, bot takes over and final round continues.
- **What happens when a player tries to join with the same room code twice (two browser tabs)?** Second tab shows error "You are already connected to this game in another session"
- **What happens when the draw pile runs out of cards?** Shuffle the discard pile (except top card) to create a new draw pile.
- **What happens when a player disconnects during a special power activation?** Power is automatically skipped and turn ends. Other players are notified.
- **What happens when two players try to join the same game at exactly the same time for the 4th slot?** Database unique constraint ensures only one succeeds; the other receives "Game is full" error.
- **What happens if a player calls Cambio before taking any turns?** Cambio can only be called after completing at least one full turn (draw + action).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate unique 6-character room codes for each game session (uppercase alphanumeric excluding similar-looking characters like 0/O, 1/I)
- **FR-002**: System MUST support 2-4 players per game (any combination of human players and AI bots)
- **FR-003**: System MUST shuffle the 52-card deck using a cryptographically secure random number generator before dealing
- **FR-004**: System MUST deal exactly 4 cards to each player in a 2×2 grid arrangement (positions: top-left, top-right, bottom-left, bottom-right)
- **FR-005**: System MUST reveal each player's bottom two cards to only that player for exactly 10 seconds at game start, then hide them
- **FR-006**: System MUST enforce turn order (players take turns sequentially based on their position: 0 → 1 → 2 → 3 → 0...)
- **FR-007**: System MUST allow the current player to draw from either the deck (random card) or discard pile (top visible card)
- **FR-008**: System MUST allow the current player to swap a drawn card with any of their 4 cards OR discard without swapping
- **FR-009**: System MUST activate special powers when specific card ranks are discarded: 7/8 (peek own card), 9/10 (peek opponent card), J/Q (blind swap), K (auto-peek own card)
- **FR-010**: System MUST allow players to decline special powers (skip option)
- **FR-011**: System MUST allow any player to call "Cambio" after completing their turn action
- **FR-012**: System MUST trigger final round when Cambio is called, giving each other player exactly one more turn
- **FR-013**: System MUST calculate scores using card values: K=0, J/Q=10, A=1, ranks 2-10=face value
- **FR-014**: System MUST determine the winner as the player with the lowest total card value
- **FR-015**: System MUST double the Cambio caller's score if they do not have the lowest score (penalty for incorrect call)
- **FR-016**: System MUST award the win to the Cambio caller in case of a tie (caller wins ties)
- **FR-017**: System MUST provide AI bot opponents with three difficulty levels (easy, medium, hard)
- **FR-018**: System MUST have bots make decisions automatically with 1-3 second delays to simulate thinking time
- **FR-019**: System MUST validate all game actions server-side (no client-side game logic or rule enforcement)
- **FR-020**: System MUST broadcast game state changes to all players in real-time (card draws, swaps, discards, turn changes, Cambio calls)
- **FR-021**: System MUST allow disconnected players to reconnect within 60 seconds and resume their position
- **FR-022**: System MUST convert disconnected players to AI bots after 60 seconds of disconnection
- **FR-023**: System MUST persist game state to database (survives server restarts, allows state retrieval via API)
- **FR-024**: System MUST filter card visibility based on player perspective (players only see cards marked visible to them)
- **FR-025**: System MUST prevent players from joining full games (4 players), duplicate joins (same player twice), or joining with invalid room codes
- **FR-026**: System MUST log all game actions with timestamps for audit trail (join, deal, draw, swap, discard, power use, Cambio call, scoring)

### Key Entities

- **Game Session**: Represents a single game instance with unique room code, status (waiting, active, final round, completed, abandoned), current turn index, draw pile, discard pile, Cambio caller ID, and timestamps
- **Player**: Represents a participant (human or bot) with position (0-3), user ID (null for bots), 4-card hand, connection status (connected, disconnected, bot takeover), bot difficulty level, and score
- **Card**: Represents a playing card with rank (2-K, A), suit (hearts, diamonds, clubs, spades), point value, and visibility list (player IDs who can see this card)
- **Game Action**: Represents a logged event in the game with action type (join, deal, draw, swap, discard, power use, Cambio call, score calculation), player ID, payload data, timestamp, and sequence number
- **Game History**: Represents a completed game with winner ID, final scores for all players, total turns taken, duration, and completion timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can complete a full game (2-4 players) from creation to winner declaration in under 10 minutes
- **SC-002**: All players see game state changes (card draws, turn changes, Cambio calls) within 500 milliseconds of the action occurring (real-time synchronization)
- **SC-003**: 95% of players successfully create or join a game on their first attempt without errors
- **SC-004**: AI bots make strategically reasonable moves at least 80% of the time (measured by: taking low-value discard cards when available, swapping high-estimated cards, calling Cambio with estimated low scores)
- **SC-005**: Players who disconnect and reconnect within 60 seconds successfully resume their game without data loss in 99% of cases
- **SC-006**: All interactive elements (cards, buttons, piles) meet minimum touch target size of 44×44 pixels for mobile usability
- **SC-007**: System supports at least 100 concurrent game sessions without performance degradation
- **SC-008**: Game rules are enforced correctly 100% of the time (no invalid actions allowed, scores calculated accurately, turn order maintained)

## Assumptions

- Players have stable internet connections for real-time gameplay (occasional brief disconnects are handled by 60-second reconnection window)
- Players are authenticated users (leverages existing Better Auth system from NuxSaaS base)
- Room codes are case-insensitive when entered by users (internally stored as uppercase)
- Games with all players disconnected for >5 minutes are automatically marked as abandoned
- Players can only be in one active game at a time (cannot join multiple games simultaneously)
- AI bots do not persist across server restarts (they are regenerated from saved game state if needed)
- Mobile devices support modern web browsers with WebSocket capability
- Card shuffling uses Node.js `crypto.randomInt()` for cryptographic security
- The discard pile always shows the top card face-up; all other cards are face-down or face-up based on visibility rules
- If the draw pile is exhausted, the discard pile (except top card) is shuffled and becomes the new draw pile

## Out of Scope

- Tournaments or ranked competitive play (future feature)
- In-game chat or voice communication (future feature)
- Game replays or action history review (action log exists but no UI for replay)
- Customizable game rules (e.g., different scoring, variable card counts)
- Spectator mode for non-players (except bot-takeover spectating)
- Integration with payment systems for entry fees or rewards
- Social features (friend lists, player profiles, leaderboards)
- Analytics dashboard for player statistics
- Multiple simultaneous games per player
- Game pausing or saving mid-session (reconnection handles interruptions)
