'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-4">
      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green"></span>
        </span>
        <span className="text-accent-green font-medium">辩论进行中...</span>
      </div>

      {/* Rounds */}
      <div className="space-y-3">
        {debate.rounds.map((round, index) => (
          <Card
            key={round.round}
            className="border-0 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-soft-md"
          >
            {/* Round header */}
            <button
              onClick={() => setExpandedRound(expandedRound === index ? null : index)}
              className="w-full px-5 py-4 bg-white flex items-center justify-between hover:bg-black/[0.01] transition-colors"
            >
              <span className="text-sm font-medium text-primary">
                第 {round.round} 轮辩论
              </span>
              <svg
                className={cn("w-4 h-4 text-tertiary transition-transform duration-200", expandedRound === index && "rotate-180")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Round content */}
            {(expandedRound === index || expandedRound === null) && (
              <div className="p-5 pt-0 grid md:grid-cols-2 gap-4">
                {/* Positive side */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center">
                      <svg className="w-3 h-3 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-medium text-accent-blue">正方观点</h3>
                  </div>
                  <div className="bg-accent-blue/[0.03] rounded-xl p-3 text-xs text-secondary leading-relaxed">
                    {round.positive.argument}
                  </div>
                </div>

                {/* Negative side */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent-red/10 flex items-center justify-center">
                      <svg className="w-3 h-3 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-xs font-medium text-accent-red">反方观点</h3>
                  </div>
                  <div className="bg-accent-red/[0.03] rounded-xl p-3 text-xs text-secondary leading-relaxed">
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