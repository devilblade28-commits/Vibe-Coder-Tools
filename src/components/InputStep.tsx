import { useState } from 'react'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'

const EXAMPLE_IDEAS = [
  'A task manager for remote dev teams with Slack integration',
  'A recipe finder app that uses ingredients you already have',
  'A SaaS dashboard for monitoring website uptime and alerts',
  'A mobile-first habit tracker with streak analytics',
]

interface InputStepProps {
  onSubmit: (idea: string) => void
  isLoading: boolean
  error: string | null
}

export function InputStep({ onSubmit, isLoading, error }: InputStepProps) {
  const [value, setValue] = useState('')

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed.length < 10) return
    onSubmit(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <Sparkles className="text-primary" size={28} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Expectation Clarifier
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Describe your project idea. I'll ask the right questions to generate a precise spec — no surprises when you start building.
        </p>
      </div>

      {/* Textarea */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-4">
        <textarea
          className="w-full px-5 pt-5 pb-3 text-base text-foreground bg-transparent resize-none outline-none placeholder:text-muted-foreground min-h-[120px]"
          placeholder="e.g. A task manager for remote dev teams with Slack integration and time tracking..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          disabled={isLoading}
        />
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <span className="text-xs text-muted-foreground">
            {value.length > 0 ? `${value.length} chars` : '⌘ + Enter to submit'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={value.trim().length < 10 || isLoading}
            className={[
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
              value.trim().length >= 10 && !isLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            ].join(' ')}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Thinking…
              </>
            ) : (
              <>
                Start Clarifying
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-destructive text-sm text-center mb-4">{error}</p>
      )}

      {/* Examples */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
          Try an example
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EXAMPLE_IDEAS.map((idea) => (
            <button
              key={idea}
              onClick={() => setValue(idea)}
              disabled={isLoading}
              className="text-left px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground hover:border-primary/50 hover:bg-secondary/50 transition-all duration-150 active:scale-[0.98]"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
