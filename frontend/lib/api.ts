export type DebateStatus = 'pending' | 'in_progress' | 'completed'
export type DebateWinner = 'positive' | 'negative' | 'draw'

export interface ArgumentRound {
  round: number
  positive: string
  negative: string
}

export interface DebateState {
  debate_id: string
  topic: string
  context?: string | null
  total_rounds: number
  current_round: number
  status: DebateStatus
  arguments: ArgumentRound[]
  positive_points: string[]
  negative_points: string[]
}

export interface DebateStartResponse {
  debate_id: string
  status: DebateStatus
  current_round: number
  arguments: ArgumentRound[]
}

export interface DebateResult {
  debate_id: string
  topic: string
  winner: DebateWinner
  judgment: string
  recommendation: string
  arguments: ArgumentRound[]
  summary?: string | null
}

interface StartDebateInput {
  topic: string
  context?: string
  rounds?: number
}

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

export function resolveApiBaseUrl(): string {
  if (configuredApiBaseUrl) {
    return normalizeApiBaseUrl(configuredApiBaseUrl)
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000'
    }
  }

  throw new Error('Missing NEXT_PUBLIC_API_BASE_URL. Set it before deploying the frontend.')
}

function buildApiUrl(path: string): string {
  return `${resolveApiBaseUrl()}${path}`
}

async function readResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>
  }

  let message = `Request failed with status ${response.status}`

  try {
    const data = await response.json()
    if (typeof data?.detail === 'string') {
      message = data.detail
    }
  } catch {
    // Ignore invalid JSON error responses and keep the generic message.
  }

  throw new Error(message)
}

export async function startDebate(input: StartDebateInput): Promise<DebateStartResponse> {
  const response = await fetch(buildApiUrl('/debate/start'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: input.topic,
      context: input.context,
      rounds: input.rounds ?? 3,
    }),
  })

  return readResponse<DebateStartResponse>(response)
}

export async function fetchDebate(debateId: string): Promise<DebateState> {
  const response = await fetch(buildApiUrl(`/debate/${debateId}`), {
    cache: 'no-store',
  })

  return readResponse<DebateState>(response)
}

export async function runDebate(debateId: string): Promise<DebateResult> {
  const response = await fetch(buildApiUrl(`/debate/${debateId}/run`), {
    method: 'POST',
    cache: 'no-store',
  })

  return readResponse<DebateResult>(response)
}

export async function fetchResult(debateId: string): Promise<DebateResult> {
  const response = await fetch(buildApiUrl(`/debate/${debateId}/result`), {
    cache: 'no-store',
  })

  return readResponse<DebateResult>(response)
}
