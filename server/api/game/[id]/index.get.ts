/**
 * GET /api/game/[id]
 * Get game session details
 */

import { getGameSession } from '~/server/services/gameService'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  const session = await getGameSession(gameId)

  return session
})
