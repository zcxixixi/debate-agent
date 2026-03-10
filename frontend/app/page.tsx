'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { startDebate } from '@/lib/api'
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
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return

    try {
      setLoading(true)
      setError(null)

      const debate = await startDebate({
        topic: topic.trim(),
      })

      router.push(`/debate?id=${encodeURIComponent(debate.debate_id)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动辩论失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-10 max-w-xl animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-gradient">
            辩论代理
          </h1>
          <p className="text-lg text-secondary leading-relaxed max-w-md mx-auto">
            输入困惑，让 AI 从正反两面深入分析，帮助您做出更明智的决策
          </p>
        </div>

        {/* Input Card */}
        <div className="w-full max-w-lg animate-fade-in" style={{ animationDelay: '100ms' }}>
          <Card className="border-0 shadow-soft-lg">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-primary mb-3">
                    请输入您想探讨的话题
                  </label>
                  <Textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="例如：我是个学生，应该买车吗？"
                    className="min-h-[120px]"
                  />
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full"
                  disabled={loading || !topic.trim()}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      正在启动
                    </span>
                  ) : (
                    '开始辩论'
                  )}
                </Button>

                {error ? (
                  <p className="text-sm text-accent-red">{error}</p>
                ) : null}
              </form>
            </CardContent>
          </Card>

          {/* Example Topics */}
          <div className="mt-6 space-y-3">
            <p className="text-xs text-tertiary text-center uppercase tracking-wider">或试试这些话题</p>
            <div className="flex flex-wrap justify-center gap-2">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setTopic(example)}
                  className={cn(
                    "px-4 py-2 text-sm rounded-full transition-all duration-200",
                    "bg-white border border-black/[0.04] text-secondary",
                    "hover:bg-black/[0.02] hover:border-black/[0.08] hover:text-primary",
                    topic === example && "bg-primary/[0.05] border-primary/20 text-primary"
                  )}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full animate-fade-in" style={{ animationDelay: '200ms' }}>
          {[
            { title: '即时分析', desc: 'AI 实时生成正反观点' },
            { title: '深度辩论', desc: '多轮论证全面覆盖' },
            { title: '公正判决', desc: '客观分析给出建议' },
          ].map((feature, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-white/50 border border-black/[0.02]">
              <h3 className="font-medium text-primary mb-1">{feature.title}</h3>
              <p className="text-sm text-secondary">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-tertiary">AI 驱动的决策助手</p>
      </footer>
    </div>
  )
}
