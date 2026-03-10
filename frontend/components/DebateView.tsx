'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DebateRound {
  round: number
  positive: {
    argument: string
  }
  negative: {
    argument: string
  }
}

interface Debate {
  id: string
  topic: string
  status: string
  rounds: DebateRound[]
}

interface DebateViewProps {
  debate: Debate
}

export default function DebateView({ debate }: DebateViewProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-emerald-600 font-medium">辩论进行中...</span>
      </div>

      {/* Rounds */}
      <div className="space-y-4">
        {debate.rounds.map((round, index) => (
          <Card
            key={round.round}
            className="border-0 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl"
          >
            {/* Round header */}
            <button
              onClick={() => setExpandedRound(expandedRound === index ? null : index)}
              className="w-full px-6 py-4 bg-gradient-to-r from-zinc-50 to-zinc-100 flex items-center justify-between hover:from-zinc-100 hover:to-zinc-150 transition-colors"
            >
              <span className="font-bold text-zinc-800">
                第 {round.round} 轮辩论
              </span>
              <svg
                className={cn("w-5 h-5 text-zinc-400 transition-transform duration-300", expandedRound === index && "rotate-180")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Round content */}
            {(expandedRound === index || expandedRound === null) && (
              <div className="p-6 grid md:grid-cols-2 gap-6">
                {/* Positive side */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xl">🔵</span>
                    </div>
                    <h3 className="font-bold text-blue-700">正方观点</h3>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-zinc-700 leading-relaxed">
                    {round.positive.argument}
                  </div>
                </div>

                {/* Negative side */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                      <span className="text-xl">🔴</span>
                    </div>
                    <h3 className="font-bold text-rose-700">反方观点</h3>
                  </div>
                  <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl p-4 text-zinc-700 leading-relaxed">
                    {round.negative.argument}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}