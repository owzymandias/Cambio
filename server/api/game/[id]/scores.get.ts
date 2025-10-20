/**
 * GET /api/game/[id]/scores
 * Get final scores for a completed game
 */

import { db } from '~/server/utils/db'
import { gameSession, gameScore, player } from '~/server/database/schema/game'
import { eq } from 'drizzle-orm'
import type { ScoresResponse } from '~/shared/types/game'

export default defineEventHandler(async (event) => {
  const gameId = getRouterParam(event, 'id')

  if (!gameId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game ID is required',
    })
  }

  try {
    // Verify game exists and get game info
    const [game] = await db
      .select()
      .from(gameSession)
      .where(eq(gameSession.id, gameId))

    if (!game) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Game not found',
      })
    }

    // Verify game is completed
    if (game.phase !== 'completed') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Game not completed yet',
        data: { currentPhase: game.phase },
      })
    }

    // Query scores with player details (LEFT JOIN)
    const scoresWithPlayers = await db
      .select({
        score: gameScore,
        playerInfo: player,
      })
      .from(gameScore)
      .leftJoin(player, eq(gameScore.playerId, player.id))
      .where(eq(gameScore.gameSessionId, gameId))

    // Format scores for response
    const scores = scoresWithPlayers.map((row) => {
      const baseScore = row.score.penaltyApplied
        ? row.score.finalScore / 2
        : row.score.finalScore

      return {
        playerId: row.score.playerId,
        displayName: row.playerInfo?.displayName || 'Unknown',
        baseScore,
        finalScore: row.score.finalScore,
        isCambioCaller: row.score.isCambioCaller,
        penaltyApplied: row.score.penaltyApplied,
        isWinner: row.score.isWinner,
        cards: row.score.cardsSummary as Array<{
          rank: string
          suit: string
          pointValue: number
        }>,
      }
    })

    // Extract winners
    const winners = scores
      .filter(s => s.isWinner)
      .map(s => ({
        playerId: s.playerId,
        displayName: s.displayName,
        finalScore: s.finalScore,
      }))

    const response: ScoresResponse = {
      gameId,
      phase: game.phase,
      completedAt: game.completedAt,
      cambioCallerId: game.cambioCallerId,
      scores,
      winners,
    }

    return response
  }
  catch (error) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    if (error instanceof Error) {
      throw createError({
        statusCode: 500,
        statusMessage: error.message,
      })
    }

    throw error
  }
})
