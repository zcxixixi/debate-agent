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
    // TODO: Connect to real API
    // For now, simulate and redirect
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
    <div className="bg-white rounded-xl shadow-lg p-8">
      <form onSubmit={handleSubmit}>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          请输入您的辩论话题
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="例如：我是个学生，应该买车吗？"
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
          rows={3}
        />

        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="mt-4 w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '开始辩论...' : '🚀 开始辩论'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500 mb-3">💡 示例话题：</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => setTopic(example)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
