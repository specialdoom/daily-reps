import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { isReadonly, nextTick } from 'vue'
import ToastHost from '../ToastHost.vue'
import { useToasts, type ToastInput } from '../../stores/toasts.ts'

let wrapper: VueWrapper

const polite = () => wrapper.get('[role="status"]')
const assertive = () => wrapper.get('[role="alert"]')
const items = () => wrapper.findAll('li')
const item = (message: string) => items().find((li) => li.text().includes(message))

async function push(input: ToastInput) {
  const id = useToasts().push(input)
  await nextTick()
  return id
}

async function advance(ms: number) {
  vi.advanceTimersByTime(ms)
  await nextTick()
}

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  document.body.innerHTML = '<button id="opener">open</button>'
  wrapper = mount(ToastHost, { attachTo: document.body })
})

afterEach(() => {
  wrapper.unmount()
  vi.useRealTimers()
})

describe('live regions', () => {
  it('renders both persistent regions, empty, before any toast', () => {
    expect(polite().attributes()).toMatchObject({ 'aria-live': 'polite', 'aria-atomic': 'false' })
    expect(assertive().attributes()).toMatchObject({ 'aria-live': 'assertive' })
    expect(polite().text()).toBe('')
    expect(assertive().text()).toBe('')
  })

  it('does not let role="alert" fall back to its implicit aria-atomic="true"', () => {
    expect(assertive().attributes('aria-atomic')).toBe('false')
  })

  it('puts info/success in the polite region only and errors in the assertive region only', async () => {
    await push({ message: 'Saved', kind: 'success' })
    expect(polite().text()).toContain('Saved')
    expect(assertive().text()).not.toContain('Saved')

    await push({ message: 'Boom', kind: 'error' })
    expect(assertive().text()).toContain('Boom')
    expect(polite().text()).not.toContain('Boom')
  })

  it('keeps live-region roles off the lists so list items keep a list parent', () => {
    for (const li of [polite(), assertive()]) {
      expect(li.element.tagName).not.toBe('UL')
      expect(li.find('ul').exists()).toBe(true)
    }
  })
})

describe('timers', () => {
  it('auto-dismisses after the default 5000 ms', async () => {
    await push({ message: 'Saved' })
    await advance(4999)
    expect(item('Saved')).toBeDefined()
    await advance(1)
    expect(item('Saved')).toBeUndefined()
  })

  it('resumes with the remaining time after hover (4000 + hover 3000 + leave → ~1000)', async () => {
    await push({ message: 'Saved', kind: 'success' })
    await advance(4000)
    await item('Saved')!.trigger('mouseenter')
    await advance(3000)
    expect(item('Saved')).toBeDefined()
    await item('Saved')!.trigger('mouseleave')
    await advance(900)
    expect(item('Saved')).toBeDefined()
    await advance(100)
    expect(item('Saved')).toBeUndefined()
  })

  it('measures a second pause from the resume, not from the push', async () => {
    await push({ message: 'Saved' })
    await advance(1000)
    await item('Saved')!.trigger('mouseenter')
    await advance(10_000)
    await item('Saved')!.trigger('mouseleave')
    await advance(500)
    await item('Saved')!.trigger('mouseenter')
    await advance(100)
    await item('Saved')!.trigger('mouseleave')
    await advance(3499)
    expect(item('Saved')).toBeDefined()
    await advance(1)
    expect(item('Saved')).toBeUndefined()
  })

  it('pauses while focus is inside the toast and resumes when it leaves', async () => {
    await push({ message: 'Saved' })
    await advance(4000)
    item('Saved')!.get('button').element.focus()
    await advance(10_000)
    expect(item('Saved')).toBeDefined()
    ;(document.getElementById('opener') as HTMLElement).focus()
    await advance(999)
    expect(item('Saved')).toBeDefined()
    await advance(1)
    expect(item('Saved')).toBeUndefined()
  })

  it('stays paused when the mouse leaves but focus is still inside', async () => {
    await push({ message: 'Saved' })
    await item('Saved')!.trigger('mouseenter')
    item('Saved')!.get('button').element.focus()
    await item('Saved')!.trigger('mouseleave')
    await advance(20_000)
    expect(item('Saved')).toBeDefined()
  })

  it('pauses error toasts on hover too', async () => {
    await push({ message: 'Boom', kind: 'error' })
    await advance(4000)
    await item('Boom')!.trigger('mouseenter')
    await advance(5000)
    expect(item('Boom')).toBeDefined()
  })

  it('keeps duration: 0 sticky', async () => {
    await push({ message: 'Sticky', duration: 0 })
    await advance(60_000)
    expect(item('Sticky')).toBeDefined()
  })

  it('falls back to the default duration for an invalid one', async () => {
    await push({ message: 'Bad', duration: Number.NaN })
    await advance(1)
    expect(item('Bad')).toBeDefined()
    await advance(5000)
    expect(item('Bad')).toBeUndefined()
  })

  it('clears the timer when a paused toast is dismissed', async () => {
    await push({ message: 'Saved' })
    await item('Saved')!.trigger('mouseenter')
    await item('Saved')!.get('button').trigger('click')
    expect(item('Saved')).toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not leave orphaned timers when leave fires without enter', async () => {
    await push({ message: 'Saved' })
    await item('Saved')!.trigger('mouseleave')
    expect(vi.getTimerCount()).toBe(1)
  })

  it('leaves no timers behind after the host unmounts', async () => {
    await push({ message: 'Saved' })
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
    wrapper = mount(ToastHost, { attachTo: document.body })
  })
})

