/**
 * Game service layer - Business logic for game actions
 */

import type {
  PowerActivationRequest,
  PowerActivationResult,
  CambioCallResult,
  PlayerScore,
  WinnerInfo,
} from '~/shared/types/game'
import { db } from './db'
import { gameSession, player, card, specialPower, gameScore, turn } from '~/server/database/schema/game'
import { eq, and, ne } from 'drizzle-orm'
import { broadcastToGame, broadcastToPlayer } from './gameSocket'
import {
  validatePowerTarget,
  selectRandomCard,
  applyPeekPower,
  applyBlindSwap,
} from './powerHelpers'

/**
 * Activate a special power (peek, swap, etc.)
 */
export async function activateSpecialPower(
  gameId: string,
  playerId: string,
  powerRequest: PowerActivationRequest,
): Promise<PowerActivationResult> {
  return await db.transaction(async (tx) => {
    // Lock game session to prevent race conditions
    const [game] = await tx
      .select()
      .from(gameSession)
      .where(eq(gameSession.id, gameId))
      .for('update')

    if (!game) {
      throw new Error('Game not found')
    }

    // Validate phase (must be 'playing' or 'final_round')
    if (game.phase !== 'playing' && game.phase !== 'final_round') {
      throw new Error(`Cannot activate power in ${game.phase} phase`)
    }

    // Validate it's the player's turn
    if (game.currentTurnPlayerId !== playerId) {
      throw new Error('Not your turn')
    }

    // Fetch player's cards for validation
    const playerCards = await tx
      .select()
      .from(card)
      .where(and(
        eq(card.gameSessionId, gameId),
        eq(card.ownerId, playerId),
        eq(card.location, 'hand'),
      ))

    // Validate power target
    const validation = validatePowerTarget(
      powerRequest.powerType,
      'cardIndex' in powerRequest ? powerRequest.cardIndex : undefined,
      'targetPlayerId' in powerRequest ? powerRequest.targetPlayerId : undefined,
      playerId,
    )

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid power target')
    }

    let revealedCard: { rank: string, suit: string, pointValue: number } | undefined

    // Route to appropriate power handler
    if (powerRequest.powerType === 'peek_own') {
      const targetCard = playerCards[powerRequest.cardIndex]
      if (!targetCard) {
        throw new Error('Card not found at specified index')
      }

      await applyPeekPower(targetCard.id, playerId, gameId)

      revealedCard = {
        rank: targetCard.rank,
        suit: targetCard.suit,
        pointValue: targetCard.pointValue,
      }

      // Record power activation
      await tx.insert(specialPower).values({
        gameSessionId: gameId,
        turnId: game.id, // TODO: Get actual turn ID
        activatedById: playerId,
        powerType: 'peek_own',
        targetCardId: targetCard.id,
      })
    }
    else if (powerRequest.powerType === 'peek_opponent') {
      // Fetch opponent's cards
      const opponentCards = await tx
        .select()
        .from(card)
        .where(and(
          eq(card.gameSessionId, gameId),
          eq(card.ownerId, powerRequest.targetPlayerId),
          eq(card.location, 'hand'),
        ))

      const targetCard = opponentCards[powerRequest.cardIndex]
      if (!targetCard) {
        throw new Error('Opponent card not found at specified index')
      }

      await applyPeekPower(targetCard.id, playerId, gameId)

      revealedCard = {
        rank: targetCard.rank,
        suit: targetCard.suit,
        pointValue: targetCard.pointValue,
      }

      // Record power activation
      await tx.insert(specialPower).values({
        gameSessionId: gameId,
        turnId: game.id, // TODO: Get actual turn ID
        activatedById: playerId,
        powerType: 'peek_opponent',
        targetCardId: targetCard.id,
        targetPlayerId: powerRequest.targetPlayerId,
      })
    }
    else if (powerRequest.powerType === 'blind_swap') {
      const myCard = playerCards[powerRequest.myCardIndex]
      if (!myCard) {
        throw new Error('Your card not found at specified index')
      }

      // Fetch opponent's cards
      const opponentCards = await tx
        .select()
        .from(card)
        .where(and(
          eq(card.gameSessionId, gameId),
          eq(card.ownerId, powerRequest.targetPlayerId),
          eq(card.location, 'hand'),
        ))

      const targetCard = opponentCards[powerRequest.targetCardIndex]
      if (!targetCard) {
        throw new Error('Opponent card not found at specified index')
      }

      await applyBlindSwap(myCard.id, targetCard.id, playerId, powerRequest.targetPlayerId)

      // Broadcast public swap event
      broadcastToGame(gameId, {
        type: 'power_activated',
        gameId,
        playerId,
        data: {
          powerType: 'blind_swap',
          fromPlayer: playerId,
          toPlayer: powerRequest.targetPlayerId,
        },
        timestamp: new Date(),
      })

      // Record power activation
      await tx.insert(specialPower).values({
        gameSessionId: gameId,
        turnId: game.id, // TODO: Get actual turn ID
        activatedById: playerId,
        powerType: 'blind_swap',
        targetCardId: targetCard.id,
        targetPlayerId: powerRequest.targetPlayerId,
      })
    }
    else if (powerRequest.powerType === 'look_own') {
      // Auto-select random card for King power
      const randomCard = selectRandomCard(playerCards)
      if (!randomCard) {
        throw new Error('No cards available for King power')
      }

      await applyPeekPower(randomCard.id, playerId, gameId)

      revealedCard = {
        rank: randomCard.rank,
        suit: randomCard.suit,
        pointValue: randomCard.pointValue,
      }

      // Record power activation
      await tx.insert(specialPower).values({
        gameSessionId: gameId,
        turnId: game.id, // TODO: Get actual turn ID
        activatedById: playerId,
        powerType: 'look_own',
        targetCardId: randomCard.id,
      })
    }

    return {
      success: true,
      message: 'Power activated successfully',
      revealedCard,
    }
  })
}

