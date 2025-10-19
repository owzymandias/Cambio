/**
 * POST /api/game/[id]/swap
 * Swap a drawn card with a card in hand
 */

import type { SwapCardRequest } from '~/shared/types/game'
import { swapCard } from '~/server/services/gameService'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody<SwapCardRequest>(event)

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  if (!body.drawnCardId || !body.targetCardPosition) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Drawn card ID and target position are required',
    })
  }

  // TODO: Get playerId from session/auth
  const playerId = body.playerId as string | undefined

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  }

  const session = await swapCard(
    gameId,
    playerId,
    body.drawnCardId,
    body.targetCardPosition,
  )

  return {
    success: true,
    message: 'Card swapped successfully',
    session,
  }
})
