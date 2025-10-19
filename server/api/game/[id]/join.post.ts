/**
 * POST /api/game/[id]/join
 * Join an existing game
 */

import type { JoinGameRequest } from '~/shared/types/game'
import { joinGame } from '~/server/services/gameService'
import { validateJoinGameRequest } from '~/shared/utils/validation'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody<JoinGameRequest>(event)

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  if (!body.displayName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Display name is required',
    })
  }

  // Validate join request
  const validation = validateJoinGameRequest(gameId, body.displayName)

  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.errors.join(', '),
    })
  }

  const result = await joinGame(gameId, body)

  return {
    success: true,
    message: 'Joined game successfully',
    session: result.session,
    player: result.player,
  }
})
