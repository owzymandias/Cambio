/**
 * Power-specific helper functions for special card powers
 */

import type { SpecialPowerType } from '~/shared/types/game'
import { db } from './db'
import { card, player } from '~/server/database/schema/game'
import { eq, and } from 'drizzle-orm'
import { broadcastToPlayer } from './gameSocket'

/**
 * Validate power activation target (card index, player ID, power type constraints)
 */
export function validatePowerTarget(
  powerType: SpecialPowerType,
  cardIndex: number | undefined,
  targetPlayerId: string | undefined,
  activatingPlayerId: string,
): { valid: boolean, error?: string } {
  // Validate card index in range 0-3 (for 2x2 grid)
  if (cardIndex !== undefined && (cardIndex < 0 || cardIndex > 3)) {
    return { valid: false, error: 'Card index out of range (expected 0-3)' }
  }

  // Validate target player exists for peek_opponent and blind_swap
  if ((powerType === 'peek_opponent' || powerType === 'blind_swap')) {
    if (!targetPlayerId) {
      return { valid: false, error: 'Target player required for this power type' }
    }

    // Ensure target is not the activating player
    if (targetPlayerId === activatingPlayerId) {
      return { valid: false, error: 'Cannot target yourself with this power' }
    }
  }

  // Validate card index is required for all peek powers
  if ((powerType === 'peek_own' || powerType === 'peek_opponent') && cardIndex === undefined) {
    return { valid: false, error: 'Card index required for peek powers' }
  }

  return { valid: true }
}

/**
 * Select a random card from a player's hand (for King auto-peek)
 */
export function selectRandomCard<T extends { id: string }>(cards: T[]): T | null {
  if (cards.length === 0) {
    return null
  }
  const randomIndex = Math.floor(Math.random() * cards.length)
  return cards[randomIndex]
}

/**
 * Apply peek power: Update card visibility, broadcast private reveal, schedule auto-hide
 */
export async function applyPeekPower(
  cardId: string,
  playerId: string,
  gameId: string,
  durationMs: number = 5000,
): Promise<void> {
  // Update card visibility to 'peeking'
  await db
    .update(card)
    .set({ visibility: 'peeking' })
    .where(eq(card.id, cardId))

  // Fetch card details to broadcast
  const [revealedCard] = await db
    .select()
    .from(card)
    .where(eq(card.id, cardId))

  if (!revealedCard) {
    throw new Error(`Card ${cardId} not found`)
  }

  // Broadcast private CARD_REVEALED event to player
  broadcastToPlayer(gameId, playerId, {
    type: 'power_activated',
    gameId,
    playerId,
    data: {
      powerType: 'peek',
      cardId,
      card: {
        rank: revealedCard.rank,
        suit: revealedCard.suit,
        pointValue: revealedCard.pointValue,
      },
      expiresAt: Date.now() + durationMs,
    },
    timestamp: new Date(),
  })

  // Schedule auto-hide after durationMs (server-side timer)
  setTimeout(async () => {
    await db
      .update(card)
      .set({ visibility: 'hidden' })
      .where(eq(card.id, cardId))

    broadcastToPlayer(gameId, playerId, {
      type: 'power_activated',
      gameId,
      playerId,
      data: {
        powerType: 'peek_hidden',
        cardId,
      },
      timestamp: new Date(),
    })
  }, durationMs)
}

/**
 * Apply blind swap power: Swap card owners between two players
 */
export async function applyBlindSwap(
  myCardId: string,
  targetCardId: string,
  myPlayerId: string,
  targetPlayerId: string,
): Promise<void> {
  // Fetch both cards
  const [myCard] = await db.select().from(card).where(eq(card.id, myCardId))
  const [targetCard] = await db.select().from(card).where(eq(card.id, targetCardId))

  if (!myCard || !targetCard) {
    throw new Error('One or both cards not found for blind swap')
  }

  // Swap owners
  await db
    .update(card)
    .set({ ownerId: targetPlayerId })
    .where(eq(card.id, myCardId))

  await db
    .update(card)
    .set({ ownerId: myPlayerId })
    .where(eq(card.id, targetCardId))
}
