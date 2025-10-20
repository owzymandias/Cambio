/**
 * Shared types and interfaces for Cambio card game
 */

import { z } from 'zod'

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export type CardPosition = {
  row: 0 | 1 // 2x2 grid: 0 = top row, 1 = bottom row
  col: 0 | 1 // 0 = left column, 1 = right column
}

export type CardVisibility = 'hidden' | 'visible' | 'peeking'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  pointValue: number
  position: CardPosition
  visibility: CardVisibility
  ownerId: string // Player ID who owns this card
}

export type GamePhase = 'setup' | 'initial_view' | 'playing' | 'final_round' | 'completed'

export type PlayerType = 'human' | 'bot'

export interface Player {
  id: string
  userId?: string // Optional - for authenticated users
  displayName: string
  type: PlayerType
  cards: Card[]
  score: number
  turnOrder: number
  isConnected: boolean
  hasViewedInitialCards: boolean
}

export type DrawSource = 'deck' | 'discard'

export type SpecialPowerType = 'peek_own' | 'peek_opponent' | 'blind_swap' | 'look_own' | 'none'

export interface SpecialPower {
  type: SpecialPowerType
  activatedBy: string // Player ID
  targetCardId?: string
  targetPlayerId?: string
  timestamp: Date
}

export interface Turn {
  playerId: string
  action: 'draw' | 'swap' | 'discard' | 'cambio' | 'power'
  drawSource?: DrawSource
  cardDrawn?: Card
  cardSwapped?: {
    oldCardId: string
    newCardId: string
  }
  specialPower?: SpecialPower
  timestamp: Date
}

export interface GameSession {
  id: string
  players: Player[]
  drawPile: Card[]
  discardPile: Card[]
  currentTurnPlayerId: string
  phase: GamePhase
  cambioCallerId?: string // Player who called Cambio
  winnerId?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface GameState {
  session: GameSession
  currentPlayer: Player
  isMyTurn: boolean
  availableActions: GameAction[]
}

export type GameAction =
  | 'draw_from_deck'
  | 'draw_from_discard'
  | 'swap_card'
  | 'discard_card'
  | 'call_cambio'
  | 'use_special_power'
  | 'peek_card'
  | 'blind_swap'

export interface GameEvent {
  type: 'game_created' | 'player_joined' | 'turn_started' | 'card_drawn' | 'card_swapped' | 'card_discarded' | 'power_activated' | 'cambio_called' | 'game_completed'
  gameId: string
  playerId?: string
  data?: any
  timestamp: Date
}

export interface CreateGameRequest {
  playerCount: number // 2-4
  botCount?: number // Optional: fill remaining slots with bots
  creatorDisplayName: string
}

export interface JoinGameRequest {
  displayName: string
  playerType?: PlayerType
}

export interface DrawCardRequest {
  source: DrawSource
  playerId?: string // TODO: Remove when auth is implemented
}

export interface SwapCardRequest {
  drawnCardId: string
  targetCardPosition: CardPosition
  playerId?: string // TODO: Remove when auth is implemented
}

export interface UsePowerRequest {
  powerType: SpecialPowerType
  targetPlayerId?: string
  targetCardPosition?: CardPosition
}

export interface GameScore {
  playerId: string
  displayName: string
  score: number
  cards: Card[]
  isCambioCaller: boolean
  penaltyApplied: boolean
  isWinner: boolean
}

// Power Activation Request Types (with Zod validation)
export const PowerActivationRequestSchema = z.discriminatedUnion('powerType', [
  z.object({
    powerType: z.literal('peek_own'),
    cardIndex: z.number().int().min(0).max(3),
  }),
  z.object({
    powerType: z.literal('peek_opponent'),
    targetPlayerId: z.string().uuid(),
    cardIndex: z.number().int().min(0).max(3),
  }),
  z.object({
    powerType: z.literal('blind_swap'),
    myCardIndex: z.number().int().min(0).max(3),
    targetPlayerId: z.string().uuid(),
    targetCardIndex: z.number().int().min(0).max(3),
  }),
  z.object({
    powerType: z.literal('look_own'),
  }),
])

export type PowerActivationRequest = z.infer<typeof PowerActivationRequestSchema>

export interface PowerActivationResult {
  success: boolean
  message: string
  revealedCard?: {
    rank: Rank
    suit: Suit
    pointValue: number
  }
}

// Cambio Call Request/Response
export const CambioCallRequestSchema = z.object({
  playerId: z.string().uuid().optional(),
})

export type CambioCallRequest = z.infer<typeof CambioCallRequestSchema>

export interface CambioCallResult {
  success: boolean
  message: string
  finalRoundStarted: boolean
}

// Player Score (for final scoring display)
export interface PlayerScore {
  playerId: string
  displayName: string
  baseScore: number
  finalScore: number
  isCambioCaller: boolean
  penaltyApplied: boolean
  isWinner: boolean
  cards: Array<{
    rank: Rank
    suit: Suit
    pointValue: number
  }>
}

// Winner Info
export interface WinnerInfo {
  playerId: string
  displayName: string
  finalScore: number
}

// Scores Response (from GET /api/game/[id]/scores)
export interface ScoresResponse {
  gameId: string
  phase: GamePhase
  completedAt: Date | null
  cambioCallerId: string | null
  scores: PlayerScore[]
  winners: WinnerInfo[]
}
