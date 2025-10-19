/**
 * GET /api/game/[id]/events
 * Server-Sent Events endpoint for real-time game updates
 */

import { joinGameRoom } from '~/server/utils/gameSocket'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  // Set up SSE headers
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const stream = createEventStream(event)

  // Create connection object for game room
  const connection = {
    send: (data: any) => {
      stream.push(JSON.stringify(data))
    },
    close: () => {
      stream.close()
    },
  }

  // Join the game room
  const cleanup = joinGameRoom(gameId, connection)

  // Send initial connection event
  stream.push(JSON.stringify({
    type: 'connected',
    gameId,
    timestamp: new Date().toISOString(),
  }))

  // Handle client disconnect
  stream.onClosed(() => {
    cleanup()
  })

  return stream.send()
})
