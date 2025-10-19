/**
 * Game session service
 * Core business logic for managing Cambio game sessions
 */

import { eq } from 'drizzle-orm'
import type {
  Card,
  CardPosition,
  CreateGameRequest,
  DrawSource,
  GameSession,
  JoinGameRequest,
  Player,
  Rank,
  Suit,
} from '~/shared/types/game'
import { CARD_VALUES, ERROR_MESSAGES, GAME_RULES, SPECIAL_POWERS } from '~/shared/constants/game'
import {
  calculateScore,
  calculateScoresWithPenalty,
  createDeck,
  dealCards,
  determineWinners,
  indexToPosition,
  shuffle,
} from '~/server/utils/cardUtils'
import { gameEvents } from '~/server/utils/gameSocket'
import { card, gameScore, gameSession, player } from '~/server/database/schema/game'

/**
 * Create a new game session
 */
export async function createGame(request: CreateGameRequest): Promise<{ session: GameSession, creator: Player }> {
  const db = useDb()

  // Validate player count
  if (request.playerCount < GAME_RULES.MIN_PLAYERS || request.playerCount > GAME_RULES.MAX_PLAYERS) {
    throw createError({
      statusCode: 400,
      statusMessage: ERROR_MESSAGES.INVALID_PLAYER_COUNT,
    })
  }

  // Create game session
  const [newSession] = await db
    .insert(gameSession)
    .values({
      phase: 'setup',
    })
    .returning()

  // Create the first player (creator)
  const [creator] = await db
    .insert(player)
    .values({
      gameSessionId: newSession.id,
      displayName: request.creatorDisplayName,
      type: 'human',
      turnOrder: 0,
      isConnected: true,
    })
    .returning()

  // Create and shuffle deck
  const deckTemplate = createDeck()
  const shuffledDeck = shuffle(deckTemplate)

  // Insert all cards into the database
  const cardInsertPromises = shuffledDeck.map((cardData, index) =>
    db.insert(card).values({
      gameSessionId: newSession.id,
      suit: cardData.suit,
      rank: cardData.rank,
      pointValue: cardData.pointValue,
      location: 'deck',
      orderInPile: index,
    }).returning(),
  )

  await Promise.all(cardInsertPromises)

  // Build session response
  const session = await buildGameSession(newSession.id)
  const creatorPlayer = session.players.find(p => p.id === creator.id)!

  return { session, creator: creatorPlayer }
}

/**
 * Join an existing game
 */
export async function joinGame(
  gameId: string,
  request: JoinGameRequest,
): Promise<{ session: GameSession, player: Player }> {
  const db = useDb()

  // Check if game exists and is joinable
  const [existingSession] = await db
    .select()
    .from(gameSession)
    .where(eq(gameSession.id, gameId))

  if (!existingSession) {
    throw createError({
      statusCode: 404,
      statusMessage: ERROR_MESSAGES.GAME_NOT_FOUND,
    })
  }

  if (existingSession.phase !== 'setup') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Game has already started',
    })
  }

  // Check current player count
  const existingPlayers = await db
    .select()
    .from(player)
    .where(eq(player.gameSessionId, gameId))

  if (existingPlayers.length >= GAME_RULES.MAX_PLAYERS) {
    throw createError({
      statusCode: 400,
      statusMessage: ERROR_MESSAGES.GAME_FULL,
    })
  }

  // Create new player
  const [newPlayer] = await db
    .insert(player)
    .values({
      gameSessionId: gameId,
      displayName: request.displayName,
      type: request.playerType || 'human',
      turnOrder: existingPlayers.length,
      isConnected: true,
    })
    .returning()

  // If we have minimum players, start the game
  if (existingPlayers.length + 1 >= GAME_RULES.MIN_PLAYERS) {
    await startGame(gameId)
  }

  // Build and return updated session
  const session = await buildGameSession(gameId)
  const joinedPlayer = session.players.find(p => p.id === newPlayer.id)!

  // Broadcast player joined event
  gameEvents.playerJoined(gameId, newPlayer.id, newPlayer.displayName)

  return { session, player: joinedPlayer }
}

/**
 * Start the game - deal cards and set initial state
 */
