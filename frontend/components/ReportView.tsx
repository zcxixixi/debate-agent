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
  const winnerColor = report.winner === 'positive' ? 'text-blue-600' : 'text-rose-600'
  const winnerBg = report.winner === 'positive' ? 'bg-blue-50' : 'bg-rose-50'

  return (
    <div className="space-y-6">
      {/* Winner announcement */}
      <div className={cn("rounded-3xl p-8 text-center", winnerBg)}>
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg mb-4">
          <span className="text-4xl">{report.winner === 'positive' ? '🔵' : '🔴'}</span>
        </div>
        <h2 className={cn("text-2xl font-bold", winnerColor)}>
          {winnerText}获胜！
        </h2>
        <p className="text-zinc-600 mt-2">{report.summary}</p>
      </div>

      {/* Score comparison */}
      <Card className="border-0">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-zinc-800 mb-6">📊 得分对比</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-blue-600 font-medium">正方</span>
                <span className="text-zinc-600 font-semibold">{report.scores.positive}分</span>
              </div>
              <div className="h-4 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000"
                  style={{ width: `${report.scores.positive}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-rose-600 font-medium">反方</span>
                <span className="text-zinc-600 font-semibold">{report.scores.negative}分</span>
              </div>
              <div className="h-4 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-1000"
                  style={{ width: `${report.scores.negative}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key points */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg text-blue-700 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">🔵</span>
              正方核心论点
            </h3>
            <ul className="space-y-3">
              {report.keyPoints.positive.map((point, index) => (
                <li key={index} className="flex items-start gap-3 text-zinc-700">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg text-rose-700 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">🔴</span>
              反方核心论点
            </h3>
            <ul className="space-y-3">
              {report.keyPoints.negative.map((point, index) => (
                <li key={index} className="flex items-start gap-3 text-zinc-700">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Analysis */}
      <Card className="border-0">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-zinc-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">📝</span>
            辩论分析
          </h3>
          <p className="text-zinc-700 leading-relaxed">{report.analysis}</p>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-0 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardContent className="p-6">
          <h3 className="font-bold text-lg text-emerald-700 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">💡</span>
            行动建议
          </h3>
          <p className="text-zinc-700 leading-relaxed">{report.recommendation}</p>
        </CardContent>
      </Card>
    </div>
  )
}