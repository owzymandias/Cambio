# WebSocket Events Contract

**Version**: 1.0.0
**Purpose**: Real-time event streaming for Cambio multiplayer gameplay

## Connection

### Endpoint
```
ws://localhost:3000/api/game/ws
wss://cambio.example.com/api/game/ws (production)
```

### Authentication
Include JWT token as query parameter or header:
```typescript
const ws = new WebSocket('ws://localhost:3000/api/game/ws?token=<JWT>')
// OR via headers (if client supports)
const ws = new WebSocket('ws://localhost:3000/api/game/ws', {
  headers: { Authorization: 'Bearer <JWT>' }
})
```

### Connection Lifecycle

```typescript
// Client connects
ws.onopen = () => {
  // Send join message
  ws.send(JSON.stringify({
    type: 'join_game',
    game_id: '<game-uuid>',
    player_id: '<player-uuid>'
  }))
}

// Server acknowledges
// → Receives 'game_joined' event (see below)

// Client disconnects gracefully
ws.send(JSON.stringify({ type: 'leave_game' }))
ws.close()
```

---

## Client → Server Messages

Messages sent from client to server.

### 1. `join_game`
Join a game room for real-time updates.

**Payload**:
```json
{
  "type": "join_game",
  "game_id": "uuid-of-game-session",
  "player_id": "uuid-of-player-in-game"
}
```

**Server Response**: Broadcasts `game_joined` to all players in room.

---

### 2. `leave_game`
Leave the game room (graceful disconnect).

**Payload**:
```json
{
  "type": "leave_game",
  "game_id": "uuid",
  "player_id": "uuid"
}
```

**Server Response**: Broadcasts `player_disconnected` to remaining players.

---

### 3. `heartbeat` (optional)
Keep-alive ping to detect stale connections.

**Payload**:
```json
{
  "type": "heartbeat",
  "timestamp": 1234567890
}
```

**Server Response**: Echo back with `heartbeat_ack`.

---

## Server → Client Events

Events broadcast from server to connected clients in a game room.

### 1. `game_joined`
A player has joined the game.

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "game_joined",
  "game_id": "uuid",
  "player": {
    "id": "uuid",
    "user_id": "uuid",
    "position": 0,
    "is_bot": false,
    "connection_status": "connected"
  },
  "total_players": 3,
  "timestamp": "2025-10-19T12:34:56Z"
}
```

---

### 2. `game_started`
Game has begun (enough players joined, cards dealt).

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "game_started",
  "game_id": "uuid",
  "current_turn": 0,
  "phase": "initial_view",
  "timestamp": "2025-10-19T12:35:00Z"
}
```

---

### 3. `cards_dealt`
Initial cards have been dealt (each player receives this privately).

**Broadcast To**: Individual player (private event)

**Payload**:
```json
{
  "type": "cards_dealt",
  "game_id": "uuid",
  "player_id": "uuid",
  "cards": [
    { "rank": "7", "suit": "hearts", "value": 7, "visible_to": ["player-uuid"] },
    { "rank": "K", "suit": "spades", "value": 0, "visible_to": ["player-uuid"] },
    { "rank": "3", "suit": "diamonds", "value": 3, "visible_to": ["player-uuid"] },
    { "rank": "9", "suit": "clubs", "value": 9, "visible_to": ["player-uuid"] }
  ],
  "timestamp": "2025-10-19T12:35:01Z"
}
```

**Note**: Only bottom two cards (indices 2, 3) are initially visible during `initial_view` phase.

---

### 4. `turn_changed`
Turn has moved to the next player.

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "turn_changed",
  "game_id": "uuid",
  "current_turn": 1,
  "current_player_id": "uuid",
  "phase": "playing",
  "timestamp": "2025-10-19T12:36:00Z"
}
```

---

### 5. `card_drawn`
A player drew a card (visible to all, but card rank/suit may be hidden).

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "card_drawn",
  "game_id": "uuid",
  "player_id": "uuid",
  "source": "deck" | "discard",
  "card": {
    "rank": "10",
    "suit": "hearts",
    "value": 10,
    "visible_to": ["player-uuid"] // Only visible to drawer if from deck
  },
  "timestamp": "2025-10-19T12:36:15Z"
}
```

**Visibility Rules**:
- If `source: "deck"` → only drawer sees rank/suit
- If `source: "discard"` → all players see rank/suit (was already visible)

---

