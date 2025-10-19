/**
 * POST /api/game/[id]/discard
 * Discard a drawn card without swapping
 */

import { discardDrawnCard } from '~/server/services/gameService'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody<{ cardId: string, playerId?: string }>(event)

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  if (!body.cardId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Card ID is required',
    })
  }

  // TODO: Get playerId from session/auth
  const playerId = body.playerId

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  }

  const session = await discardDrawnCard(gameId, playerId, body.cardId)

  return {
    success: true,
    message: 'Card discarded successfully',
    session,
  }
})
