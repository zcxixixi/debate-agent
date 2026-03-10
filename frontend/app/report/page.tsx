'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Mock report data
const mockReportData = {
  id: '1',
  topic: '我是个学生，应该买车吗？',
  winner: 'negative' as const,
  summary: '经过三轮激烈辩论，反方在本次辩论中表现更为出色。',
  analysis: '反方成功论证了学生在校期间购车面临的多重现实挑战，包括经济压力、时间成本和机会成本。反方的论点更加切合学生实际生活状况，并提出了替代方案（先考驾照，毕业后购车），具有更强的现实指导意义。',
  recommendation: '建议学生阶段优先投资于学业和个人成长，可先考取驾照为未来做准备，待毕业并有稳定收入后再考虑购车。如果确实有特殊用车需求，可以考虑租车或使用共享汽车等灵活方案。',
  scores: {
    positive: 72,
    negative: 85,
  },
  keyPoints: {
    positive: [
      '提高生活效率和便利性',
      '扩大机会范围（实习、活动）',
      '学习重要生活技能',
      '紧急情况机动能力',
    ],
    negative: [
      '经济负担沉重',
      '分散学业注意力',
      '校园公共交通便利',
      '资源投入回报率低',
    ],
  },
}

export default function ReportPage() {
  const router = useRouter()
  const winner = mockReportData.winner as 'positive' | 'negative'
  const winnerText = winner === 'positive' ? '正方' : '反方'
  const winnerColor = winner === 'positive' ? 'text-blue-600' : 'text-rose-600'
  const winnerBg = winner === 'positive' ? 'bg-blue-50' : 'bg-rose-50'
  const winnerGradient = winner === 'positive'
    ? 'from-blue-500 to-cyan-500'
    : 'from-rose-500 to-orange-500'

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Winner Banner */}
        <div className={cn("rounded-3xl p-8 text-center mb-8", winnerBg)}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg mb-4">
            <span className="text-4xl">{winner === 'positive' ? '🔵' : '🔴'}</span>
          </div>
          <h1 className={cn("text-3xl font-bold mb-2", winnerColor)}>
            {winnerText}获胜
          </h1>
          <p className="text-zinc-600 max-w-md mx-auto">{mockReportData.summary}</p>
        </div>

        {/* Score Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="border-0 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-blue-700">正方得分</span>
                <span className="text-3xl font-bold text-zinc-900">{mockReportData.scores.positive}</span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000"
                  style={{ width: `${mockReportData.scores.positive}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-rose-700">反方得分</span>
                <span className="text-3xl font-bold text-zinc-900">{mockReportData.scores.negative}</span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-1000"
                  style={{ width: `${mockReportData.scores.negative}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Points */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">🔵</span>
                正方核心论点
              </h3>
              <ul className="space-y-3">
                {mockReportData.keyPoints.positive.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-zinc-700">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardContent className="p-6">
              <h3 className="font-semibold text-rose-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">🔴</span>
                反方核心论点
              </h3>
              <ul className="space-y-3">
                {mockReportData.keyPoints.negative.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-zinc-700">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Analysis */}
        <Card className="border-0 mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">📝</span>
              辩论分析
            </h3>
            <p className="text-zinc-700 leading-relaxed">{mockReportData.analysis}</p>
          </CardContent>
        </Card>

        {/* Recommendation */}
        <Card className="border-0 overflow-hidden mb-12">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-6">
            <h3 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">💡</span>
              行动建议
            </h3>
            <p className="text-zinc-700 leading-relaxed">{mockReportData.recommendation}</p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/')}
            className="px-8"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            开始新辩论
          </Button>
        </div>
      </div>
    </div>
  )
}