### 6. `card_swapped`
A player swapped a drawn card with one of their hand cards.

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "card_swapped",
  "game_id": "uuid",
  "player_id": "uuid",
  "position": 2,
  "card_swapped_out": {
    "rank": "Q",
    "suit": "diamonds",
    "value": 10,
    "visible_to": [] // Now in discard pile, visible to all
  },
  "timestamp": "2025-10-19T12:36:20Z"
}
```

**Note**: `card_swapped_out` is the card that went to the discard pile (now visible to everyone).

---

### 7. `card_discarded`
A player discarded the drawn card without swapping.

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "card_discarded",
  "game_id": "uuid",
  "player_id": "uuid",
  "card": {
    "rank": "2",
    "suit": "clubs",
    "value": 2,
    "visible_to": [] // Visible to all (in discard pile)
  },
  "timestamp": "2025-10-19T12:36:25Z"
}
```

---

### 8. `power_activated`
A special card power has been activated.

**Broadcast To**: All players in the game room (but `revealed_card` only visible to actor for peek powers)

**Payload**:
```json
{
  "type": "power_activated",
  "game_id": "uuid",
  "player_id": "uuid",
  "power_type": "peek_opponent" | "peek_own" | "blind_swap" | "look_own",
  "target_player_id": "uuid" | null,
  "target_position": 1 | null,
  "revealed_card": {
    "rank": "A",
    "suit": "spades",
    "value": 1,
    "visible_to": ["acting-player-uuid"] // Private to actor
  } | null,
  "timestamp": "2025-10-19T12:36:30Z"
}
```

**Power-Specific Fields**:
- `peek_own` / `look_own`: Only `target_position` and `revealed_card` (visible to actor only)
- `peek_opponent`: `target_player_id`, `target_position`, `revealed_card` (visible to actor only)
- `blind_swap`: `target_player_id`, `target_position`, no `revealed_card` (cards not revealed)

---

### 9. `cambio_called`
A player has called Cambio, triggering the final round.

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "cambio_called",
  "game_id": "uuid",
  "caller_id": "uuid",
  "phase": "final_round",
  "remaining_turns": 2,
  "timestamp": "2025-10-19T12:37:00Z"
}
```

---

### 10. `game_ended`
Game has finished, all cards revealed, scores calculated.

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "game_ended",
  "game_id": "uuid",
  "winner_id": "uuid",
  "final_scores": {
    "player1-uuid": 12,
    "player2-uuid": 8,
    "player3-uuid": 15
  },
  "all_cards": {
    "player1-uuid": [
      { "rank": "7", "suit": "hearts", "value": 7 },
      { "rank": "K", "suit": "spades", "value": 0 },
      { "rank": "3", "suit": "diamonds", "value": 3 },
      { "rank": "2", "suit": "clubs", "value": 2 }
    ],
    // ... other players' cards
  },
  "cambio_caller_id": "uuid",
  "cambio_success": true,
  "timestamp": "2025-10-19T12:38:00Z"
}
```

---

### 11. `player_disconnected`
A player has disconnected from the game.

**Broadcast To**: All remaining players in the game room

**Payload**:
```json
{
  "type": "player_disconnected",
  "game_id": "uuid",
  "player_id": "uuid",
  "connection_status": "disconnected",
  "timestamp": "2025-10-19T12:37:30Z"
}
```

---

### 12. `player_reconnected`
A previously disconnected player has reconnected.

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "player_reconnected",
  "game_id": "uuid",
  "player_id": "uuid",
  "connection_status": "connected",
  "timestamp": "2025-10-19T12:38:15Z"
}
```

---

### 13. `bot_takeover`
A disconnected player has been replaced by a bot.

**Broadcast To**: All players in the game room

**Payload**:
```json
{
  "type": "bot_takeover",
  "game_id": "uuid",
  "player_id": "uuid",
  "connection_status": "bot_takeover",
  "bot_difficulty": "medium",
  "timestamp": "2025-10-19T12:39:00Z"
}
```

---

### 14. `error`
Server encountered an error processing a client message.

**Broadcast To**: Individual client that caused the error

**Payload**:
```json
{
  "type": "error",
  "error_code": "INVALID_ACTION",
  "message": "It is not your turn",
  "details": {
    "current_turn": 2,
    "your_position": 0
  },
  "timestamp": "2025-10-19T12:37:45Z"
}
```

**Common Error Codes**:
- `INVALID_ACTION`: Action not allowed in current game state
- `NOT_YOUR_TURN`: Attempted action when it's another player's turn
- `GAME_NOT_FOUND`: Game ID doesn't exist or has ended
- `PLAYER_NOT_IN_GAME`: Player is not a participant in this game
- `VALIDATION_ERROR`: Payload failed schema validation

---

### 15. `heartbeat_ack`
Acknowledgment of client heartbeat.

**Broadcast To**: Individual client that sent heartbeat

**Payload**:
```json
{
  "type": "heartbeat_ack",
  "timestamp": 1234567890
}
```

---

## Event Flow Example

### Full Game Sequence

```typescript
// Player 1 connects and joins
→ C1: { type: "join_game", game_id: "...", player_id: "p1" }
← S→All: { type: "game_joined", player: {...}, total_players: 1 }

