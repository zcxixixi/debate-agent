import type { DebateState } from './api'

type StreamAgent = 'positive' | 'negative' | 'judgment'

type KnownDebateStreamEvent =
  | {
      type: 'status'
      debate_id: string
      status: DebateState['status']
      total_rounds: number
    }
  | {
      type: 'moderator'
      content: string
    }
  | {
      type: 'round_start'
      round: number
    }
  | {
      type: 'thinking'
      agent: StreamAgent
      message: string
    }
  | {
      type: 'stream'
      agent: 'positive' | 'negative'
      chunk: string
    }
  | {
      type: 'argument_complete'
      round: number
      agent: 'positive' | 'negative'
      content: string
    }
  | {
      type: 'completed'
      debate_id: string
    }

export type DebateStreamEvent =
  | KnownDebateStreamEvent
  | {
      type: string
      [key: string]: unknown
    }

export interface DebateStreamState {
  debate: DebateState
  moderatorIntro: string | null
  thinking: {
    agent: StreamAgent
    message: string
  } | null
}

export const buildDebateWebSocketUrl = (
  apiBaseUrl: string,
  debateId: string
): string => {
  const url = new URL(apiBaseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `/ws/debate/${encodeURIComponent(debateId)}`
  url.search = ''
  url.hash = ''
  return url.toString()
}

export const createDebateStreamState = (
  debate: DebateState
): DebateStreamState => ({
  debate: {
    ...debate,
    arguments: [...debate.arguments],
    positive_points: [...debate.positive_points],
    negative_points: [...debate.negative_points],
  },
  moderatorIntro: null,
  thinking: null,
})

export const stripMarkdownForPreview = (content: string): string =>
  content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[([^\]]+)\]\((.*?)\)/g, '$1')
    .replace(/^[>#-]+\s*/gm, '')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

export const getPreferredRoundIndex = (debate: DebateState): number => {
  if (debate.arguments.length === 0) {
    return 0
  }

  const currentRoundIndex = debate.arguments.findIndex(
    (round) => round.round === debate.current_round
  )
  if (currentRoundIndex >= 0) {
    return currentRoundIndex
  }

  const latestIncompleteIndex = debate.arguments.findLastIndex(
    (round) => !round.positive || !round.negative
  )
  if (latestIncompleteIndex >= 0) {
    return latestIncompleteIndex
  }

  return debate.arguments.length - 1
}

const ensureRound = (debate: DebateState, roundNumber: number): DebateState => {
  if (debate.arguments.some((round) => round.round === roundNumber)) {
    return debate
  }

  return {
    ...debate,
    arguments: [
      ...debate.arguments,
      {
        round: roundNumber,
        positive: '',
        negative: '',
      },
    ],
  }
}

const updateRound = (
  debate: DebateState,
  roundNumber: number,
  agent: 'positive' | 'negative',
  content: string,
  mode: 'append' | 'replace'
): DebateState => {
  const nextDebate = ensureRound(debate, roundNumber)

  return {
    ...nextDebate,
    arguments: nextDebate.arguments.map((round) => {
      if (round.round !== roundNumber) {
        return round
      }

      return {
        ...round,
        [agent]:
          mode === 'append' ? `${round[agent]}${content}` : content,
      }
    }),
  }
}

const resolveStreamingRound = (debate: DebateState): number => {
  if (debate.current_round > 0) {
    return debate.current_round
  }

  const lastRound = debate.arguments[debate.arguments.length - 1]
  return lastRound?.round ?? 1
}

export const applyDebateStreamEvent = (
  state: DebateStreamState,
  event: DebateStreamEvent
): DebateStreamState => {
  switch (event.type) {
    case 'status': {
      const statusEvent = event as Extract<
        KnownDebateStreamEvent,
        { type: 'status' }
      >
      return {
        ...state,
        debate: {
          ...state.debate,
          status: statusEvent.status,
          total_rounds: statusEvent.total_rounds,
        },
      }
    }

    case 'moderator': {
      const moderatorEvent = event as Extract<
        KnownDebateStreamEvent,
        { type: 'moderator' }
      >
      return {
        ...state,
        moderatorIntro: moderatorEvent.content,
      }
    }

    case 'round_start': {
      const roundStartEvent = event as Extract<
        KnownDebateStreamEvent,
        { type: 'round_start' }
      >
      return {
        ...state,
        debate: ensureRound(
          {
            ...state.debate,
            current_round: roundStartEvent.round,
          },
          roundStartEvent.round
        ),
      }
    }

    case 'thinking': {
      const thinkingEvent = event as Extract<
        KnownDebateStreamEvent,
        { type: 'thinking' }
      >
      return {
        ...state,
        thinking: {
          agent: thinkingEvent.agent,
          message: thinkingEvent.message,
        },
      }
    }

    case 'stream': {
      const streamEvent = event as Extract<
        KnownDebateStreamEvent,
        { type: 'stream' }
      >
      return {
        ...state,
        debate: updateRound(
          state.debate,
          resolveStreamingRound(state.debate),
          streamEvent.agent,
          streamEvent.chunk,
          'append'
        ),
      }
    }

    case 'argument_complete': {
      const argumentEvent = event as Extract<
        KnownDebateStreamEvent,
        { type: 'argument_complete' }
      >
      return {
        ...state,
        debate: updateRound(
          {
            ...state.debate,
            current_round: argumentEvent.round,
          },
          argumentEvent.round,
          argumentEvent.agent,
          argumentEvent.content,
          'replace'
        ),
      }
    }

    case 'completed':
      return {
        ...state,
        debate: {
          ...state.debate,
          status: 'completed',
        },
      }

    default:
      return state
  }
}