describe('dedupe', () => {
  it('returns the id from push', async () => {
    const a = await push({ message: 'One' })
    const b = await push({ message: 'Two' })
    expect(typeof a).toBe('number')
    expect(b).not.toBe(a)
  })

  it('keeps one DOM node and returns the same id for the same message + kind', async () => {
    const a = await push({ message: 'Saved' })
    const b = await push({ message: 'Saved' })
    expect(b).toBe(a)
    expect(items()).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('treats the same message with another kind as a different toast', async () => {
    await push({ message: 'Saved', kind: 'info' })
    await push({ message: 'Saved', kind: 'error' })
    expect(items()).toHaveLength(2)
  })

  it('restarts the timer of the visible duplicate', async () => {
    await push({ message: 'Saved' })
    await advance(4000)
    await push({ message: 'Saved' })
    await advance(4999)
    expect(item('Saved')).toBeDefined()
    await advance(1)
    expect(item('Saved')).toBeUndefined()
  })

  it('does not dismiss a sticky toast when it is pushed again', async () => {
    await push({ message: 'Sticky', duration: 0 })
    await push({ message: 'Sticky', duration: 0 })
    await advance(10_000)
    expect(item('Sticky')).toBeDefined()
  })

  it('restarts but stays paused when a duplicate arrives during hover', async () => {
    await push({ message: 'Saved' })
    await item('Saved')!.trigger('mouseenter')
    await advance(3000)
    await push({ message: 'Saved' })
    await advance(10_000)
    expect(item('Saved')).toBeDefined()
    await item('Saved')!.trigger('mouseleave')
    await advance(4999)
    expect(item('Saved')).toBeDefined()
    await advance(1)
    expect(item('Saved')).toBeUndefined()
  })
})

describe('Escape', () => {
  it('dismisses the toast and restores focus to where it came from', async () => {
    const opener = document.getElementById('opener') as HTMLElement
    opener.focus()
    await push({ message: 'Saved' })
    item('Saved')!.get('button').element.focus()
    await item('Saved')!.get('button').trigger('keydown', { key: 'Escape' })
    expect(item('Saved')).toBeUndefined()
    expect(document.activeElement).toBe(opener)
  })

  it('falls back to document.body when there is nowhere to return to', async () => {
    await push({ message: 'Saved' })
    item('Saved')!.get('button').element.focus()
    await item('Saved')!.get('button').trigger('keydown', { key: 'Escape' })
    expect(item('Saved')).toBeUndefined()
    expect(document.activeElement).toBe(document.body)
  })

  it('works on error toasts too', async () => {
    await push({ message: 'Boom', kind: 'error' })
    item('Boom')!.get('button').element.focus()
    await item('Boom')!.get('button').trigger('keydown', { key: 'Escape' })
    expect(item('Boom')).toBeUndefined()
  })

  it('names each dismiss button after its message', async () => {
    await push({ message: 'Saved' })
    expect(item('Saved')!.get('button').attributes('aria-label')).toBe('Dismiss: Saved')
  })
})

describe('queue', () => {
  it('shows at most 3 toasts and keeps queued ones out of the live regions', async () => {
    for (let i = 0; i < 50; i++) useToasts().push({ message: `Toast ${i}` })
    await nextTick()
    expect(items()).toHaveLength(3)
    expect(polite().text()).not.toContain('Toast 3')
  })

  it('promotes queued toasts FIFO and only starts their timer when shown', async () => {
    for (let i = 0; i < 5; i++) useToasts().push({ message: `Toast ${i}` })
    await nextTick()
    expect(vi.getTimerCount()).toBe(3)

    await advance(1000)
    await item('Toast 1')!.get('button').trigger('click')
    expect(items().map((li) => li.text())).toEqual(
      ['Toast 0', 'Toast 2', 'Toast 3'].map((m) => `${m}x`),
    )

    // Toast 0 and Toast 2 expire at 5000 ms; Toast 3 was only shown at 1000 ms.
    await advance(4000)
    expect(items().map((li) => li.text())).toEqual(['Toast 3x', 'Toast 4x'])
  })

  it('dedupes against queued toasts too', async () => {
    for (let i = 0; i < 4; i++) useToasts().push({ message: `Toast ${i}` })
    const queuedId = useToasts().push({ message: 'Toast 3' })
    await nextTick()
    await item('Toast 0')!.get('button').trigger('click')
    expect(items().filter((li) => li.text().includes('Toast 3'))).toHaveLength(1)
    expect(useToasts().toasts.value.find((t) => t.message === 'Toast 3')?.id).toBe(queuedId)
  })
})

describe('useToasts API', () => {
  it('exposes toasts as a read-only ref', async () => {
    const { toasts } = useToasts()
    await push({ message: 'Saved' })
    expect(isReadonly(toasts)).toBe(true)
    expect(toasts.value.map((t) => t.message)).toEqual(['Saved'])
  })
})
