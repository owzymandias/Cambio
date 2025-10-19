/**
 * POST /api/game/[id]/discard
 * Discard a drawn card without swapping
 */

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody<{ cardId: string }>(event)

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  // TODO: Implement discard card logic in Phase 4 (User Story 2)
  throw createError({
    statusCode: 501,
    statusMessage: 'Discard card functionality not yet implemented',
  })
})
