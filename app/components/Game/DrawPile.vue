<script setup lang="ts">
interface Props {
  cardCount: number
  isClickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isClickable: false,
})

const emit = defineEmits<{
  click: []
}>()

function handleClick() {
  if (props.isClickable) {
    emit('click')
  }
}
</script>

<template>
  <div class="draw-pile-container">
    <div
      class="draw-pile"
      :class="{ 'draw-pile-clickable': isClickable }"
      @click="handleClick"
    >
      <!-- Stack of cards effect -->
      <div class="card-stack">
        <div
          v-for="i in Math.min(3, cardCount)"
          :key="i"
          class="stacked-card"
          :style="{ transform: `translate(${(i - 1) * 2}px, ${(i - 1) * 2}px)` }"
        >
          <div class="card-back">
            <div class="card-back-pattern">
              <div class="card-back-logo">
                Cambio
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card count badge -->
      <div class="card-count-badge">
        <UBadge color="blue" variant="solid">
          {{ cardCount }}
        </UBadge>
      </div>
    </div>

    <div class="pile-label">
      <UIcon name="i-heroicons-rectangle-stack" class="mr-1" />
      Draw Pile
    </div>
  </div>
</template>

<style scoped>
.draw-pile-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.draw-pile {
  position: relative;
  width: 100px;
  height: 140px;
  cursor: default;
}

.draw-pile-clickable {
  cursor: pointer;
}

.draw-pile-clickable:hover .stacked-card {
  transform: translate(0, -4px) !important;
  transition: transform 0.2s ease;
}

.card-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.stacked-card {
  position: absolute;
  width: 100%;
  height: 100%;
  transition: transform 0.2s ease;
}

.card-back {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  border: 2px solid #1e40af;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-back-pattern {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.1) 10px,
    transparent 10px,
    transparent 20px
  );
  border-radius: 8px;
}

.card-back-logo {
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.card-count-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 10;
}

.pile-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  display: flex;
  align-items: center;
}

/* Responsive sizing */
@media (max-width: 640px) {
  .draw-pile {
    width: 80px;
    height: 112px;
  }

  .card-back-logo {
    font-size: 14px;
  }

  .pile-label {
    font-size: 12px;
  }
}
</style>