// Player 2 joins (game can start)
→ C2: { type: "join_game", game_id: "...", player_id: "p2" }
← S→All: { type: "game_joined", player: {...}, total_players: 2 }
← S→All: { type: "game_started", current_turn: 0, phase: "initial_view" }
← S→P1: { type: "cards_dealt", cards: [...] }
← S→P2: { type: "cards_dealt", cards: [...] }

// Player 1's turn
← S→All: { type: "turn_changed", current_turn: 0, current_player_id: "p1" }
→ C1 (via HTTP): POST /api/game/{id}/action { action_type: "draw_from_deck" }
← S→All: { type: "card_drawn", player_id: "p1", source: "deck", card: {...} }
→ C1 (via HTTP): POST /api/game/{id}/action { action_type: "swap_card", position: 2 }
← S→All: { type: "card_swapped", player_id: "p1", position: 2, card_swapped_out: {...} }
← S→All: { type: "power_activated", power_type: "peek_own", revealed_card: {...} }
← S→All: { type: "turn_changed", current_turn: 1, current_player_id: "p2" }

// Player 2's turn
// ... (similar flow)

// Player 1 calls Cambio
→ C1 (via HTTP): POST /api/game/{id}/cambio
← S→All: { type: "cambio_called", caller_id: "p1", remaining_turns: 1 }

// Final turn for Player 2
← S→All: { type: "turn_changed", current_turn: 1, phase: "final_round" }
// ... (player 2 takes final turn)

// Game ends
← S→All: { type: "game_ended", winner_id: "p1", final_scores: {...}, all_cards: {...} }
```

---

## Implementation Notes

### Nuxt/Nitro WebSocket Handler

```typescript
// server/api/game/ws.ts
import { defineWebSocketHandler } from 'h3'

export default defineWebSocketHandler({
  open(peer) {
    console.log('WebSocket opened:', peer.id)
  },

  message(peer, message) {
    const data = JSON.parse(message.text())

    if (data.type === 'join_game') {
      // Add peer to game room
      peer.subscribe(`game:${data.game_id}`)

      // Broadcast to room
      peer.publish(`game:${data.game_id}`, JSON.stringify({
        type: 'game_joined',
        player: { /* ... */ },
        timestamp: new Date().toISOString()
      }))
    }

    // Handle other message types...
  },

  close(peer, details) {
    // Handle disconnect, start 60-second reconnection timer
    console.log('WebSocket closed:', peer.id, details.reason)
  },

  error(peer, error) {
    console.error('WebSocket error:', error)
  }
})
```

### Client Connection Management

```typescript
// app/composables/useWebSocket.ts
export function useWebSocket(gameId: string) {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)

  const connect = () => {
    const token = getAuthToken() // From Better Auth
    ws.value = new WebSocket(`ws://localhost:3000/api/game/ws?token=${token}`)

    ws.value.onopen = () => {
      connected.value = true
      ws.value?.send(JSON.stringify({
        type: 'join_game',
        game_id: gameId,
        player_id: getCurrentPlayerId()
      }))
    }

    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleGameEvent(data) // Update local state
    }

    ws.value.onclose = () => {
      connected.value = false
      // Attempt reconnection
      setTimeout(() => connect(), 3000)
    }
  }

  return { connect, disconnect: () => ws.value?.close(), connected }
}
```

---

## Security Considerations

1. **Authentication**: All WebSocket connections MUST validate JWT tokens
2. **Authorization**: Players can only receive events for games they're in
3. **Rate Limiting**: Limit message frequency per connection (e.g., 10 messages/second)
4. **Validation**: All client messages must pass Zod schema validation before processing
5. **Isolation**: Events are room-scoped (game-specific), no cross-game leakage

---

## Performance Targets

- **Connection Latency**: <100ms to establish WebSocket
- **Event Broadcast**: <500ms from action to all clients receiving update (SC-003)
- **Concurrent Rooms**: Support 100+ active games with WebSocket broadcasts
- **Reconnection**: <2 seconds to rejoin and receive full state snapshot

This contract ensures real-time, synchronized multiplayer gameplay with proper event ordering and visibility controls.
