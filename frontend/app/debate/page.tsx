'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { MarkdownContent } from '@/components/markdown-content'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  fadeScale,
  fadeUp,
  slideReveal,
  softTransition,
  staggerContainer,
  viewportOnce,
} from '@/lib/motion'
import {
  DebateResult,
  DebateState,
  fetchDebate,
  fetchResult,
  resolveApiBaseUrl,
} from '@/lib/api'
import {
  advanceDebatePlayback,
  applyDebateStreamEvent,
  buildDebateWebSocketUrl,
  createDebateStreamState,
  getPreferredRoundIndex,
  isDebatePlaybackSettled,
  stripMarkdownForPreview,
  type DebateStreamEvent,
  type DebateStreamState,
} from '@/lib/debate-stream'
import { cn } from '@/lib/utils'

const SOCKET_RECONNECT_DELAY_MS = 1_500
const roundTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
} as const

function DebatePageContent() {
  const [streamState, setStreamState] = useState<DebateStreamState | null>(null)
  const [displayedDebate, setDisplayedDebate] = useState<DebateState | null>(null)
  const [result, setResult] = useState<DebateResult | null>(null)
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const completedRef = useRef(false)
  const activeRoundRef = useRef<HTMLDivElement | null>(null)
  const liveHistoryRoundRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const debateId = searchParams.get('id')
  const debate = streamState?.debate ?? null
  const renderedDebate = result ? null : displayedDebate ?? debate
  const thinking = streamState?.thinking ?? null
  const moderatorIntro = result?.summary ?? streamState?.moderatorIntro ?? null

  useEffect(() => {
    if (!debateId) {
      return
    }
    const currentDebateId = debateId
    let isCancelled = false
    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let reconnectAttempt = 0
    let latestState: DebateState | null = null

    async function syncFinalResult() {
      const [debateState, debateResult] = await Promise.all([
        fetchDebate(currentDebateId),
        fetchResult(currentDebateId),
      ])

      if (isCancelled) {
        return
      }

      completedRef.current = true
      setStreamState((previousState) => ({
        ...createDebateStreamState(debateState),
        moderatorIntro:
          debateResult.summary ??
          previousState?.moderatorIntro ??
          null,
      }))
      setDisplayedDebate(debateState)
      setResult(debateResult)
      setSelectedRoundIndex(null)
      setLoading(false)
    }

    function clearRecoveryTimers() {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    function closeSocket() {
      if (!socket) {
        return
      }

      socket.close()
      socket = null
    }

    async function syncLiveState() {
      const nextState = await fetchDebate(currentDebateId)

      if (isCancelled) {
        return
      }

      latestState = nextState
      setStreamState((previousState) => {
        const baseState = previousState ?? createDebateStreamState(nextState)
        return {
          ...baseState,
          debate: nextState,
        }
      })
      setDisplayedDebate(nextState)

      if (nextState.status === 'completed') {
        completedRef.current = true
        clearRecoveryTimers()
        closeSocket()
        await syncFinalResult()
      }
    }

    function scheduleRecovery() {
      if (isCancelled || completedRef.current || reconnectTimer !== null) {
        return
      }

      reconnectAttempt += 1
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null
        if (isCancelled || completedRef.current) {
          return
        }

        void syncLiveState()
          .catch(() => {
            // Ignore transient recovery failures and retry the socket path.
          })
          .finally(() => {
            if (!isCancelled && !completedRef.current) {
              openSocket()
            }
          })
      }, SOCKET_RECONNECT_DELAY_MS * Math.min(reconnectAttempt, 4))
    }

    function openSocket() {
      if (isCancelled || completedRef.current || socket) {
        return
      }

      socket = new WebSocket(
        buildDebateWebSocketUrl(resolveApiBaseUrl(), currentDebateId)
      )

      socket.addEventListener('open', () => {
        if (isCancelled) {
          return
        }

        reconnectAttempt = 0
        setLoading(false)
      })

      socket.addEventListener('message', (messageEvent) => {
        if (isCancelled) {
          return
        }

        const payload = JSON.parse(messageEvent.data) as {
          type?: string
          message?: string
          round?: number
        }

        if (typeof payload.type !== 'string') {
          return
        }

        const streamEvent = payload as DebateStreamEvent
        if (payload.type === 'error') {
          completedRef.current = true
          clearRecoveryTimers()
          setError(payload.message ?? '辩论中断，请稍后重试。')
          setLoading(false)
          closeSocket()
          return
        }

        if (payload.type === 'cached_result' || payload.type === 'completed') {
          completedRef.current = true
          clearRecoveryTimers()
          void syncFinalResult().catch((err) => {
            if (!isCancelled) {
              setError(
                err instanceof Error
                  ? err.message
                  : '同步最终辩论结果失败，请稍后重试。'
              )
              setLoading(false)
            }
          })
          closeSocket()
          return
        }

        setStreamState((previousState) => {
          const baseLiveState = latestState ?? previousState?.debate
          if (!baseLiveState) {
            return previousState
          }

          return applyDebateStreamEvent(
            previousState ?? createDebateStreamState(baseLiveState),
            streamEvent
          )
        })
      })

      socket.addEventListener('error', () => {
        if (!isCancelled && !completedRef.current) {
          closeSocket()
          scheduleRecovery()
        }
      })

      socket.addEventListener('close', () => {
        socket = null
        if (!isCancelled && !completedRef.current) {
          scheduleRecovery()
        }
      })
    }

    async function loadDebate() {
      try {
        setLoading(true)
        setError(null)
        completedRef.current = false

        const state = await fetchDebate(currentDebateId)

        if (isCancelled) {
          return
        }

        latestState = state
        setStreamState(createDebateStreamState(state))
        setDisplayedDebate(state)
        setSelectedRoundIndex(null)

        if (state.status === 'completed') {
          await syncFinalResult()
          return
        }

        openSocket()
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载辩论失败，请稍后重试。')
      } finally {
        if (!socket) {
          setLoading(false)
        }
      }
    }

    void loadDebate()

    return () => {
      isCancelled = true
      clearRecoveryTimers()
      closeSocket()
    }
  }, [debateId])

  useEffect(() => {
    if (!debate || result) {
      return
    }

    setDisplayedDebate((currentDebate) => currentDebate ?? debate)
  }, [debate, result])

  useEffect(() => {
    if (!debate || !displayedDebate || result) {
      return
    }

    if (isDebatePlaybackSettled(debate, displayedDebate)) {
      return
    }

    const playbackTimer = window.setTimeout(() => {
      setDisplayedDebate((currentDebate) => {
        if (!currentDebate) {
          return debate
        }

        return advanceDebatePlayback(debate, currentDebate, 20)
      })
    }, 36)

    return () => window.clearTimeout(playbackTimer)
  }, [debate, displayedDebate, result])

  const rounds = result?.arguments ?? renderedDebate?.arguments ?? []
  const topic = result?.topic ?? renderedDebate?.topic ?? debate?.topic ?? '正在加载辩题'
  const completedRounds = (renderedDebate?.arguments ?? []).filter(
    (round) => round.positive && round.negative
  ).length
  const liveRoundIndex =
    renderedDebate && renderedDebate.arguments.length > 0
      ? getPreferredRoundIndex(renderedDebate)
      : 0
  const liveRound = renderedDebate?.arguments[liveRoundIndex]
  const autoScrollRound = selectedRoundIndex === null ? liveRound?.round ?? null : null
  const activeRoundIndex =
    selectedRoundIndex ??
    (result
      ? Math.max(result.arguments.length - 1, 0)
      : renderedDebate
        ? getPreferredRoundIndex(renderedDebate)
        : 0)
  const safeActiveRoundIndex = Math.min(
    Math.max(activeRoundIndex, 0),
    Math.max(rounds.length - 1, 0)
  )
  const currentRound = rounds[safeActiveRoundIndex]

  useEffect(() => {
    if (selectedRoundIndex !== null || autoScrollRound === null || result) {
      return
    }

    const scrollTimer = window.setTimeout(() => {
      activeRoundRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 120)

    return () => window.clearTimeout(scrollTimer)
  }, [autoScrollRound, result, selectedRoundIndex])

  return (
    <div className="page-shell min-h-screen px-6 py-12">
      <div className="ambient-orb ambient-orb-blue" />
      <div className="ambient-orb ambient-orb-gold" />
      <div className="ambient-orb ambient-orb-violet" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          className="mb-10 text-center"
          variants={staggerContainer(0.1, 0.05)}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={fadeUp(18)}
            className="hero-badge mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-accent-green"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green"></span>
            </span>
            {result ? '辩论已完成' : '辩论进行中'}
          </motion.div>
          <motion.h1
            variants={fadeUp(24)}
            className="mx-auto max-w-4xl text-2xl font-semibold tracking-tight text-primary md:text-4xl"
          >
            {topic}
          </motion.h1>
          <motion.p variants={fadeUp(20)} className="mt-3 text-sm text-secondary">
            共 {renderedDebate?.total_rounds ?? debate?.total_rounds ?? result?.arguments.length ?? 0} 轮辩论
          </motion.p>
        </motion.div>

        {!debateId ? (
          <Card className="border-0">
            <CardContent className="p-6 text-center text-secondary">
              缺少辩论 ID，请返回首页重新开始。
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="mb-6 border-0">
            <CardContent className="p-6 text-center">
              <p className="mb-3 text-accent-red">{error}</p>
              <Button variant="outline" onClick={() => router.push('/')}>
                返回首页
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!error && loading ? (
          <motion.div variants={fadeScale(0.96)} initial="hidden" animate="show">
            <Card className="mb-6 border-0">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-primary" />
                <p className="mb-2 font-medium text-primary">正在建立实时辩论连接</p>
                <p className="text-sm text-secondary">
                  页面会按模型生成顺序实时显示每一轮论点，而不是等全部完成后一次返回。
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {!error && !loading && !result ? (
          <motion.div variants={fadeScale(0.96)} initial="hidden" animate="show">
            <Card className="mb-6 border-0">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {thinking?.message ?? '已连接实时辩论通道，等待模型输出。'}
                    </p>
                    <p className="mt-1 text-xs text-secondary">
                      {thinking?.agent === 'positive'
                        ? '当前为正方输出'
                        : thinking?.agent === 'negative'
                          ? '当前为反方输出'
                          : thinking?.agent === 'judgment'
                            ? '当前为裁判评估'
                            : '每个新 chunk 会直接写入下面的辩论卡片。'}
                    </p>
                  </div>
                  <div className="text-xs text-tertiary">
                    已完成 {completedRounds} / {renderedDebate?.total_rounds ?? debate?.total_rounds ?? 0} 轮
                  </div>
                </div>
                {selectedRoundIndex !== null ? (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRoundIndex(null)}
                    >
                      跟随直播
                    </Button>
                  </div>
                ) : null}
                {moderatorIntro ? (
                  <div className="mt-4 rounded-2xl bg-black/[0.02] p-4">
                    <MarkdownContent
                      content={moderatorIntro}
                      compact
                      className="text-secondary"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {!error && rounds.length > 0 ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={softTransition}
              className="mb-8 flex justify-center gap-2"
            >
              {rounds.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setSelectedRoundIndex(index)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    safeActiveRoundIndex === index
                      ? 'w-8 bg-primary'
                      : 'w-4 bg-black/10 hover:bg-black/20'
                  )}
                />
              ))}
            </motion.div>

            {currentRound ? (
              <motion.div
                key={`${currentRound.round}-${safeActiveRoundIndex}`}
                ref={selectedRoundIndex === null ? activeRoundRef : null}
                className="grid gap-4 md:grid-cols-2"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={roundTransition}
              >
                <motion.div variants={slideReveal(-24)} initial="hidden" animate="show">
                  <Card className="border-0 overflow-hidden">
                    <div className="h-0.5 bg-accent-blue" />
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/10">
                          <svg className="h-4 w-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <CardTitle className="text-base text-accent-blue">正方观点</CardTitle>
                          <p className="mt-0.5 text-xs text-tertiary">Round {currentRound.round}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {currentRound.positive ? (
                        <MarkdownContent content={currentRound.positive} />
                      ) : (
                        <p className="text-sm font-medium leading-relaxed text-secondary">
                          正方正在生成本轮观点...
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={slideReveal(24)} initial="hidden" animate="show">
                  <Card className="border-0 overflow-hidden">
                    <div className="h-0.5 bg-accent-red" />
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-red/10">
                          <svg className="h-4 w-4 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div>
                          <CardTitle className="text-base text-accent-red">反方观点</CardTitle>
                          <p className="mt-0.5 text-xs text-tertiary">Round {currentRound.round}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {currentRound.negative ? (
                        <MarkdownContent content={currentRound.negative} />
                      ) : (
                        <p className="text-sm font-medium leading-relaxed text-secondary">
                          反方正在生成本轮观点...
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ) : null}

            <motion.div
              className="mt-10"
              variants={staggerContainer(0.06, 0.12)}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              <motion.h2 variants={fadeUp(20)} className="mb-4 text-center text-sm font-medium text-primary">
                辩论历程
              </motion.h2>
              <div className="space-y-2">
                {rounds.map((round, index) => (
                  <motion.div
                    key={round.round}
                    variants={fadeUp(18 + index * 2, 0.56)}
                  >
                    <Card
                      ref={selectedRoundIndex === null && index === liveRoundIndex ? liveHistoryRoundRef : null}
                      className={cn(
                        'border-0 cursor-pointer transition-all duration-200',
                        safeActiveRoundIndex === index
                          ? 'bg-white shadow-soft-lg ring-1 ring-primary/20'
                          : 'bg-white/60 hover:bg-white'
                      )}
                      onClick={() => setSelectedRoundIndex(index)}
                    >
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-primary">第 {round.round} 轮</span>
                          <span className="text-xs text-tertiary">
                            {round.positive.length + round.negative.length} 字
                          </span>
                        </div>
                        <div className="grid gap-3 text-xs text-secondary md:grid-cols-2">
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 font-medium text-accent-blue">正方</span>
                            <span className="line-clamp-1">
                              {round.positive
                                ? `${stripMarkdownForPreview(round.positive).slice(0, 40)}...`
                                : '生成中...'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 font-medium text-accent-red">反方</span>
                            <span className="line-clamp-1">
                              {round.negative
                                ? `${stripMarkdownForPreview(round.negative).slice(0, 40)}...`
                                : '生成中...'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...softTransition, delay: 0.18 }}
              className="mt-10 text-center"
            >
              {result ? (
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => router.push(`/report?id=${encodeURIComponent(debateId ?? '')}`)}
                >
                  查看最终判决
                  <svg className="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              ) : (
                <p className="text-sm text-secondary">
                  裁判结论生成后，这里会解锁最终判决页入口。
                </p>
              )}
            </motion.div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function DebatePageFallback() {
  return (
    <div className="page-shell min-h-screen px-6 py-12">
      <div className="ambient-orb ambient-orb-blue" />
      <div className="ambient-orb ambient-orb-gold" />
      <div className="ambient-orb ambient-orb-violet" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <Card className="border-0">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-primary" />
            <p className="mb-2 font-medium text-primary">正在准备辩论页面</p>
            <p className="text-sm text-secondary">页面参数加载完成后会自动继续。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DebatePage() {
  return (
    <Suspense fallback={<DebatePageFallback />}>
      <DebatePageContent />
    </Suspense>
  )
}
