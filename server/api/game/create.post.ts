/**
 * POST /api/game/create
 * Create a new game session
 */

import type { CreateGameRequest } from '~/shared/types/game'
import { createGame } from '~/server/services/gameService'
import { validateCreateGameRequest } from '~/shared/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateGameRequest>(event)

  // Validate request
  if (!body.playerCount || !body.creatorDisplayName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: playerCount, creatorDisplayName',
    })
  }

  // Validate game creation parameters
  const validation = validateCreateGameRequest(
    body.playerCount,
    body.creatorDisplayName,
    body.botCount || 0,
  )

  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.errors.join(', '),
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