/**
 * Call Cambio to trigger final round
 */
export async function callCambio(
  gameId: string,
  playerId: string,
): Promise<CambioCallResult> {
  return await db.transaction(async (tx) => {
    // Lock game session to prevent race conditions
    const [game] = await tx
      .select()
      .from(gameSession)
      .where(eq(gameSession.id, gameId))
      .for('update')

    if (!game) {
      throw new Error('Game not found')
    }

    // Validate phase (must be 'playing')
    if (game.phase !== 'playing') {
      throw new Error(`Cannot call Cambio in ${game.phase} phase`)
    }

    // Validate Cambio not already called
    if (game.cambioCallerId) {
      throw new Error('Cambio already called')
    }

    // Validate it's the player's turn
    if (game.currentTurnPlayerId !== playerId) {
      throw new Error('Not your turn to call Cambio')
    }

    // Update game session: phase = 'final_round', cambioCallerId = playerId
    await tx
      .update(gameSession)
      .set({
        phase: 'final_round',
        cambioCallerId: playerId,
      })
      .where(eq(gameSession.id, gameId))

    // Mark caller as having taken their final turn (they forfeit)
    await tx
      .update(player)
      .set({
        hasTakenFinalTurn: true,
      })
      .where(eq(player.id, playerId))

    // Fetch player name for broadcast
    const [cambioPlayer] = await tx
      .select()
      .from(player)
      .where(eq(player.id, playerId))

    // Broadcast CAMBIO_CALLED event (public to all players)
    broadcastToGame(gameId, {
      type: 'cambio_called',
      gameId,
      playerId,
      data: {
        callerName: cambioPlayer?.displayName || 'Unknown',
      },
      timestamp: new Date(),
    })

    // TODO: Advance to next player in turn order

    return {
      success: true,
      message: 'Cambio called successfully',
      finalRoundStarted: true,
    }
  })
}

/**
 * Process final round - check if all non-caller players have taken their final turn
 */
export async function processFinalRound(gameId: string): Promise<boolean> {
  const [game] = await db
    .select()
    .from(gameSession)
    .where(eq(gameSession.id, gameId))

  if (!game || !game.cambioCallerId) {
    return false
  }

  // Check if all non-caller players have taken their final turn
  const remainingPlayers = await db
    .select()
    .from(player)
    .where(
      and(
        eq(player.gameSessionId, gameId),
        eq(player.hasTakenFinalTurn, false),
        ne(player.id, game.cambioCallerId),
      ),
    )

  // If no remaining players, all final turns are complete
  return remainingPlayers.length === 0
}

/**
 * Calculate final scores for all players (with penalty logic)
 */
