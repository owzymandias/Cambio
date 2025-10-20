/**
 * POST /api/game/[id]/cambio
 * Call Cambio to end the round
 */

import { callCambio } from '~/server/utils/gameService'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  const body = await readBody(event)

  // Get player ID from session/auth
  // TODO: Replace with proper auth when implemented
  const playerId = body.playerId || event.context.user?.playerId

  if (!playerId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Player ID required',
    })
  }

  try {
    const result = await callCambio(gameId, playerId)
    return result
  }
  catch (error) {
    if (error instanceof Error) {
      // Map error messages to appropriate HTTP status codes
      if (error.message.includes('not found')) {
        throw createError({
          statusCode: 404,
          statusMessage: error.message,
        })
      }

      if (error.message.includes('Not your turn') || error.message.includes('already called') || error.message.includes('Cannot call Cambio')) {
        throw createError({
          statusCode: 409,
          statusMessage: error.message,
        })
      }

      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }

    throw error
  }
})
