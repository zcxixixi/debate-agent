'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { SparklesCore } from '@/components/ui/sparkles'
import { TextGenerateEffect } from '@/components/ui/text-generate'
import { GradientBackground } from '@/components/ui/gradient-bg'
import { AnimatedBorder } from '@/components/ui/animated-border'
import { cn } from '@/lib/utils'

const examples = [
  '我是个学生，应该买车吗？',
  '人工智能会取代人类工作吗？',
  '远程办公好还是办公室办公好？',
  '应该买房还是租房？',
]

export default function Home() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setTimeout(() => {
      router.push('/debate')
    }, 800)
  }

  return (
    <div className="min-h-screen relative">
      {/* Background sparkles */}
      <SparklesCore
        id="tsparticles"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={30}
        className="absolute inset-0 w-full h-full"
        particleColor="#a855f7"
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            AI 驱动的决策助手
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent">
              辩论代理
            </span>
          </h1>

          <p className="text-lg text-zinc-500 leading-relaxed">
            <TextGenerateEffect words="输入您的困惑，让 AI 从正反两面深入分析，帮助您做出更明智的决策" />
          </p>
        </div>

        {/* Input Card */}
        <div className="w-full max-w-xl">
          <AnimatedBorder containerClassName="mb-8">
            <Card className="border-0 shadow-2xl">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-3">
                      请输入您想探讨的话题
                    </label>
                    <Textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="例如：我是个学生，应该买车吗？"
                      className="min-h-[120px] text-base"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="gradient"
                    size="xl"
                    className="w-full"
                    disabled={loading || !topic.trim()}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        正在启动...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        开始辩论
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </AnimatedBorder>

          {/* Example Topics */}
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 text-center">💡 或试试这些话题</p>
            <div className="flex flex-wrap justify-center gap-2">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setTopic(example)}
                  className={cn(
                    "px-4 py-2 text-sm rounded-full transition-all duration-300",
                    "bg-white/80 border border-zinc-200/50 text-zinc-600",
                    "hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700",
                    "hover:shadow-lg hover:shadow-violet-100/50",
                    topic === example && "bg-violet-100 border-violet-300 text-violet-700"
                  )}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {[
            { icon: '⚡', title: '即时分析', desc: 'AI 实时生成正反观点' },
            { icon: '🎯', title: '深度辩论', desc: '多轮论证全面覆盖' },
            { icon: '⚖️', title: '公正判决', desc: '客观分析给出建议' },
          ].map((feature, i) => (
            <Card key={i} className="border-0 text-center p-6 hover:scale-105 transition-transform duration-300">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-zinc-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-zinc-500">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
