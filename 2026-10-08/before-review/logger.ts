import { defineStore } from 'pinia'
import { ref } from 'vue'

type Log = {
  timestamp: number
  message: string
}

export const useLogger = defineStore('logger', () => {
  const logs = ref<Log[]>([])

  function log(message: string) {
    logs.value.push({
      timestamp: Date.now(),
      message,
    })
  }

  function clear() {
    logs.value = []
  }

  return {
    logs,
    log,
    clear,
  }
})
