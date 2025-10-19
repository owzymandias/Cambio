/**
 * POST /api/game/create
 * Create a new game session
 */

import type { CreateGameRequest } from '~/shared/types/game'
import { createGame } from '~/server/services/gameService'

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateGameRequest>(event)

  // Validate request
  if (!body.playerCount || !body.creatorDisplayName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: playerCount, creatorDisplayName',
    })
  }

  // Create game
  const result = await createGame(body)

  return {
    success: true,
    message: 'Game created successfully',
    gameId: result.session.id,
    session: result.session,
    player: result.creator,
  }
})
