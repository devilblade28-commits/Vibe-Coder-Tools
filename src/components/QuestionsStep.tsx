import { Loader2, ArrowRight, ChevronLeft } from 'lucide-react'
import type { Question, Answer } from '../types/clarifier'
import { QuestionCard } from './QuestionCard'

interface QuestionsStepProps {
  projectIdea: string
  questions: Question[]
  answers: Answer[]
  onAnswer: (questionId: string, value: string | string[]) => void
  onSubmit: () => void
  onBack: () => void
  isLoading: boolean
  error: string | null
}

export function QuestionsStep({
  projectIdea,
  questions,
  answers,
  onAnswer,
  onSubmit,
  onBack,
  isLoading,
  error,
}: QuestionsStepProps) {
  const answeredCount = answers.filter((a) => {
    if (Array.isArray(a.value)) return a.value.length > 0
    return (a.value as string).trim().length > 0
  }).length

  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const canSubmit = answeredCount >= Math.ceil(questions.length * 0.6)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        <div className="bg-secondary/70 border border-border rounded-xl px-4 py-3 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your idea</p>
          <p className="text-sm text-foreground leading-relaxed line-clamp-2">{projectIdea}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {answeredCount} / {questions.length}
          </span>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3 mb-6">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            answer={answers.find((a) => a.questionId === q.id)}
            index={i}
            onChange={onAnswer}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-destructive text-sm text-center mb-4">{error}</p>
      )}

      {/* CTA */}
      <div className="sticky bottom-4">
        <div className="bg-background/80 backdrop-blur-sm rounded-2xl border border-border p-3 flex items-center gap-3">
          <div className="flex-1">
            {canSubmit ? (
              <p className="text-sm text-foreground font-medium">Ready to generate your spec!</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Answer {Math.ceil(questions.length * 0.6) - answeredCount} more question{Math.ceil(questions.length * 0.6) - answeredCount !== 1 ? 's' : ''} to continue
              </p>
            )}
          </div>
          <button
            onClick={onSubmit}
            disabled={!canSubmit || isLoading}
            className={[
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
              canSubmit && !isLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            ].join(' ')}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                Generate Spec
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
