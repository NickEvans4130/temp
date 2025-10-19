type GameMode = 'easy' | 'normal' | 'expert'
type AnalyticsEventType =
  | 'puzzle_started'
  | 'failed_attempt'
  | 'group_solved'
  | 'puzzle_completed'
  | 'puzzle_failed'
  | 'hint_used'

interface AnalyticsContext {
  puzzleNumber: number
  mode: GameMode
}

interface AnalyticsMetrics {
  startedAt: number | null
  attempts: number
}

interface AnalyticsEventOptions {
  notes?: string
  includeDuration?: boolean
}

interface AnalyticsPayload extends AnalyticsContext {
  sessionId: string
  eventType: AnalyticsEventType
  attemptCount: number
  durationSec?: number
  notes: string
}

export interface AnalyticsAPI {
  setContext: (context: AnalyticsContext) => void
  start: () => void
  attempt: (notes?: string) => void
  groupSolved: (country?: string) => void
  completed: () => void
  failed: (reason: string) => void
  hint: () => void
}

declare global {
  interface Window {
    gnxAnalytics?: AnalyticsAPI
    gnxMetrics?: AnalyticsMetrics
  }
}

const SESSION_STORAGE_KEY = 'gnx_session_id'
const LOG_ENDPOINT = '/log'

let context: AnalyticsContext = { puzzleNumber: 1, mode: 'normal' }
const metrics: AnalyticsMetrics = { startedAt: null, attempts: 0 }

const isBrowser = typeof window !== 'undefined'

if (isBrowser) {
  window.gnxMetrics = metrics
}

const getStoredSessionId = (): string | null => {
  if (!isBrowser) return null

  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

const storeSessionId = (sessionId: string): void => {
  if (!isBrowser) return

  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  } catch {
    // Ignore storage errors (e.g., private browsing)
  }
}

const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const randomPart = Math.random().toString(36).slice(2)
  const timestampPart = Date.now().toString(36)
  return `${randomPart}-${timestampPart}`
}

const ensureSessionId = (): string => {
  const existing = getStoredSessionId()
  if (existing) {
    return existing
  }

  const sessionId = generateSessionId()
  storeSessionId(sessionId)
  return sessionId
}

const updateContext = (next: AnalyticsContext): void => {
  context = next
}

const resolveDuration = (): number | undefined => {
  if (metrics.startedAt == null) return undefined
  const elapsedMs = Date.now() - metrics.startedAt
  return Math.max(0, Math.round(elapsedMs / 1000))
}

const sendEvent = (eventType: AnalyticsEventType, options: AnalyticsEventOptions = {}): void => {
  if (!isBrowser || typeof fetch !== 'function') return

  const sessionId = ensureSessionId()
  const payload: AnalyticsPayload = {
    sessionId,
    puzzleNumber: context.puzzleNumber,
    mode: context.mode,
    eventType,
    attemptCount: metrics.attempts,
    notes: options.notes ?? ''
  }

  if (options.includeDuration) {
    const duration = resolveDuration()
    if (typeof duration === 'number') {
      payload.durationSec = duration
    }
  }

  try {
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {
      // Swallow network errors to avoid impacting gameplay
    })
  } catch {
    // Ignore synchronous fetch errors
  }
}

const analyticsImpl: AnalyticsAPI = {
  setContext(nextContext) {
    updateContext(nextContext)
  },
  start() {
    if (!isBrowser) return
    metrics.startedAt = Date.now()
    metrics.attempts = 0
    sendEvent('puzzle_started')
  },
  attempt(notes) {
    if (!isBrowser) return
    metrics.attempts += 1
    sendEvent('failed_attempt', { notes })
  },
  groupSolved(country) {
    if (!isBrowser) return
    sendEvent('group_solved', { notes: country })
  },
  completed() {
    if (!isBrowser) return
    sendEvent('puzzle_completed', { includeDuration: true })
  },
  failed(reason) {
    if (!isBrowser) return
    sendEvent('puzzle_failed', { notes: reason, includeDuration: true })
  },
  hint() {
    if (!isBrowser) return
    sendEvent('hint_used')
  }
}

if (isBrowser) {
  window.gnxAnalytics = analyticsImpl
}

export const logPuzzleStarted = ({ puzzleNumber, mode }: AnalyticsContext): void => {
  if (!isBrowser) return
  analyticsImpl.setContext({ puzzleNumber, mode })
  analyticsImpl.start()
}

export const logFailedAttempt = (
  { puzzleNumber, mode }: AnalyticsContext,
  notes?: string
): void => {
  if (!isBrowser) return
  analyticsImpl.setContext({ puzzleNumber, mode })
  analyticsImpl.attempt(notes)
}

export const logGroupSolved = (
  { puzzleNumber, mode }: AnalyticsContext,
  country?: string
): void => {
  if (!isBrowser) return
  analyticsImpl.setContext({ puzzleNumber, mode })
  analyticsImpl.groupSolved(country)
}

export const logPuzzleCompleted = ({ puzzleNumber, mode }: AnalyticsContext): void => {
  if (!isBrowser) return
  analyticsImpl.setContext({ puzzleNumber, mode })
  analyticsImpl.completed()
}

export const logPuzzleFailed = (
  { puzzleNumber, mode }: AnalyticsContext,
  reason: string
): void => {
  if (!isBrowser) return
  analyticsImpl.setContext({ puzzleNumber, mode })
  analyticsImpl.failed(reason)
}

export const logHintUsed = ({ puzzleNumber, mode }: AnalyticsContext): void => {
  if (!isBrowser) return
  analyticsImpl.setContext({ puzzleNumber, mode })
  analyticsImpl.hint()
}

