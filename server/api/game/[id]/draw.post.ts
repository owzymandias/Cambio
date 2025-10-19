/**
 * POST /api/game/[id]/draw
 * Draw a card from deck or discard pile
 */

import type { DrawCardRequest } from '~/shared/types/game'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody<DrawCardRequest>(event)

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  // TODO: Implement draw card logic in Phase 4 (User Story 2)
  throw createError({
    statusCode: 501,
    statusMessage: 'Draw card functionality not yet implemented',
  })
})
