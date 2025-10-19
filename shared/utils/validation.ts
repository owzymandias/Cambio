/**
 * Game validation utilities
 * Shared validation functions for both client and server
 */

import type { CardPosition } from '~/shared/types/game'
import {
  ERROR_MESSAGES,
  GAME_RULES,
  VALIDATION_RULES,
} from '~/shared/constants/game'

/**
 * Validate player count for a game
 */
export function validatePlayerCount(count: number): { valid: boolean, error?: string } {
  if (count < GAME_RULES.MIN_PLAYERS || count > GAME_RULES.MAX_PLAYERS) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_PLAYER_COUNT,
    }
  }

  return { valid: true }
}

/**
 * Validate display name
 */
export function validateDisplayName(name: string): { valid: boolean, error?: string } {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Display name is required',
    }
  }

  if (name.length < VALIDATION_RULES.DISPLAY_NAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Display name must be at least ${VALIDATION_RULES.DISPLAY_NAME_MIN_LENGTH} characters`,
    }
  }

  if (name.length > VALIDATION_RULES.DISPLAY_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Display name must not exceed ${VALIDATION_RULES.DISPLAY_NAME_MAX_LENGTH} characters`,
    }
  }

  if (!VALIDATION_RULES.DISPLAY_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      error: 'Display name can only contain letters, numbers, and spaces',
    }
  }

  return { valid: true }
}

/**
 * Validate card position within 2x2 grid
 */
export function validateCardPosition(position: CardPosition): { valid: boolean, error?: string } {
  if (position.row < 0 || position.row > 1) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_CARD_POSITION,
    }
  }

  if (position.col < 0 || position.col > 1) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_CARD_POSITION,
    }
  }

  return { valid: true }
}

/**
 * Validate bot count does not exceed total player slots
 */
export function validateBotCount(
  botCount: number,
  playerCount: number,
): { valid: boolean, error?: string } {
  if (botCount < 0) {
    return {
      valid: false,
      error: 'Bot count cannot be negative',
    }
  }

  if (botCount >= playerCount) {
    return {
      valid: false,
      error: 'Must have at least one human player',
    }
  }

  return { valid: true }
}

/**
 * Validate game ID format (UUID)
 */
export function validateGameId(gameId: string): { valid: boolean, error?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!gameId || !uuidRegex.test(gameId)) {
    return {
      valid: false,
      error: 'Invalid game ID format',
    }
  }

  return { valid: true }
}

/**
 * Validate special power target based on power type
 */
export function validatePowerTarget(
  powerType: string,
  targetPlayerId?: string,
  targetCardPosition?: CardPosition,
): { valid: boolean, error?: string } {
  switch (powerType) {
    case 'peek_own':
    case 'look_own':
      // Requires card position, no player target
      if (!targetCardPosition) {
        return {
          valid: false,
          error: 'Card position is required for this power',
        }
      }
      return validateCardPosition(targetCardPosition)

    case 'peek_opponent':
      // Requires both player and card position
      if (!targetPlayerId || !targetCardPosition) {
        return {
          valid: false,
          error: 'Both player and card position are required for this power',
        }
      }
      return validateCardPosition(targetCardPosition)

    case 'blind_swap':
      // Requires both player and card positions (source and target)
      if (!targetPlayerId || !targetCardPosition) {
        return {
          valid: false,
          error: 'Both player and card position are required for blind swap',
        }
      }
      return validateCardPosition(targetCardPosition)

    case 'none':
      return { valid: true }

    default:
      return {
        valid: false,
        error: 'Unknown power type',
      }
  }
}

/**
 * Check if a card position is in the initial view area (bottom row)
 */
export function isInitialViewPosition(position: CardPosition): boolean {
  return position.row === GAME_RULES.INITIAL_VIEW_ROW
}

/**
 * Validate that sufficient cards exist for the game
 */
export function validateDeckSize(
  playerCount: number,
  cardsPerPlayer: number = GAME_RULES.CARDS_PER_PLAYER,
): { valid: boolean, error?: string } {
  const requiredCards = playerCount * cardsPerPlayer + 1 // +1 for initial discard card
  const deckSize = 52 // Standard deck

  if (requiredCards > deckSize) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INSUFFICIENT_CARDS,
    }
  }

  return { valid: true }
}

/**
 * Batch validation for creating a game
 */
export function validateCreateGameRequest(
  playerCount: number,
  displayName: string,
  botCount: number = 0,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  const playerCountValidation = validatePlayerCount(playerCount)
  if (!playerCountValidation.valid && playerCountValidation.error) {
    errors.push(playerCountValidation.error)
  }

  const displayNameValidation = validateDisplayName(displayName)
  if (!displayNameValidation.valid && displayNameValidation.error) {
    errors.push(displayNameValidation.error)
  }

  const botCountValidation = validateBotCount(botCount, playerCount)
  if (!botCountValidation.valid && botCountValidation.error) {
    errors.push(botCountValidation.error)
  }

  const deckValidation = validateDeckSize(playerCount)
  if (!deckValidation.valid && deckValidation.error) {
    errors.push(deckValidation.error)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Batch validation for joining a game
 */
export function validateJoinGameRequest(
  gameId: string,
  displayName: string,
): { valid: boolean, errors: string[] } {
  const errors: string[] = []

  const gameIdValidation = validateGameId(gameId)
  if (!gameIdValidation.valid && gameIdValidation.error) {
    errors.push(gameIdValidation.error)
  }

  const displayNameValidation = validateDisplayName(displayName)
  if (!displayNameValidation.valid && displayNameValidation.error) {
    errors.push(displayNameValidation.error)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
