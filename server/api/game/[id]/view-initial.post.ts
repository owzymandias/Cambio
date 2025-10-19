/**
 * POST /api/game/[id]/view-initial
 * Mark that a player has viewed their initial cards
 */

import { eq } from 'drizzle-orm'
import { player } from '~/server/database/schema/game'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')
  const body = await readBody<{ playerId?: string }>(event)

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  // Get playerId from body or session
  const playerId = body.playerId

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  }

  const db = useDb()

  // Update player's hasViewedInitialCards status
  await db
    .update(player)
    .set({
      hasViewedInitialCards: true,
    })
    .where(eq(player.id, playerId))

  return {
    success: true,
    message: 'Initial cards viewed status updated',
  }
})