export async function startGame(gameId: string): Promise<void> {
  const db = useDb()

  // Get all players
  const players = await db
    .select()
    .from(player)
    .where(eq(player.gameSessionId, gameId))

  if (players.length < GAME_RULES.MIN_PLAYERS) {
    throw createError({
      statusCode: 400,
      statusMessage: ERROR_MESSAGES.INVALID_PLAYER_COUNT,
    })
  }

  // Get deck cards
  const deckCards = await db
    .select()
    .from(card)
    .where(eq(card.gameSessionId, gameId))
    .orderBy(card.orderInPile)

  // Deal cards to each player (4 cards in 2x2 grid)
  const cardsPerPlayer = GAME_RULES.CARDS_PER_PLAYER
  let cardIndex = 0

  for (const currentPlayer of players) {
    const playerCards = deckCards.slice(cardIndex, cardIndex + cardsPerPlayer)

    // Assign cards to player in 2x2 grid
    for (let i = 0; i < playerCards.length; i++) {
      const position = indexToPosition(i)

      await db
        .update(card)
        .set({
          ownerId: currentPlayer.id,
          location: 'hand',
          positionRow: position.row,
          positionCol: position.col,
          visibility: 'hidden',
        })
        .where(eq(card.id, playerCards[i].id))
    }

    cardIndex += cardsPerPlayer
  }

  // Put the next card in discard pile
  if (deckCards[cardIndex]) {
    await db
      .update(card)
      .set({
        location: 'discard',
        orderInPile: 0,
        visibility: 'visible',
      })
      .where(eq(card.id, deckCards[cardIndex].id))

    cardIndex++
  }

  // Update remaining cards order in pile
  const remainingDeckCards = deckCards.slice(cardIndex)
  for (let i = 0; i < remainingDeckCards.length; i++) {
    await db
      .update(card)
      .set({
        orderInPile: i,
      })
      .where(eq(card.id, remainingDeckCards[i].id))
  }

  // Update game session to initial_view phase
  await db
    .update(gameSession)
    .set({
      phase: 'initial_view',
      currentTurnPlayerId: players[0].id,
      updatedAt: new Date(),
    })
    .where(eq(gameSession.id, gameId))
}

/**
 * Build complete game session from database
 */
export async function buildGameSession(gameId: string): Promise<GameSession> {
  const db = useDb()

  const [session] = await db
    .select()
    .from(gameSession)
    .where(eq(gameSession.id, gameId))

  if (!session) {
    throw createError({
      statusCode: 404,
      statusMessage: ERROR_MESSAGES.GAME_NOT_FOUND,
    })
  }

  // Get players
  const playersData = await db
    .select()
    .from(player)
    .where(eq(player.gameSessionId, gameId))
    .orderBy(player.turnOrder)

  // Get all cards
  const cardsData = await db
    .select()
    .from(card)
    .where(eq(card.gameSessionId, gameId))

  // Build players with their cards
  const players: Player[] = playersData.map((p) => {
    const playerCards = cardsData
      .filter(c => c.ownerId === p.id && c.location === 'hand')
      .sort((a, b) => {
        const aIndex = (a.positionRow || 0) * 2 + (a.positionCol || 0)
        const bIndex = (b.positionRow || 0) * 2 + (b.positionCol || 0)
        return aIndex - bIndex
      })
      .map(c => ({
        id: c.id,
        suit: c.suit as Suit,
        rank: c.rank as Rank,
        pointValue: c.pointValue,
        position: {
          row: c.positionRow as 0 | 1,
          col: c.positionCol as 0 | 1,
        },
        visibility: c.visibility as 'hidden' | 'visible' | 'peeking',
        ownerId: p.id,
      }))

    return {
      id: p.id,
      userId: p.userId || undefined,
      displayName: p.displayName,
      type: p.type as 'human' | 'bot',
      cards: playerCards,
      score: p.score,
      turnOrder: p.turnOrder,
      isConnected: p.isConnected,
      hasViewedInitialCards: p.hasViewedInitialCards,
    }
  })

  // Build draw pile
  const drawPile: Card[] = cardsData
    .filter(c => c.location === 'deck')
    .sort((a, b) => (a.orderInPile || 0) - (b.orderInPile || 0))
    .map(c => ({
      id: c.id,
      suit: c.suit as Suit,
      rank: c.rank as Rank,
      pointValue: c.pointValue,
      position: { row: 0, col: 0 },
      visibility: 'hidden' as const,
      ownerId: '',
    }))

  // Build discard pile
  const discardPile: Card[] = cardsData
    .filter(c => c.location === 'discard')
    .sort((a, b) => (a.orderInPile || 0) - (b.orderInPile || 0))
    .map(c => ({
      id: c.id,
      suit: c.suit as Suit,
      rank: c.rank as Rank,
      pointValue: c.pointValue,
      position: { row: 0, col: 0 },
      visibility: 'visible' as const,
      ownerId: '',
    }))

  return {
    id: session.id,
    players,
    drawPile,
    discardPile,
    currentTurnPlayerId: session.currentTurnPlayerId || players[0]?.id || '',
    phase: session.phase as 'setup' | 'initial_view' | 'playing' | 'final_round' | 'completed',
    cambioCallerId: session.cambioCallerId || undefined,
    winnerId: session.winnerId || undefined,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt || undefined,
  }
}

/**
 * Get game session by ID
 */
export async function getGameSession(gameId: string): Promise<GameSession> {
  return buildGameSession(gameId)
}

/**
 * Validate that it's the player's turn
 */
export function validatePlayerTurn(session: GameSession, playerId: string): void {
  if (session.currentTurnPlayerId !== playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: ERROR_MESSAGES.NOT_YOUR_TURN,
    })
  }
}

/**
 * Validate game phase
 */
export function validateGamePhase(session: GameSession, allowedPhases: string[]): void {
  if (!allowedPhases.includes(session.phase)) {
    throw createError({
      statusCode: 400,
      statusMessage: ERROR_MESSAGES.INVALID_ACTION,
    })
  }
}
