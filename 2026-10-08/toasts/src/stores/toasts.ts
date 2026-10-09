import { defineStore, storeToRefs } from 'pinia'
import { readonly, ref, type Ref } from 'vue'
import { useLogger } from './logger'

export type ToastKind = 'info' | 'success' | 'error'

export interface ToastInput {
  message: string
  kind?: ToastKind // default 'info'
  duration?: number // ms, default 5000; 0 = sticky
}

export type PauseReason = 'hover' | 'focus'

type Timer = {
  handle?: ReturnType<typeof setTimeout>
  remaining: number
  startedAt: number
  // A toast can be hovered and focused at the same time; it resumes only when both are gone.
  pausedBy: Set<PauseReason>
}

export interface Toast extends Required<ToastInput> {
  id: number
}

const DEFAULT_DURATION = 5000
export const MAX_VISIBLE = 3

export const useToastStore = defineStore('toasts', () => {
  const logger = useLogger()
  let id = 0
  const timers = new Map<number, Timer>()
  const toasts = ref<Toast[]>([])
  // Queued toasts are kept out of the DOM, so the live regions don't announce them yet.
  let queue: Toast[] = []

  function createNewToast(input: ToastInput): Omit<Toast, 'id'> {
    const duration = input.duration ?? DEFAULT_DURATION
    return {
      kind: input.kind ?? 'info',
      duration: Number.isFinite(duration) && duration >= 0 ? duration : DEFAULT_DURATION,
      message: input.message,
    }
  }

  function findExisting(input: Omit<Toast, 'id'>) {
    const isSame = (t: Toast) => t.message === input.message && t.kind === input.kind
    return toasts.value.find(isSame) ?? queue.find(isSame)
  }

  function push(input: ToastInput): number {
    const newToast = createNewToast(input)
    const existing = findExisting(newToast)

    if (existing) {
      existing.duration = newToast.duration
      if (toasts.value.includes(existing)) {
        startTimer(existing.duration, existing.id)
        logger.log(`Restarting timer for the toast with id: ${existing.id}.`)
      } else {
        // Its timer starts once it becomes visible.
        logger.log(`Toast with id ${existing.id} is already queued.`)
      }
      return existing.id
    }

    const toast = { id: id++, ...newToast }
    if (toasts.value.length < MAX_VISIBLE) {
      show(toast)
    } else {
      queue.push(toast)
      logger.log(`Queueing toast with id: ${toast.id}.`)
    }
    return toast.id
  }

  function show(toast: Toast) {
    toasts.value = [...toasts.value, toast]
    logger.log(`Adding new toast with id: ${toast.id}.`)
    startTimer(toast.duration, toast.id)
  }

  function clearTimer(id: number) {
    clearTimeout(timers.get(id)?.handle)
    timers.delete(id)
  }

  function schedule(id: number, timer: Timer) {
    timer.startedAt = Date.now()
    timer.handle = setTimeout(() => {
      logger.log(`Duration passed for toast with id ${id}. Toast closed.`)
      dismiss(id)
    }, timer.remaining)
  }

  function startTimer(duration: number, id: number) {
    const pausedBy = timers.get(id)?.pausedBy ?? new Set<PauseReason>()
    clearTimer(id)
    if (duration === 0) return

    const timer: Timer = { remaining: duration, startedAt: Date.now(), pausedBy }
    timers.set(id, timer)
    // A duplicate pushed while the toast is hovered/focused restarts the time but stays paused.
    if (pausedBy.size === 0) {
      schedule(id, timer)
      logger.log(`Starting timer for toast with id ${id}, duration ${duration}ms.`)
    }
  }

  function stopTimer(id: number, reason: PauseReason) {
    const timer = timers.get(id)
    if (!timer) return
    if (timer.pausedBy.size === 0) {
      clearTimeout(timer.handle)
      timer.handle = undefined
      timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt))
      logger.log(`Toast with id ${id} paused. Remaining: ${timer.remaining}ms.`)
    }
    timer.pausedBy.add(reason)
  }

  function continueTimer(id: number, reason: PauseReason) {
    const timer = timers.get(id)
    if (!timer || !timer.pausedBy.delete(reason) || timer.pausedBy.size > 0) return

    schedule(id, timer)
    logger.log(`Continue timer for toast with id ${id}. Duration: ${timer.remaining}ms.`)
  }

  function dismiss(id: number) {
    clearTimer(id)
    queue = queue.filter((t) => t.id !== id)
    const before = toasts.value.length
    toasts.value = toasts.value.filter((t) => t.id !== id)
    if (toasts.value.length === before) return
    logger.log(`Toast with id ${id} dismissed.`)

    const next = queue.shift()
    if (next) show(next)
  }

  function clear() {
    for (const id of timers.keys()) clearTimer(id)
    queue = []
    toasts.value = []
  }

  return {
    toasts,
    push,
    dismiss,
    stopTimer,
    continueTimer,
    clear,
  }
})

/** The public API from the challenge: read-only toasts, `push` and `dismiss`. */
export function useToasts(): {
  toasts: Readonly<Ref<readonly Toast[]>>
  push(input: ToastInput): number
  dismiss(id: number): void
} {
  const store = useToastStore()
  const { toasts } = storeToRefs(store)
  return { toasts: readonly(toasts), push: store.push, dismiss: store.dismiss }
}
