'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MarkdownContent } from '@/components/markdown-content'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

function DebatePageContent() {
  const [streamState, setStreamState] = useState<DebateStreamState | null>(null)
  const [displayedDebate, setDisplayedDebate] = useState<DebateState | null>(null)
  const [result, setResult] = useState<DebateResult | null>(null)
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const hasStartedRun = useRef(false)
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
    if (!debateId || hasStartedRun.current) {
      return
    }

    hasStartedRun.current = true
    const currentDebateId = debateId
    let isCancelled = false
    let socket: WebSocket | null = null

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

    async function loadDebate() {
      try {
        setLoading(true)
        setError(null)
        completedRef.current = false

        const state = await fetchDebate(currentDebateId)

        if (isCancelled) {
          return
        }

        setStreamState(createDebateStreamState(state))
        setDisplayedDebate(state)
        setSelectedRoundIndex(null)

        if (state.status === 'completed') {
          await syncFinalResult()
          return
        }

        socket = new WebSocket(
          buildDebateWebSocketUrl(resolveApiBaseUrl(), currentDebateId)
        )

        socket.addEventListener('open', () => {
          if (!isCancelled) {
            setLoading(false)
          }
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
            setError(payload.message ?? '实时辩论连接失败，请稍后重试。')
            setLoading(false)
            socket?.close()
            return
          }

          if (payload.type === 'cached_result' || payload.type === 'completed') {
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
            socket?.close()
            return
          }

          setStreamState((previousState) =>
            applyDebateStreamEvent(
              previousState ?? createDebateStreamState(state),
              streamEvent
            )
          )
        })

        socket.addEventListener('error', () => {
          if (!isCancelled && !completedRef.current) {
            setError('实时辩论连接中断，请刷新后重试。')
            setLoading(false)
          }
        })
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
      socket?.close()
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
  const autoScrollToken =
    selectedRoundIndex === null && liveRound
      ? `${liveRound.round}:${Math.floor(
          (liveRound.positive.length + liveRound.negative.length) / 120
        )}`
      : null
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
    if (selectedRoundIndex !== null || !autoScrollToken || result) {
      return
    }

    const scrollTimer = window.setTimeout(() => {
      const scrollTarget = liveHistoryRoundRef.current ?? activeRoundRef.current
      scrollTarget?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 120)

    return () => window.clearTimeout(scrollTimer)
  }, [autoScrollToken, result, selectedRoundIndex])

  return (
    <div className="min-h-screen bg-surface-subtle px-6 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-green/10 text-accent-green text-xs font-medium mb-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green"></span>
            </span>
            {result ? '辩论已完成' : '辩论进行中'}
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary mb-2 tracking-tight">
            {topic}
          </h1>
          <p className="text-sm text-secondary">
            共 {renderedDebate?.total_rounds ?? debate?.total_rounds ?? result?.arguments.length ?? 0} 轮辩论
          </p>
        </div>

        {!debateId ? (
          <Card className="border-0">
            <CardContent className="p-6 text-center text-secondary">
              缺少辩论 ID，请返回首页重新开始。
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-0 mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-accent-red mb-3">{error}</p>
              <Button variant="outline" onClick={() => router.push('/')}>
                返回首页
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!error && loading ? (
          <Card className="border-0 mb-6">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-primary" />
              <p className="text-primary font-medium mb-2">正在建立实时辩论连接</p>
              <p className="text-sm text-secondary">
                页面会按模型生成顺序实时显示每一轮论点，而不是等全部完成后一次返回。
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!error && !loading && !result ? (
          <Card className="border-0 mb-6">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-primary">
                    {thinking?.message ?? '已连接实时辩论通道，等待模型输出。'}
                  </p>
                  <p className="text-xs text-secondary mt-1">
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
        ) : null}

        {!error && rounds.length > 0 ? (
          <>
            {/* Round Indicators */}
            <div className="flex justify-center gap-2 mb-8">
              {rounds.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedRoundIndex(index)}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    safeActiveRoundIndex === index
                      ? "bg-primary w-8"
                      : "bg-black/10 w-4 hover:bg-black/20"
                  )}
                />
              ))}
            </div>

            {/* Debate Cards */}
            {currentRound ? (
              <div
                ref={selectedRoundIndex === null ? activeRoundRef : null}
                className="grid md:grid-cols-2 gap-4"
              >
                <Card className="border-0 overflow-hidden">
                  <div className="h-0.5 bg-accent-blue" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-base text-accent-blue">正方观点</CardTitle>
                        <p className="text-xs text-tertiary mt-0.5">Round {currentRound.round}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {currentRound.positive ? (
                      <MarkdownContent content={currentRound.positive} />
                    ) : (
                      <p className="text-sm font-medium text-secondary leading-relaxed">
                        正方正在生成本轮观点...
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 overflow-hidden">
                  <div className="h-0.5 bg-accent-red" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-red/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-base text-accent-red">反方观点</CardTitle>
                        <p className="text-xs text-tertiary mt-0.5">Round {currentRound.round}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {currentRound.negative ? (
                      <MarkdownContent content={currentRound.negative} />
                    ) : (
                      <p className="text-sm font-medium text-secondary leading-relaxed">
                        反方正在生成本轮观点...
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* All Rounds Summary */}
            <div className="mt-10">
              <h2 className="text-sm font-medium text-primary text-center mb-4">辩论历程</h2>
              <div className="space-y-2">
                {rounds.map((round, index) => (
                  <Card
                    key={round.round}
                    ref={selectedRoundIndex === null && index === liveRoundIndex ? liveHistoryRoundRef : null}
                    className={cn(
                      "border-0 cursor-pointer transition-all duration-200",
                      safeActiveRoundIndex === index
                        ? "ring-1 ring-primary/20 bg-white shadow-soft-md"
                        : "bg-white/60 hover:bg-white"
                    )}
                    onClick={() => setSelectedRoundIndex(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary">第 {round.round} 轮</span>
                        <span className="text-xs text-tertiary">
                          {round.positive.length + round.negative.length} 字
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 text-xs text-secondary">
                        <div className="flex items-start gap-2">
                          <span className="text-accent-blue font-medium shrink-0">正方</span>
                          <span className="line-clamp-1">
                            {round.positive
                              ? `${stripMarkdownForPreview(round.positive).slice(0, 40)}...`
                              : '生成中...'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-accent-red font-medium shrink-0">反方</span>
                          <span className="line-clamp-1">
                            {round.negative
                              ? `${stripMarkdownForPreview(round.negative).slice(0, 40)}...`
                              : '生成中...'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 text-center">
              {result ? (
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => router.push(`/report?id=${encodeURIComponent(debateId ?? '')}`)}
                >
                  查看最终判决
                  <svg className="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              ) : (
                <p className="text-sm text-secondary">
                  裁判结论生成后，这里会解锁最终判决页入口。
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function DebatePageFallback() {
  return (
    <div className="min-h-screen bg-surface-subtle px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Card className="border-0">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-primary" />
            <p className="text-primary font-medium mb-2">正在准备辩论页面</p>
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
