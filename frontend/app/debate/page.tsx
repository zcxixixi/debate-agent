'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DebateResult, DebateState, fetchDebate, runDebate } from '@/lib/api'
import { cn } from '@/lib/utils'

function DebatePageContent() {
  const [debate, setDebate] = useState<DebateState | null>(null)
  const [result, setResult] = useState<DebateResult | null>(null)
  const [activeRound, setActiveRound] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const hasStartedRun = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const debateId = searchParams.get('id')

  useEffect(() => {
    if (!debateId || hasStartedRun.current) {
      return
    }

    hasStartedRun.current = true
    const currentDebateId = debateId

    async function loadDebate() {
      try {
        setLoading(true)
        setError(null)

        const state = await fetchDebate(currentDebateId)
        setDebate(state)

        const debateResult = await runDebate(currentDebateId)
        setResult(debateResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载辩论失败，请稍后重试。')
      } finally {
        setLoading(false)
      }
    }

    void loadDebate()
  }, [debateId])

  useEffect(() => {
    if (!result || result.arguments.length <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      setIsAnimating(true)
      window.setTimeout(() => {
        setActiveRound((prev) => (prev + 1) % result.arguments.length)
        setIsAnimating(false)
      }, 300)
    }, 8000)

    return () => window.clearInterval(timer)
  }, [result])

  const rounds = result?.arguments ?? debate?.arguments ?? []
  const currentRound = rounds[activeRound]
  const topic = result?.topic ?? debate?.topic ?? '正在加载辩题'

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
            共 {debate?.total_rounds ?? result?.arguments.length ?? 0} 轮辩论
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
              <p className="text-primary font-medium mb-2">正在生成完整辩论</p>
              <p className="text-sm text-secondary">
                后端正在调用模型完成多轮分析，完成后会自动展示结果。
              </p>
            </CardContent>
          </Card>
        ) : null}

        {!error && !loading && rounds.length > 0 ? (
          <>
            {/* Round Indicators */}
            <div className="flex justify-center gap-2 mb-8">
              {rounds.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveRound(index)}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    activeRound === index
                      ? "bg-primary w-8"
                      : "bg-black/10 w-4 hover:bg-black/20"
                  )}
                />
              ))}
            </div>

            {/* Debate Cards */}
            {currentRound ? (
              <div className={cn(
                "grid md:grid-cols-2 gap-4 transition-opacity duration-300",
                isAnimating && "opacity-40"
              )}>
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
                    <p className="text-sm text-secondary leading-relaxed">
                      {currentRound.positive}
                    </p>
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
                    <p className="text-sm text-secondary leading-relaxed">
                      {currentRound.negative}
                    </p>
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
                    className={cn(
                      "border-0 cursor-pointer transition-all duration-200",
                      activeRound === index
                        ? "ring-1 ring-primary/20 bg-white shadow-soft-md"
                        : "bg-white/60 hover:bg-white"
                    )}
                    onClick={() => setActiveRound(index)}
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
                          <span className="line-clamp-1">{round.positive.slice(0, 40)}...</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-accent-red font-medium shrink-0">反方</span>
                          <span className="line-clamp-1">{round.negative.slice(0, 40)}...</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 text-center">
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
