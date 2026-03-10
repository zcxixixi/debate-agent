'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Mock debate data
const mockDebateData = {
  id: '1',
  topic: '我是个学生，应该买车吗？',
  status: 'in_progress',
  rounds: [
    {
      round: 1,
      positive: {
        argument: '作为学生购买车辆可以极大地提高生活效率和便利性。首先，拥有车辆意味着您可以更灵活地安排时间，不必依赖公共交通的时刻表。这对于需要兼顾学业、兼职和社交活动的学生来说尤为重要。其次，车辆可以扩大您的生活半径，让您能够探索更多机会，比如远距离的实习或参加各种活动。',
      },
      negative: {
        argument: '作为学生购车面临诸多现实问题。首先是经济压力，除了购车本身的费用，还有保险、燃油、停车、维护等持续开支，这对大多数学生来说是沉重的负担。其次，车辆会分散注意力，可能影响学业表现。校园周边通常有完善的公共交通系统，购车并非必需品。',
      },
    },
    {
      round: 2,
      positive: {
        argument: '经济压力可以通过选择二手车或经济型车辆来缓解。一辆可靠的经济型车辆月均使用成本可以控制在合理范围内。更重要的是，拥有车辆可能为学生带来兼职或实习机会，实际上可能增加收入来源。此外，驾驶技能本身就是一项重要的生活技能，尽早掌握有助于未来发展。',
      },
      negative: {
        argument: '即使是经济型车辆，对没有稳定收入的学生来说仍然是巨大开支。更关键的是，学生在校期间应该专注于学业和个人成长，车辆带来的"便利"往往变成了负担——交通拥堵、找车位、车辆故障等问题会消耗大量时间精力。这些时间和精力投入在学习和自我提升上，长远回报更高。',
      },
    },
    {
      round: 3,
      positive: {
        argument: '时间管理是成年人的必备技能，拥有车辆恰恰能帮助学生学会规划和管理。实际生活中，很多学生在毕业后才发现没有驾驶经验成为就业障碍。在校期间有相对灵活的时间来学习驾驶和适应用车生活，比工作后再学习更加从容。而且车辆在紧急情况下能提供重要的机动能力。',
      },
      negative: {
        argument: '学习驾驶并不等于需要立即购车。学生可以先考取驾照，在毕业有稳定工作后再购车。校园生活本身就是学生为未来积累知识和社会资本的黄金时期，过早承担成人的责任会压缩这一宝贵的成长空间。与其将有限资源投入到车辆上，不如投资于教育、旅行、技能培训等对个人成长更有价值的领域。',
      },
    },
  ],
}

export default function DebatePage() {
  const [activeRound, setActiveRound] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setActiveRound((prev) => (prev + 1) % mockDebateData.rounds.length)
        setIsAnimating(false)
      }, 300)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  const currentRound = mockDebateData.rounds[activeRound]

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            辩论进行中
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-3">
            {mockDebateData.topic}
          </h1>
          <p className="text-zinc-500">
            共 {mockDebateData.rounds.length} 轮辩论 · AI 实时分析中
          </p>
        </div>

        {/* Round Indicators */}
        <div className="flex justify-center gap-3 mb-10">
          {mockDebateData.rounds.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveRound(index)}
              className={cn(
                "w-12 h-1.5 rounded-full transition-all duration-300",
                activeRound === index
                  ? "bg-zinc-900 w-16"
                  : "bg-zinc-200 hover:bg-zinc-300"
              )}
            />
          ))}
        </div>

        {/* Debate Cards */}
        <div className={cn(
          "grid md:grid-cols-2 gap-6 transition-opacity duration-300",
          isAnimating && "opacity-50"
        )}>
          {/* Positive Card */}
          <Card className="border-0 overflow-hidden group">
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xl">🔵</span>
                </div>
                <div>
                  <CardTitle className="text-lg text-blue-700">正方观点</CardTitle>
                  <p className="text-sm text-zinc-400">Round {activeRound + 1}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-700 leading-relaxed text-base">
                {currentRound.positive.argument}
              </p>
            </CardContent>
          </Card>

          {/* Negative Card */}
          <Card className="border-0 overflow-hidden group">
            <div className="h-1.5 bg-gradient-to-r from-rose-500 to-orange-500" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <span className="text-xl">🔴</span>
                </div>
                <div>
                  <CardTitle className="text-lg text-rose-700">反方观点</CardTitle>
                  <p className="text-sm text-zinc-400">Round {activeRound + 1}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-700 leading-relaxed text-base">
                {currentRound.negative.argument}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* All Rounds Summary */}
        <div className="mt-12 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 text-center">辩论历程</h2>
          <div className="grid gap-4">
            {mockDebateData.rounds.map((round, index) => (
              <Card
                key={index}
                className={cn(
                  "border-0 cursor-pointer transition-all duration-300",
                  activeRound === index ? "ring-2 ring-zinc-900 shadow-xl" : "opacity-70 hover:opacity-100"
                )}
                onClick={() => setActiveRound(index)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-zinc-900">第 {round.round} 轮</span>
                    <span className="text-xs text-zinc-400 px-2 py-1 bg-zinc-100 rounded-full">
                      {round.positive.argument.length + round.negative.argument.length} 字
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-zinc-600">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 font-medium shrink-0">正方</span>
                      <span className="line-clamp-2">{round.positive.argument.slice(0, 50)}...</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-rose-500 font-medium shrink-0">反方</span>
                      <span className="line-clamp-2">{round.negative.argument.slice(0, 50)}...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button
            variant="gradient"
            size="xl"
            onClick={() => router.push('/report')}
            className="shadow-xl shadow-violet-500/20"
          >
            查看最终判决
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}