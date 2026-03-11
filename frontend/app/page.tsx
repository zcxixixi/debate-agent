'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  fadeScale,
  fadeUp,
  softTransition,
  staggerContainer,
  viewportOnce,
} from '@/lib/motion'
import { startDebate } from '@/lib/api'
import { cn } from '@/lib/utils'

const examples = [
  '租房还是买房？',
  '远程办公还是坐班？',
  '黄金和比特币哪个更有价值？',
  '人工智能会创造还是消灭更多工作？',
  '过程正义还是结果正义更重要？',
  '个人自由和公共安全，哪个应优先？',
]

const featureCards = [
  {
    title: '即时分析',
    desc: '正反双方按生成顺序直接铺开，不等全部完成。',
    icon: '⚡',
  },
  {
    title: '深度辩论',
    desc: '多轮追问与反驳，让论证真的往前推进。',
    icon: '↺',
  },
  {
    title: '判决建议',
    desc: '最后给出总结、胜方判断与下一步建议。',
    icon: '✦',
  },
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
    <div className="page-shell min-h-screen">
      <div className="ambient-orb ambient-orb-blue" />
      <div className="ambient-orb ambient-orb-gold" />
      <div className="ambient-orb ambient-orb-violet" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <motion.section
          className="w-full max-w-6xl"
          variants={staggerContainer(0.12, 0.08)}
          initial="hidden"
          animate="show"
        >
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div variants={staggerContainer(0.14, 0.1)}>
              <motion.div
                variants={fadeUp(22)}
                className="hero-badge inline-flex items-center gap-3 rounded-full px-4 py-2 text-xs font-medium text-primary/80"
              >
                <span className="h-2 w-2 rounded-full bg-accent-blue shadow-[0_0_18px_rgba(0,113,227,0.45)]" />
                Real-time Editorial Debate Interface
              </motion.div>

              <motion.h1
                variants={fadeUp(28)}
                className="hero-title mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.04em] md:text-7xl"
              >
                辩论代理
              </motion.h1>

              <motion.p
                variants={fadeUp(30)}
                className="mt-8 max-w-2xl text-lg leading-8 text-secondary md:text-xl"
              >
                输入你的真实犹豫，让 AI 以正反双方连续推进论证，再由裁判给出判断与行动建议。
                不是一个“问答框”，而是一场有节奏、有层次的推演。
              </motion.p>

              <motion.div
                variants={fadeUp(24)}
                className="mt-10 flex flex-wrap gap-3"
              >
                {['实时流式生成', '多轮交锋', '结构化结论'].map((item) => (
                  <div
                    key={item}
                    className="hero-badge rounded-full px-4 py-2 text-sm text-secondary"
                  >
                    {item}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              variants={fadeScale(0.94)}
              transition={softTransition}
              whileHover={{ y: -8, rotateX: 2, rotateY: -2 }}
              className="w-full"
            >
              <Card className="glass-highlight border-0 shadow-soft-xl">
                <CardContent className="p-8 md:p-9">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                      <p className="section-kicker text-[11px] text-tertiary">
                        Start a Session
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary">
                        发起一次更像产品的 AI 辩论
                      </h2>
                    </div>
                    <div className="hidden rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs text-secondary md:block">
                      Live reasoning
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="mb-3 block text-sm font-medium text-primary">
                        请输入您想探讨的话题
                      </label>
                      <Textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="例如：我是个学生，应该买车吗？"
                        className="min-h-[132px] resize-none border-black/[0.06] bg-white/85 focus:border-accent-blue/30 focus:ring-accent-blue/10"
                      />
                    </div>

                    <motion.div
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.995 }}
                      transition={softTransition}
                    >
                      <Button
                        type="submit"
                        variant="default"
                        size="lg"
                        className="w-full text-base"
                        disabled={loading || !topic.trim()}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            正在启动辩论...
                          </span>
                        ) : (
                          '开始辩论'
                        )}
                      </Button>
                    </motion.div>

                    {error ? (
                      <p className="text-sm text-accent-red">{error}</p>
                    ) : null}
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            variants={staggerContainer(0.08, 0.2)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="mt-10"
          >
            <motion.p
              variants={fadeUp(18)}
              className="section-kicker text-center text-xs text-tertiary"
            >
              或试试这些话题
            </motion.p>
            <motion.div
              variants={fadeUp(20)}
              className="mt-4 flex flex-wrap justify-center gap-3"
            >
              {examples.map((example) => (
                <motion.button
                  key={example}
                  onClick={() => setTopic(example)}
                  whileHover={{ y: -4, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  transition={softTransition}
                  className={cn(
                    'rounded-full border px-5 py-2.5 text-sm text-secondary shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-md transition-all duration-300',
                    'border-black/[0.06] bg-white/72 hover:border-black/[0.12] hover:bg-white hover:text-primary',
                    topic === example && 'border-accent-blue/20 bg-accent-blue/[0.08] text-primary shadow-[0_14px_32px_rgba(29,78,216,0.12)]'
                  )}
                >
                  {example}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.1, 0.16)}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            className="mt-20 grid w-full grid-cols-1 gap-6 md:grid-cols-3"
          >
            {featureCards.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeUp(28)}
                whileHover={{ y: -10, scale: 1.01 }}
                transition={softTransition}
                className="feature-tile rounded-[28px] border border-white/65 bg-white/58 p-8 backdrop-blur-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/[0.04] text-xl text-primary">
                    {feature.icon}
                  </div>
                  <span className="text-xs text-tertiary">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-primary">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-secondary">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </main>

      <footer className="relative z-10 py-8 text-center">
        <p className="text-xs text-tertiary/70">AI 驱动的决策助手</p>
      </footer>
    </div>
  )
}
