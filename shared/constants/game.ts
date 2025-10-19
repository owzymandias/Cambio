/**
 * Shared game constants for Cambio card game
 */

import type { Rank, SpecialPowerType } from '../types/game'

export const GAME_RULES = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  CARDS_PER_PLAYER: 4,
  GRID_ROWS: 2,
  GRID_COLS: 2,
  INITIAL_VIEW_CARDS: 2, // Players can view their 2 closest cards (bottom row)
  INITIAL_VIEW_ROW: 1, // Bottom row (0-indexed)
  BOT_TURN_DELAY_MIN: 1000, // 1 second
  BOT_TURN_DELAY_MAX: 3000, // 3 seconds
  RECONNECTION_TIMEOUT: 60000, // 60 seconds
  GAME_STATE_UPDATE_THROTTLE: 500, // 500ms for real-time updates
} as const

export const CARD_VALUES: Record<Rank, number> = {
  'A': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 10,
  'Q': 10,
  'K': 0,
}

export const SPECIAL_POWERS: Record<Rank, SpecialPowerType> = {
  'A': 'none',
  '2': 'none',
  '3': 'none',
  '4': 'none',
  '5': 'none',
  '6': 'none',
  '7': 'peek_own',
  '8': 'peek_own',
  '9': 'peek_opponent',
  '10': 'peek_opponent',
  'J': 'blind_swap',
  'Q': 'blind_swap',
  'K': 'look_own',
}

export const POWER_DESCRIPTIONS: Record<SpecialPowerType, string> = {
  'peek_own': 'Peek at one of your own cards (temporary view)',
  'peek_opponent': 'Peek at one of an opponent\'s cards',
  'blind_swap': 'Blindly swap one of your cards with an opponent\'s card',
  'look_own': 'Look at one of your own cards',
  'none': 'No special power',
}

export const CAMBIO_PENALTY_MULTIPLIER = 2 // Double score if Cambio call is incorrect

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

export const DECK_SIZE = SUITS.length * RANKS.length // 52 cards

export const ERROR_MESSAGES = {
  INVALID_PLAYER_COUNT: `Game requires ${GAME_RULES.MIN_PLAYERS}-${GAME_RULES.MAX_PLAYERS} players`,
  GAME_FULL: 'Game is already full',
  NOT_YOUR_TURN: 'It is not your turn',
  INVALID_ACTION: 'Invalid action for current game state',
  INVALID_CARD_POSITION: 'Invalid card position',
  GAME_NOT_FOUND: 'Game session not found',
  PLAYER_NOT_FOUND: 'Player not found in this game',
  ALREADY_VIEWED_CARDS: 'You have already viewed your initial cards',
  MUST_SWAP_DISCARD: 'Cards taken from discard pile must be swapped immediately',
  INVALID_POWER_TARGET: 'Invalid target for special power',
  CAMBIO_ALREADY_CALLED: 'Cambio has already been called this round',
  GAME_ALREADY_COMPLETED: 'This game has already been completed',
  INSUFFICIENT_CARDS: 'Not enough cards in deck to deal',
} as const

export const SUCCESS_MESSAGES = {
  GAME_CREATED: 'Game created successfully',
  PLAYER_JOINED: 'Player joined successfully',
  TURN_COMPLETED: 'Turn completed successfully',
  CAMBIO_CALLED: 'Cambio called! Final round begins',
  GAME_COMPLETED: 'Game completed',
} as const

export const VALIDATION_RULES = {
  DISPLAY_NAME_MIN_LENGTH: 3,
  DISPLAY_NAME_MAX_LENGTH: 20,
  DISPLAY_NAME_PATTERN: /^[a-zA-Z0-9\s]+$/, // Alphanumeric and spaces only
} as const

export const WEBSOCKET_EVENTS = {
  GAME_STATE_UPDATE: 'game:state:update',
  PLAYER_JOINED: 'game:player:joined',
  TURN_STARTED: 'game:turn:started',
  CARD_DRAWN: 'game:card:drawn',
  CARD_SWAPPED: 'game:card:swapped',
  POWER_ACTIVATED: 'game:power:activated',
  CAMBIO_CALLED: 'game:cambio:called',
  GAME_COMPLETED: 'game:completed',
  PLAYER_DISCONNECTED: 'game:player:disconnected',
  PLAYER_RECONNECTED: 'game:player:reconnected',
  ERROR: 'game:error',
} as const

export const BOT_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const

export const BOT_NAMES = [
  'Bot Alpha',
  'Bot Beta',
  'Bot Gamma',
  'Bot Delta',
  'Bot Epsilon',
  'Bot Zeta',
] as const
