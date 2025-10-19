/**
 * Game WebSocket/real-time connection utilities
 * Manages real-time game state updates using Server-Sent Events (SSE)
 *
 * Note: Using SSE instead of WebSocket for better compatibility with Nuxt/Nitro
 * and simpler deployment to serverless environments like Cloudflare Workers
 */

import type { GameEvent } from '~/shared/types/game'
import { WEBSOCKET_EVENTS } from '~/shared/constants/game'

// Store active connections per game
const gameConnections = new Map<string, Set<{ send: (data: any) => void, close: () => void }>>()

/**
 * Add a client connection to a game room
 */
export function joinGameRoom(gameId: string, connection: { send: (data: any) => void, close: () => void }) {
  if (!gameConnections.has(gameId)) {
    gameConnections.set(gameId, new Set())
  }

  gameConnections.get(gameId)!.add(connection)

  console.log(`Client joined game room: ${gameId}. Total connections: ${gameConnections.get(gameId)!.size}`)

  return () => {
    leaveGameRoom(gameId, connection)
  }
}

/**
 * Remove a client connection from a game room
 */
export function leaveGameRoom(gameId: string, connection: { send: (data: any) => void, close: () => void }) {
  const connections = gameConnections.get(gameId)
  if (connections) {
    connections.delete(connection)

    if (connections.size === 0) {
      gameConnections.delete(gameId)
    }

    console.log(`Client left game room: ${gameId}. Remaining connections: ${connections.size}`)
  }
}

/**
 * Broadcast a game event to all clients in a game room
 */
export function broadcastToGame(gameId: string, event: GameEvent) {
  const connections = gameConnections.get(gameId)

  if (!connections || connections.size === 0) {
    console.log(`No active connections for game ${gameId}`)
    return
  }

  const payload = {
    type: WEBSOCKET_EVENTS.GAME_STATE_UPDATE,
    data: event,
  }

  console.log(`Broadcasting to game ${gameId}:`, payload.type)

  // Send to all connected clients
  for (const connection of connections) {
    try {
      connection.send(payload)
    }
    catch (err) {
      console.error('Error sending to client:', err)
      // Remove failed connection
      connections.delete(connection)
    }
  }
}

/**
 * Broadcast game state update to all clients
 */
export function broadcastGameStateUpdate(gameId: string, gameState: any) {
  const connections = gameConnections.get(gameId)

  if (!connections || connections.size === 0) {
    return
  }

  const payload = {
    type: WEBSOCKET_EVENTS.GAME_STATE_UPDATE,
    data: gameState,
  }

  for (const connection of connections) {
    try {
      connection.send(payload)
    }
    catch (err) {
      console.error('Error sending game state:', err)
      connections.delete(connection)
    }
  }
}

/**
 * Broadcast an error to a specific game room
 */
export function broadcastGameError(gameId: string, errorMessage: string) {
  const connections = gameConnections.get(gameId)

  if (!connections || connections.size === 0) {
    return
  }

  const payload = {
    type: WEBSOCKET_EVENTS.ERROR,
    data: { message: errorMessage },
  }

  for (const connection of connections) {
    try {
      connection.send(payload)
    }
    catch (err) {
      console.error('Error sending error message:', err)
      connections.delete(connection)
    }
  }
}

/**
 * Get the number of active connections for a game
 */
export function getGameConnectionCount(gameId: string): number {
  return gameConnections.get(gameId)?.size || 0
}

/**
 * Clean up all connections for a game
 */
export function closeGameRoom(gameId: string) {
  const connections = gameConnections.get(gameId)

  if (connections) {
    for (const connection of connections) {
      try {
        connection.close()
      }
      catch (err) {
        console.error('Error closing connection:', err)
      }
    }

    gameConnections.delete(gameId)
    console.log(`Closed game room: ${gameId}`)
  }
}

/**
 * Emit specific game events
 */
export const gameEvents = {
  playerJoined: (gameId: string, playerId: string, displayName: string) => {
    const event: GameEvent = {
      type: 'player_joined',
      gameId,
      playerId,
      data: { displayName },
      timestamp: new Date(),
    }
    broadcastToGame(gameId, event)
  },

  turnStarted: (gameId: string, playerId: string) => {
    const event: GameEvent = {
      type: 'turn_started',
      gameId,
      playerId,
      timestamp: new Date(),
    }
    broadcastToGame(gameId, event)
  },

  cardDrawn: (gameId: string, playerId: string, source: string) => {
    const event: GameEvent = {
      type: 'card_drawn',
      gameId,
      playerId,
      data: { source },
      timestamp: new Date(),
    }
    broadcastToGame(gameId, event)
  },

  cardSwapped: (gameId: string, playerId: string) => {
    const event: GameEvent = {
      type: 'card_swapped',
      gameId,
      playerId,
      timestamp: new Date(),
    }
    broadcastToGame(gameId, event)
  },

  cardDiscarded: (gameId: string, playerId: string) => {
    const event: GameEvent = {
      type: 'card_discarded',
      gameId,
      playerId,
      timestamp: new Date(),
    }
    broadcastToGame(gameId, event)
  },

  powerActivated: (gameId: string, playerId: string, powerType: string) => {
    const event: GameEvent = {
      type: 'power_activated',
      gameId,
      playerId,
      data: { powerType },
      timestamp: new Date(),
    }
    broadcastToGame(gameId, event)
  },

  cambioCalled: (gameId: string, playerId: string) => {
    const event: GameEvent = {
      type: 'cambio_called',
      gameId,
      playerId,
      timestamp: new Date(),
    }
    broadcastToGame(gameId, event)
  },

  gameCompleted: (gameId: string, winnerId: string) => {
    const event: GameEvent = {
      type: 'game_completed',
      gameId,
      data: { winnerId },
      timestamp: new Date(),
    }
    broadcastToGame(gameId, event)
  },
}
