/**
 * POST /api/game/[id]/power
 * Use a special power
 */

import { PowerActivationRequestSchema } from '~/shared/types/game'
import { activateSpecialPower } from '~/server/utils/gameService'
import { ZodError } from 'zod'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  const body = await readBody(event)

  // Handle skip request
  if (body.skip === true) {
    // TODO: Implement skip logic - mark turn as completed, advance to next player
    return {
      success: true,
      message: 'Power skipped',
    }
  }

  try {
    // Validate request with Zod
    const validated = PowerActivationRequestSchema.parse(body)

    // Get player ID from session/auth
    // TODO: Replace with proper auth when implemented
    const playerId = body.playerId || event.context.user?.playerId

    if (!playerId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Player ID required',
      })
    }

    // Call service function
    const result = await activateSpecialPower(gameId, playerId, validated)

    return result
  }
  catch (error) {
    if (error instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid power activation request',
        data: error.errors,
      })
    }

    if (error instanceof Error) {
      // Map error messages to appropriate HTTP status codes
      if (error.message.includes('not found')) {
        throw createError({
          statusCode: 404,
          statusMessage: error.message,
        })
      }

      if (error.message.includes('Not your turn') || error.message.includes('Cannot activate power')) {
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
