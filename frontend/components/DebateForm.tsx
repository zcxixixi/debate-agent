'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DebateForm() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return

    setLoading(true)
    setTimeout(() => {
      router.push('/debate')
    }, 500)
  }

  const examples = [
    '我是个学生，应该买车吗？',
    '人工智能会取代人类工作吗？',
    '远程办公好还是办公室办公好？',
    '应该买房还是租房？',
  ]

  return (
    <div className="bg-white rounded-2xl shadow-soft-lg p-8">
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-primary mb-3">
          请输入您的辩论话题
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="例如：我是个学生，应该买车吗？"
          className="w-full p-4 border border-black/[0.06] rounded-2xl text-sm text-primary placeholder:text-tertiary resize-none transition-all duration-200 hover:border-black/[0.1] focus:outline-none focus:border-black/20 focus:ring-4 focus:ring-black/[0.03]"
          rows={3}
        />

        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="mt-4 w-full py-3 px-6 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 disabled:bg-black/20 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? '开始辩论...' : '开始辩论'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-black/[0.04]">
        <p className="text-xs text-tertiary mb-3 text-center uppercase tracking-wider">示例话题</p>
        <div className="flex flex-wrap justify-center gap-2">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => setTopic(example)}
              className="px-4 py-2 text-xs bg-black/[0.02] text-secondary rounded-full hover:bg-black/[0.04] hover:text-primary transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}