import test from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDebateStreamEvent,
  buildDebateWebSocketUrl,
  createDebateStreamState,
} from '../lib/debate-stream.ts'

const baseDebate = {
  debate_id: 'debate-1',
  topic: '我是个学生，应该买车吗？',
  context: null,
  total_rounds: 3,
  current_round: 0,
  status: 'pending',
  arguments: [],
  positive_points: [],
  negative_points: [],
} as const

test('buildDebateWebSocketUrl converts an HTTP API base into a websocket URL', () => {
  assert.equal(
    buildDebateWebSocketUrl('http://127.0.0.1:8000', 'debate-1'),
    'ws://127.0.0.1:8000/ws/debate/debate-1'
  )
})

test('buildDebateWebSocketUrl converts an HTTPS API base into a secure websocket URL', () => {
  assert.equal(
    buildDebateWebSocketUrl('https://debate-agent-1j1s.onrender.com', 'debate-1'),
    'wss://debate-agent-1j1s.onrender.com/ws/debate/debate-1'
  )
})

test('applyDebateStreamEvent accumulates chunks and finalizes round arguments', () => {
  let streamState = createDebateStreamState(baseDebate)

  streamState = applyDebateStreamEvent(streamState, {
    type: 'status',
    debate_id: 'debate-1',
    status: 'in_progress',
    total_rounds: 3,
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'moderator',
    content: '辩论将围绕成本、通勤和生活方式展开。',
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'round_start',
    round: 1,
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'thinking',
    agent: 'positive',
    message: '正方思考中...',
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'stream',
    agent: 'positive',
    chunk: '第一段',
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'stream',
    agent: 'positive',
    chunk: '第二段',
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'argument_complete',
    round: 1,
    agent: 'positive',
    content: '完整正方论点',
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'stream',
    agent: 'negative',
    chunk: '反方第一段',
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'argument_complete',
    round: 1,
    agent: 'negative',
    content: '完整反方论点',
  })
  streamState = applyDebateStreamEvent(streamState, {
    type: 'completed',
    debate_id: 'debate-1',
  })

  assert.equal(streamState.moderatorIntro, '辩论将围绕成本、通勤和生活方式展开。')
  assert.deepEqual(streamState.thinking, {
    agent: 'positive',
    message: '正方思考中...',
  })
  assert.equal(streamState.debate.current_round, 1)
  assert.equal(streamState.debate.status, 'completed')
  assert.deepEqual(streamState.debate.arguments, [
    {
      round: 1,
      positive: '完整正方论点',
      negative: '完整反方论点',
    },
  ])
})