export async function calculateScores(
  gameId: string,
): Promise<Map<string, { baseScore: number, finalScore: number, penaltyApplied: boolean }>> {
  // Query all players and their hand cards
  const players = await db
    .select()
    .from(player)
    .where(eq(player.gameSessionId, gameId))

  const cards = await db
    .select()
    .from(card)
    .where(
      and(
        eq(card.gameSessionId, gameId),
        eq(card.location, 'hand'),
      ),
    )

  // Calculate base scores (sum of card point values)
  const baseScores = new Map<string, number>()
  for (const p of players) {
    const playerCards = cards.filter(c => c.ownerId === p.id)
    const baseScore = playerCards.reduce((sum, c) => sum + c.pointValue, 0)
    baseScores.set(p.id, baseScore)
  }

  // Find lowest base score
  const lowestBaseScore = Math.min(...Array.from(baseScores.values()))

  // Get Cambio caller ID
  const [game] = await db
    .select()
    .from(gameSession)
    .where(eq(gameSession.id, gameId))

  // Apply penalty doubling if Cambio caller didn't have lowest score
  const scores = new Map<string, { baseScore: number, finalScore: number, penaltyApplied: boolean }>()
  for (const [playerId, baseScore] of baseScores.entries()) {
    const isCambioCaller = game?.cambioCallerId === playerId
    const penaltyApplied = isCambioCaller && baseScore !== lowestBaseScore

    scores.set(playerId, {
      baseScore,
      finalScore: penaltyApplied ? baseScore * 2 : baseScore,
      penaltyApplied,
    })
  }

  return scores
}

/**
 * Determine winner(s) - player(s) with lowest final score
 */
export async function determineWinner(
  scores: Map<string, { baseScore: number, finalScore: number, penaltyApplied: boolean }>,
): Promise<string[]> {
  // Find lowest final score (post-penalty)
  const lowestFinalScore = Math.min(...Array.from(scores.values()).map(s => s.finalScore))

  // Return all players with the lowest final score (handles ties)
  const winners: string[] = []
  for (const [playerId, scoreData] of scores.entries()) {
    if (scoreData.finalScore === lowestFinalScore) {
      winners.push(playerId)
    }
  }

  return winners
}

/**
 * Complete game - orchestrate scoring, winner determination, and state updates
 */
export async function completeGame(gameId: string): Promise<void> {
  return await db.transaction(async (tx) => {
    // Calculate scores with penalty logic
    const scores = await calculateScores(gameId)

    // Determine winner(s)
    const winners = await determineWinner(scores)

    // Fetch all players and their cards for summary
    const players = await tx
      .select()
      .from(player)
      .where(eq(player.gameSessionId, gameId))

    const cards = await tx
      .select()
      .from(card)
      .where(
        and(
          eq(card.gameSessionId, gameId),
          eq(card.location, 'hand'),
        ),
      )

    // Get Cambio caller ID
    const [game] = await tx
      .select()
      .from(gameSession)
      .where(eq(gameSession.id, gameId))

    // Insert game_score records
    for (const p of players) {
      const scoreData = scores.get(p.id)
      if (!scoreData) {
        continue
      }

      const playerCards = cards.filter(c => c.ownerId === p.id)
      const cardsSummary = playerCards.map(c => ({
        rank: c.rank,
        suit: c.suit,
        pointValue: c.pointValue,
      }))

      await tx.insert(gameScore).values({
        gameSessionId: gameId,
        playerId: p.id,
        finalScore: scoreData.finalScore,
        isCambioCaller: game?.cambioCallerId === p.id,
        penaltyApplied: scoreData.penaltyApplied,
        isWinner: winners.includes(p.id),
        cardsSummary,
      })
    }

    // Update game session: phase = 'completed', winnerId = first winner, completedAt = NOW
    await tx
      .update(gameSession)
      .set({
        phase: 'completed',
        winnerId: winners[0] || null,
        completedAt: new Date(),
      })
      .where(eq(gameSession.id, gameId))

    // Broadcast GAME_COMPLETED event with scores
    const scoresArray = players.map((p) => {
      const scoreData = scores.get(p.id)!
      return {
        playerId: p.id,
        displayName: p.displayName,
        finalScore: scoreData.finalScore,
        isWinner: winners.includes(p.id),
      }
    })

    broadcastToGame(gameId, {
      type: 'game_completed',
      gameId,
      data: {
        winners: scoresArray.filter(s => s.isWinner),
        scores: scoresArray,
      },
      timestamp: new Date(),
    })
  })
}
