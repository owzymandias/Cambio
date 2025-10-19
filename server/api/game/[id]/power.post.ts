/**
 * POST /api/game/[id]/power
 * Use a special power
 */

import type { UsePowerRequest } from '~/shared/types/game'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody<UsePowerRequest>(event)

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  // TODO: Implement special power logic in Phase 5 (User Story 3)
  throw createError({
    statusCode: 501,
    statusMessage: 'Special power functionality not yet implemented',
  })
})
