/**
 * POST /api/game/[id]/cambio
 * Call Cambio to end the round
 */

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  // TODO: Implement Cambio call logic in Phase 6 (User Story 4)
  throw createError({
    statusCode: 501,
    statusMessage: 'Cambio call functionality not yet implemented',
  })
})
