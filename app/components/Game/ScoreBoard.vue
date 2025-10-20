<script setup lang="ts">
interface CardSummary {
  rank: string
  suit: string
  pointValue: number
}

interface PlayerScore {
  playerId: string
  displayName: string
  baseScore: number
  finalScore: number
  isCambioCaller: boolean
  penaltyApplied: boolean
  isWinner: boolean
  cards: CardSummary[]
}

const props = defineProps<{
  scores: PlayerScore[]
}>()

function formatCard(card: CardSummary): string {
  const suitSymbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }
  return `${card.rank}${suitSymbols[card.suit] || card.suit[0].toUpperCase()}`
}

function formatCards(cards: CardSummary[]): string {
  return cards.map(formatCard).join(' ')
}
</script>

<template>
  <div class="scoreboard">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">
      Final Scores
    </h2>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-gray-100 border-b-2 border-gray-300">
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Player
            </th>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Cards
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">
              Base Score
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">
              Penalty
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">
              Final Score
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="score in scores"
            :key="score.playerId"
            class="border-b border-gray-200 hover:bg-gray-50 transition-colors"
            :class="{ 'bg-green-50 hover:bg-green-100': score.isWinner }"
          >
            <td class="px-4 py-3">
              <div class="flex flex-col">
                <span class="font-medium text-gray-900">{{ score.displayName }}</span>
                <span
                  v-if="score.isCambioCaller"
                  class="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 w-fit"
                >
                  Cambio Caller
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1 flex-wrap font-mono text-sm">
                <span
                  v-for="(card, idx) in score.cards"
                  :key="`${card.rank}-${card.suit}-${idx}`"
                  class="inline-block px-1.5 py-0.5 bg-gray-100 rounded"
                  :class="{
                    'text-red-600': card.suit === 'hearts' || card.suit === 'diamonds',
                    'text-gray-800': card.suit === 'clubs' || card.suit === 'spades',
                  }"
                >
                  {{ formatCard(card) }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-center text-gray-700">
              {{ score.baseScore }}
            </td>
            <td class="px-4 py-3 text-center">
              <span
                v-if="score.penaltyApplied"
                class="inline-flex items-center px-2 py-1 rounded text-sm font-semibold bg-red-100 text-red-800"
              >
                ×2
              </span>
              <span v-else class="text-gray-400">
                -
              </span>
            </td>
            <td class="px-4 py-3 text-center font-bold text-lg" :class="score.isWinner ? 'text-green-600' : 'text-gray-900'">
              {{ score.finalScore }}
            </td>
            <td class="px-4 py-3 text-center">
              <span
                v-if="score.isWinner"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-500 text-white"
              >
                WINNER
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  @apply p-6 bg-white rounded-lg shadow-lg;
}

table {
  @apply min-w-full;
}
</style>
