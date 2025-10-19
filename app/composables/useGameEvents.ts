/**
 * Game events composable
 * Handles Server-Sent Events (SSE) connection for real-time game updates
 */

import type { GameEvent } from '~/shared/types/game'

export function useGameEvents(gameId: string) {
  const eventSource = ref<EventSource | null>(null)
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)

  // Event callbacks
  const eventHandlers = new Map<string, Set<(data: any) => void>>()

  /**
   * Register an event handler
   */
  function on(eventType: string, handler: (data: any) => void) {
    if (!eventHandlers.has(eventType)) {
      eventHandlers.set(eventType, new Set())
    }
    eventHandlers.get(eventType)!.add(handler)
  }

  /**
   * Unregister an event handler
   */
  function off(eventType: string, handler?: (data: any) => void) {
    if (!handler) {
      eventHandlers.delete(eventType)
      return
    }

    const handlers = eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  function emit(eventType: string, data: any) {
    const handlers = eventHandlers.get(eventType)
    if (handlers) {
      for (const handler of handlers) {
        handler(data)
      }
    }
  }

  /**
   * Connect to the SSE endpoint
   */
  function connect() {
    if (eventSource.value) {
      console.warn('Already connected to game events')
      return
    }

    try {
      eventSource.value = new EventSource(`/api/game/${gameId}/events`)

      eventSource.value.onopen = () => {
        isConnected.value = true
        connectionError.value = null
        console.log(`Connected to game ${gameId} events`)
      }

      eventSource.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle different event types
          if (data.type === 'connected') {
            emit('connected', data)
          }
          else if (data.type === 'game:state:update') {
            emit('game:state:update', data.data)
          }
          else if (data.type === 'game:error') {
            emit('game:error', data.data)
          }
          else {
            // Handle other game events
            emit(data.type, data.data)
          }
        }
        catch (err) {
          console.error('Error parsing SSE message:', err)
        }
      }

      eventSource.value.onerror = (err) => {
        console.error('SSE connection error:', err)
        isConnected.value = false
        connectionError.value = 'Connection lost'

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (eventSource.value?.readyState === EventSource.CLOSED) {
            disconnect()
            connect()
          }
        }, 3000)
      }
    }
    catch (err) {
      console.error('Failed to create EventSource:', err)
      connectionError.value = 'Failed to connect'
    }
  }

  /**
   * Disconnect from the SSE endpoint
   */
  function disconnect() {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
      isConnected.value = false
      console.log(`Disconnected from game ${gameId} events`)
    }
  }

  /**
   * Auto-connect on mount and disconnect on unmount
   */
  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected: readonly(isConnected),
    connectionError: readonly(connectionError),
    on,
    off,
    emit,
    connect,
    disconnect,
  }
}
