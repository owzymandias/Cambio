/**
 * POST /api/game/[id]/join
 * Join an existing game
 */

import type { JoinGameRequest } from '~/shared/types/game'
import { joinGame } from '~/server/services/gameService'

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

  const result = await joinGame(gameId, body)

  return {
    success: true,
    message: 'Joined game successfully',
    session: result.session,
    player: result.player,
  }
})
