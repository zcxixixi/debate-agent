'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
  compact?: boolean
}

export function MarkdownContent({
  content,
  className,
  compact = false,
}: MarkdownContentProps) {
  if (!content.trim()) {
    return null
  }

  return (
    <div
      className={cn(
        'text-primary',
        compact ? 'space-y-2 text-sm leading-7' : 'space-y-3 text-[15px] leading-8',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ className: headingClassName, ...props }) => (
            <h1 className={cn('text-lg font-semibold tracking-tight', headingClassName)} {...props} />
          ),
          h2: ({ className: headingClassName, ...props }) => (
            <h2 className={cn('text-base font-semibold tracking-tight', headingClassName)} {...props} />
          ),
          h3: ({ className: headingClassName, ...props }) => (
            <h3 className={cn('text-sm font-semibold uppercase tracking-[0.08em] text-secondary', headingClassName)} {...props} />
          ),
          p: ({ className: paragraphClassName, ...props }) => (
            <p className={cn('text-inherit', paragraphClassName)} {...props} />
          ),
          ul: ({ className: listClassName, ...props }) => (
            <ul className={cn('list-disc space-y-1.5 pl-5 text-inherit', listClassName)} {...props} />
          ),
          ol: ({ className: listClassName, ...props }) => (
            <ol className={cn('list-decimal space-y-1.5 pl-5 text-inherit', listClassName)} {...props} />
          ),
          li: ({ className: itemClassName, ...props }) => (
            <li className={cn('pl-1 marker:text-tertiary', itemClassName)} {...props} />
          ),
          strong: ({ className: strongClassName, ...props }) => (
            <strong className={cn('font-semibold text-primary', strongClassName)} {...props} />
          ),
          em: ({ className: emClassName, ...props }) => (
            <em className={cn('italic text-primary', emClassName)} {...props} />
          ),
          blockquote: ({ className: quoteClassName, ...props }) => (
            <blockquote
              className={cn(
                'border-l-2 border-black/10 pl-4 text-secondary',
                quoteClassName
              )}
              {...props}
            />
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !String(codeClassName ?? '').includes('language-')

            if (isInline) {
              return (
                <code
                  className={cn(
                    'rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[0.9em] text-primary',
                    codeClassName
                  )}
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <code className={cn('font-mono text-[0.92em]', codeClassName)} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ className: preClassName, ...props }) => (
            <pre
              className={cn(
                'overflow-x-auto rounded-2xl bg-black/[0.04] p-4 text-sm leading-7 text-primary',
                preClassName
              )}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
