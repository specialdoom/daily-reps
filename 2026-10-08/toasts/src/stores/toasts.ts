import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useLogger } from './logger'

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastInput {
  message: string
  kind?: ToastKind // default 'info'
  duration?: number // ms, default 5000; 0 = sticky
}

type Timer = {
  id: number
  duration: number
  timestamp: number
}

export interface Toast extends Required<ToastInput> {
  id: number
}

export const useToasts = defineStore('toasts', () => {
  const logger = useLogger()
  let id = 0
  const timers = new Map<number, Timer>()
  const toasts = ref<Toast[]>([])

  function createNewToast(input: ToastInput) {
    return {
      id: id++,
      kind: input?.kind ?? 'info',
      duration: input?.duration ?? 5000,
      message: input.message,
    }
  }

  function getExistingToasts(toast: Toast) {
    const existingIndexes = []

    for (let i = 0; i < toasts.value.length; i++) {
      const t = toasts.value[i] as Toast
      if (t.message === toast.message && t.kind === toast.kind) {
        existingIndexes.push(i)
      }
    }

    return existingIndexes
  }

  function push(input: ToastInput) {
    const toast = createNewToast(input)
    const existingToasts = getExistingToasts(toast)

    if (existingToasts.length > 0) {
      for (const index of existingToasts) {
        const toastAtIndex = toasts.value[index] as Toast
        toasts.value[index] = { ...toastAtIndex, duration: toast.duration }
        startTimer(toast.duration, toastAtIndex.id)
        logger.log(`Updating duration for the toast with id: ${id}.`)
      }
    } else {
      toasts.value = [...toasts.value, toast]
      logger.log(`Adding new toast with id: ${id}.`)
    }

    if (toast.duration !== 0) {
      logger.log(`Starting timer for toast with id ${id}, duration ${toast.duration}ms.`)
      startTimer(toast.duration, toast.id)
    }
  }

  function startTimer(duration: number, id: number) {
    if (timers.get(id)) {
      clearTimeout(timers.get(id)?.id)
    }
    const timerId = setTimeout(() => {
      logger.log(`Duration passed for toast with id ${id}. Toast closed.`)
      dismiss(id)
    }, duration)

    timers.set(id, {
      id: timerId,
      duration,
      timestamp: Date.now(),
    })
  }

  function stopTimer(id: number) {
    const timer = timers.get(id)
    if (!timer) return
    clearTimeout(timer?.id)
    const remanining = Date.now() - timer?.timestamp
    logger.log(`Toast with id ${id} focused. Timer stopped. Remaining: ${remanining}ms.`)

    timers.set(id, {
      ...timer,
      duration: remanining,
    })
  }

  function continueTimer(id: number) {
    const timer = timers.get(id)
    if (!timer) return

    const timerId = setTimeout(() => {
      logger.log(`Duration passed for toast with id ${id}. Toast closed.`)
      dismiss(id)
    }, timer.duration)

    timers.set(id, { ...timer, id: timerId })

    logger.log(`Continue timer for toast with id ${id}. Duration: ${timer.duration}ms.`)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
    if (timers.get(id) !== undefined) {
      logger.log(`Toast with id ${id} dissmissed.`)
      clearTimeout(timers.get(id)?.id)
      timers.delete(id)
    }
  }

  return {
    toasts,
    push,
    dismiss,
    stopTimer,
    continueTimer,
  }
})
