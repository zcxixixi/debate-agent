'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  topic: string
  winner: 'positive' | 'negative'
  summary: string
  analysis: string
  recommendation: string
  scores: {
    positive: number
    negative: number
  }
  keyPoints: {
    positive: string[]
    negative: string[]
  }
}

interface ReportViewProps {
  report: Report
}

export default function ReportView({ report }: ReportViewProps) {
  const winnerText = report.winner === 'positive' ? '正方' : '反方'
  const winnerColor = report.winner === 'positive' ? 'text-accent-blue' : 'text-accent-red'
  const winnerBg = report.winner === 'positive' ? 'bg-accent-blue/5' : 'bg-accent-red/5'

  return (
    <div className="space-y-4">
      {/* Winner announcement */}
      <div className={cn("rounded-2xl p-6 text-center", winnerBg)}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-soft mb-3">
          {report.winner === 'positive' ? (
            <svg className="w-6 h-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <h2 className={cn("text-xl font-semibold", winnerColor)}>
          {winnerText}获胜！
        </h2>
        <p className="text-sm text-secondary mt-1">{report.summary}</p>
      </div>

      {/* Score comparison */}
      <Card className="border-0">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-primary mb-4">得分对比</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium text-accent-blue">正方</span>
                <span className="text-xs font-medium text-primary">{report.scores.positive}分</span>
              </div>
              <div className="h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-blue rounded-full transition-all duration-1000"
                  style={{ width: `${report.scores.positive}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium text-accent-red">反方</span>
                <span className="text-xs font-medium text-primary">{report.scores.negative}分</span>
              </div>
              <div className="h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-red rounded-full transition-all duration-1000"
                  style={{ width: `${report.scores.negative}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key points */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="border-0">
          <CardContent className="p-5">
            <h3 className="text-xs font-medium text-accent-blue mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-accent-blue/10 flex items-center justify-center">
                <svg className="w-3 h-3 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              正方核心论点
            </h3>
            <ul className="space-y-2">
              {report.keyPoints.positive.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-secondary">
                  <span className="w-4 h-4 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center text-2xs font-medium shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-xs">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="p-5">
            <h3 className="text-xs font-medium text-accent-red mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-accent-red/10 flex items-center justify-center">
                <svg className="w-3 h-3 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              反方核心论点
            </h3>
            <ul className="space-y-2">
              {report.keyPoints.negative.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-secondary">
                  <span className="w-4 h-4 rounded-full bg-accent-red/10 text-accent-red flex items-center justify-center text-2xs font-medium shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-xs">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Analysis */}
      <Card className="border-0">
        <CardContent className="p-5">
          <h3 className="text-xs font-medium text-primary mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-black/[0.04] flex items-center justify-center">
              <svg className="w-3 h-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            辩论分析
          </h3>
          <p className="text-xs text-secondary leading-relaxed">{report.analysis}</p>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-0 overflow-hidden">
        <div className="h-0.5 bg-accent-green" />
        <CardContent className="p-5">
          <h3 className="text-xs font-medium text-accent-green mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-accent-green/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </span>
            行动建议
          </h3>
          <p className="text-xs text-secondary leading-relaxed">{report.recommendation}</p>
        </CardContent>
      </Card>
    </div>
  )
}