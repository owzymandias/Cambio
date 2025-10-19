/**
 * Card utility functions for Cambio game
 * Handles shuffling, dealing, and score calculation
 */

import type { Card, CardPosition, Rank, Suit } from '~/shared/types/game'
import { CARD_VALUES, RANKS, SUITS } from '~/shared/constants/game'

/**
 * Create a full 52-card deck
 */
export function createDeck(): Omit<Card, 'id' | 'position' | 'visibility' | 'ownerId'>[] {
  const deck: Omit<Card, 'id' | 'position' | 'visibility' | 'ownerId'>[] = []

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit: suit as Suit,
        rank: rank as Rank,
        pointValue: CARD_VALUES[rank as Rank],
      })
    }
  }

  return deck
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param array - Array to shuffle (mutates the array)
 * @returns Shuffled array
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

/**
 * Deal cards from the deck
 * @param deck - The deck to deal from
 * @param count - Number of cards to deal
 * @returns Array of dealt cards and remaining deck
 */
export function dealCards<T>(deck: T[], count: number): { dealt: T[], remaining: T[] } {
  if (deck.length < count) {
    throw new Error(`Cannot deal ${count} cards from a deck of ${deck.length}`)
  }

  const dealt = deck.slice(0, count)
  const remaining = deck.slice(count)

  return { dealt, remaining }
}

/**
 * Calculate the total score for a hand of cards
 * @param cards - Array of cards to score
 * @returns Total point value
 */
export function calculateScore(cards: Card[]): number {
  return cards.reduce((total, card) => total + card.pointValue, 0)
}

/**
 * Calculate scores for all players with Cambio penalties
 * @param playerCards - Map of player ID to their cards
 * @param cambioCallerId - ID of player who called Cambio (if any)
 * @returns Map of player ID to final score
 */
export function calculateScoresWithPenalty(
  playerCards: Map<string, Card[]>,
  cambioCallerId?: string,
): Map<string, number> {
  const scores = new Map<string, number>()
  let lowestScore = Infinity
  let lowestScorerId: string | undefined

  // Calculate base scores and find lowest
  for (const [playerId, cards] of playerCards.entries()) {
    const score = calculateScore(cards)
    scores.set(playerId, score)

    if (score < lowestScore) {
      lowestScore = score
      lowestScorerId = playerId
    }
  }

  // Apply penalty if Cambio caller didn't have lowest score
  if (cambioCallerId && lowestScorerId && cambioCallerId !== lowestScorerId) {
    const callerScore = scores.get(cambioCallerId) || 0
    scores.set(cambioCallerId, callerScore * 2) // Double the score as penalty
  }

  return scores
}

/**
 * Determine winner(s) from final scores
 * @param scores - Map of player ID to score
 * @returns Array of winner player IDs (can be multiple in case of tie)
 */
export function determineWinners(scores: Map<string, number>): string[] {
  let lowestScore = Infinity
  const winners: string[] = []

  for (const [playerId, score] of scores.entries()) {
    if (score < lowestScore) {
      lowestScore = score
      winners.length = 0
      winners.push(playerId)
    }
    else if (score === lowestScore) {
      winners.push(playerId)
    }
  }

  return winners
}

/**
 * Generate a 2x2 card position
 * @param index - Index (0-3) to convert to position
 * @returns CardPosition object
 */
export function indexToPosition(index: number): CardPosition {
  if (index < 0 || index > 3) {
    throw new Error('Card index must be between 0 and 3')
  }

  return {
    row: Math.floor(index / 2) as 0 | 1,
    col: (index % 2) as 0 | 1,
  }
}

/**
 * Convert a 2x2 position to array index
 * @param position - CardPosition to convert
 * @returns Index (0-3)
 */
export function positionToIndex(position: CardPosition): number {
  return position.row * 2 + position.col
}

/**
 * Check if a position is in the initial view row (bottom row, indices 2-3)
 * @param position - CardPosition to check
 * @returns True if position is in bottom row
 */
export function isInitialViewPosition(position: CardPosition): boolean {
  return position.row === 1 // Bottom row
}

/**
 * Get the two initial view positions (bottom row cards)
 * @returns Array of two CardPosition objects for bottom row
 */
export function getInitialViewPositions(): CardPosition[] {
  return [
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ]
}

/**
 * Validate a card position is within bounds
 * @param position - CardPosition to validate
 * @returns True if valid
 */
export function isValidPosition(position: CardPosition): boolean {
  return position.row >= 0 && position.row <= 1
    && position.col >= 0 && position.col <= 1
}
