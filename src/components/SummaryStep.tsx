import { useState } from 'react'
import { Copy, Check, RefreshCw, FileText, Loader2 } from 'lucide-react'

interface SummaryStepProps {
  summary: string
  isGenerating: boolean
  onReset: () => void
}

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-base font-bold text-foreground mt-5 mb-2 first:mt-0 flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full inline-block" />
          {line.replace('## ', '')}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-foreground mt-3 mb-1">
          {line.replace('### ', '')}
        </h3>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={key++} className="text-sm text-foreground/85 leading-relaxed ml-2 flex gap-2">
          <span className="text-primary mt-1.5 flex-shrink-0">•</span>
          <span>{line.replace(/^[-*] /, '')}</span>
        </li>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1" />)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={key++} className="text-sm font-semibold text-foreground">
          {line.replace(/\*\*/g, '')}
        </p>
      )
    } else if (line.trim()) {
      // Render inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      elements.push(
        <p key={key++} className="text-sm text-foreground/85 leading-relaxed">
          {parts.map((part, pi) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={pi} className="font-semibold text-foreground">{part.replace(/\*\*/g, '')}</strong>
              : part
          )}
        </p>
      )
    }
  }

  return elements
}

export function SummaryStep({ summary, isGenerating, onReset }: SummaryStepProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="text-primary" size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Project Spec</h2>
            <p className="text-xs text-muted-foreground">
              {isGenerating ? 'Generating your specification…' : 'Ready to hand off to a developer'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isGenerating && summary && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary border border-border transition-all duration-150"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary border border-border transition-all duration-150"
          >
            <RefreshCw size={12} />
            New
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-2xl p-5 min-h-[300px]">
        {isGenerating && !summary && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="animate-spin text-primary" size={28} />
            <p className="text-sm text-muted-foreground">Crafting your specification…</p>
          </div>
        )}

        {summary && (
          <div className="space-y-0.5">
            {renderMarkdown(summary)}
            {isGenerating && (
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-1 rounded-full" />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isGenerating && summary && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all duration-200"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied to clipboard!' : 'Copy specification'}
          </button>
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary border border-border active:scale-95 transition-all duration-200"
          >
            <RefreshCw size={16} />
            Start over
          </button>
        </div>
      )}
    </div>
  )
}
