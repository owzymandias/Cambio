/**
 * POST /api/game/[id]/draw
 * Draw a card from deck or discard pile
 */

import type { DrawCardRequest } from '~/shared/types/game'
import { drawFromDeck, drawFromDiscard } from '~/server/services/gameService'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody<DrawCardRequest>(event)

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  if (!body.source) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Draw source is required (deck or discard)',
    })
  }

  // TODO: Get playerId from session/auth
  // For now, we'll need to pass it from the client
  const playerId = body.playerId as string | undefined

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  }

  // Draw card based on source
  let result
  if (body.source === 'deck') {
    result = await drawFromDeck(gameId, playerId)
  }
  else if (body.source === 'discard') {
    result = await drawFromDiscard(gameId, playerId)
  }
  else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid draw source. Must be "deck" or "discard"',
    })
  }

  return {
    success: true,
    message: `Card drawn from ${body.source}`,
    session: result.session,
    drawnCard: result.drawnCard,
  }
})
