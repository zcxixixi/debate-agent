'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { MarkdownContent } from '@/components/markdown-content'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  fadeScale,
  fadeUp,
  softTransition,
  staggerContainer,
  viewportOnce,
} from '@/lib/motion'
import { DebateResult, DebateState, fetchDebate, fetchResult } from '@/lib/api'
import { stripMarkdownForPreview } from '@/lib/debate-stream'
import { cn } from '@/lib/utils'

function extractHighlights(points: string[]): string[] {
  return points
    .map((point) => stripMarkdownForPreview(point))
    .map((point) => point.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function ReportPageContent() {
  const [result, setResult] = useState<DebateResult | null>(null)
  const [debate, setDebate] = useState<DebateState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const debateId = searchParams.get('id')

  useEffect(() => {
    if (!debateId) {
      setLoading(false)
      setError('缺少辩论 ID，请返回首页重新开始。')
      return
    }

    const currentDebateId = debateId

    async function loadReport() {
      try {
        setLoading(true)
        setError(null)

        const [debateState, debateResult] = await Promise.all([
          fetchDebate(currentDebateId),
          fetchResult(currentDebateId),
        ])

        setDebate(debateState)
        setResult(debateResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载最终判决失败，请稍后重试。')
      } finally {
        setLoading(false)
      }
    }

    void loadReport()
  }, [debateId])

  const winner = result?.winner ?? 'draw'
  const winnerText =
    winner === 'positive' ? '正方' : winner === 'negative' ? '反方' : '平局'
  const winnerColor =
    winner === 'positive'
      ? 'text-accent-blue'
      : winner === 'negative'
        ? 'text-accent-red'
        : 'text-primary'
  const winnerBg =
    winner === 'positive'
      ? 'bg-accent-blue/5'
      : winner === 'negative'
        ? 'bg-accent-red/5'
        : 'bg-black/[0.03]'
  const positiveHighlights = useMemo(
    () => extractHighlights(debate?.positive_points ?? []),
    [debate]
  )
  const negativeHighlights = useMemo(
    () => extractHighlights(debate?.negative_points ?? []),
    [debate]
  )
  const totalRounds = debate?.arguments.length ?? result?.arguments.length ?? 0

  return (
    <div className="page-shell min-h-screen px-6 py-12">
      <div className="ambient-orb ambient-orb-blue" />
      <div className="ambient-orb ambient-orb-gold" />
      <div className="ambient-orb ambient-orb-violet" />

      <div className="relative z-10 mx-auto max-w-3xl">
        {loading ? (
          <motion.div variants={fadeScale(0.96)} initial="hidden" animate="show">
            <Card className="mb-6 border-0">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-primary" />
                <p className="mb-2 font-medium text-primary">正在加载最终判决</p>
                <p className="text-sm text-secondary">后端返回完整结果后，这里会显示胜方与建议。</p>
              </CardContent>
            </Card>
          </motion.div>
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

        {!loading && !error && result ? (
          <motion.div
            variants={staggerContainer(0.1, 0.05)}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={fadeScale(0.94)}
              className={cn('surface-panel mb-6 rounded-[32px] p-8 text-center', winnerBg)}
            >
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-soft">
                {winner === 'positive' ? (
                  <svg className="h-7 w-7 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : winner === 'negative' ? (
                  <svg className="h-7 w-7 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                  </svg>
                )}
              </div>
              <h1 className={cn('mb-1 text-2xl font-semibold', winnerColor)}>
                {winnerText}获胜
              </h1>
              <div className="mx-auto mt-3 max-w-xl text-left">
                <MarkdownContent
                  content={result.summary ?? `${winnerText}在本轮辩论中获得最终胜出。`}
                  compact
                  className="text-secondary"
                />
              </div>
            </motion.div>

            <motion.div
              variants={staggerContainer(0.08, 0.06)}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              className="mb-6 grid gap-3 md:grid-cols-2"
            >
              <motion.div variants={fadeUp(20)}>
                <Card className="border-0 overflow-hidden">
                  <div className="h-0.5 bg-accent-blue" />
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-accent-blue">总轮次</span>
                      <span className="text-2xl font-semibold text-primary">{totalRounds}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.03]">
                      <div
                        className="h-full rounded-full bg-accent-blue transition-all duration-1000"
                        style={{ width: `${Math.min(totalRounds * 20, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp(20)}>
                <Card className="border-0 overflow-hidden">
                  <div className="h-0.5 bg-accent-red" />
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-accent-red">已生成论点</span>
                      <span className="text-2xl font-semibold text-primary">{result.arguments.length * 2}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.03]">
                      <div
                        className="h-full rounded-full bg-accent-red transition-all duration-1000"
                        style={{ width: `${Math.min(result.arguments.length * 25, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              variants={staggerContainer(0.08, 0.08)}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
              className="mb-6 grid gap-3 md:grid-cols-2"
            >
              <motion.div variants={fadeUp(22)}>
                <Card className="border-0">
                  <CardContent className="p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-accent-blue">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-accent-blue/10">
                        <svg className="h-3 w-3 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      正方核心论点
                    </h3>
                    {positiveHighlights.length > 0 ? (
                      <ul className="space-y-2">
                        {positiveHighlights.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-2xs font-medium text-accent-blue">
                              {i + 1}
                            </span>
                            <span className="text-sm text-secondary">{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-secondary">后端未返回可提炼的正方要点。</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={fadeUp(22)}>
                <Card className="border-0">
                  <CardContent className="p-5">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-accent-red">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-accent-red/10">
                        <svg className="h-3 w-3 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                      反方核心论点
                    </h3>
                    {negativeHighlights.length > 0 ? (
                      <ul className="space-y-2">
                        {negativeHighlights.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-red/10 text-2xs font-medium text-accent-red">
                              {i + 1}
                            </span>
                            <span className="text-sm text-secondary">{point}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-secondary">后端未返回可提炼的反方要点。</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeUp(24)} initial="hidden" whileInView="show" viewport={viewportOnce}>
              <Card className="mb-3 border-0">
                <CardContent className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-black/[0.04]">
                      <svg className="h-3 w-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </span>
                    辩论分析
                  </h3>
                  <MarkdownContent
                    content={result.judgment}
                    className="text-secondary"
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp(24)} initial="hidden" whileInView="show" viewport={viewportOnce}>
              <Card className="mb-8 border-0 overflow-hidden">
                <div className="h-0.5 bg-accent-green" />
                <CardContent className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-accent-green">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-accent-green/10">
                      <svg className="h-3 w-3 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </span>
                    行动建议
                  </h3>
                  <MarkdownContent
                    content={result.recommendation}
                    className="text-secondary"
                  />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={softTransition}
              className="text-center"
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/')}
              >
                <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                开始新辩论
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}

function ReportPageFallback() {
  return (
    <div className="page-shell min-h-screen px-6 py-12">
      <div className="ambient-orb ambient-orb-blue" />
      <div className="ambient-orb ambient-orb-gold" />
      <div className="ambient-orb ambient-orb-violet" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <Card className="border-0">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-primary" />
            <p className="mb-2 font-medium text-primary">正在准备判决页面</p>
            <p className="text-sm text-secondary">页面参数加载完成后会自动继续。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportPageFallback />}>
      <ReportPageContent />
    </Suspense>
  )
}
