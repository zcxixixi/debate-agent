import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveApiBaseUrl } from '../lib/api.ts'

test('resolveApiBaseUrl prefers NEXT_PUBLIC_API_BASE_URL when configured', () => {
  const previousValue = process.env.NEXT_PUBLIC_API_BASE_URL
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com///'

  try {
    assert.equal(
      resolveApiBaseUrl({
        hostname: 'debate.example.com',
        origin: 'https://debate.example.com',
      }),
      'https://api.example.com'
    )
  } finally {
    if (previousValue === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = previousValue
    }
  }
})

test('resolveApiBaseUrl keeps localhost pointing at the local backend', () => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL

  assert.equal(
    resolveApiBaseUrl({
      hostname: 'localhost',
      origin: 'http://localhost:3000',
    }),
    'http://127.0.0.1:8000'
  )
})

test('resolveApiBaseUrl falls back to the current origin for deployed same-origin setups', () => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL

  assert.equal(
    resolveApiBaseUrl({
      hostname: 'debate.example.cn',
      origin: 'https://debate.example.cn',
    }),
    'https://debate.example.cn'
  )
})

test('resolveApiBaseUrl throws when there is neither config nor runtime location', () => {
  delete process.env.NEXT_PUBLIC_API_BASE_URL

  assert.throws(
    () => resolveApiBaseUrl(null),
    /Missing NEXT_PUBLIC_API_BASE_URL/
  )
})
