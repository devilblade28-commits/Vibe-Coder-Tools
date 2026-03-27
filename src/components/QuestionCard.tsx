import { Check } from 'lucide-react'
import type { Question, Answer } from '../types/clarifier'

interface QuestionCardProps {
  question: Question
  answer: Answer | undefined
  index: number
  onChange: (questionId: string, value: string | string[]) => void
}

export function QuestionCard({ question, answer, index, onChange }: QuestionCardProps) {
  const value = answer?.value ?? (question.type === 'multi' ? [] : '')

  const handleSingle = (option: string) => {
    onChange(question.id, option)
  }

  const handleMulti = (option: string) => {
    const current = Array.isArray(value) ? value : []
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option]
    onChange(question.id, next)
  }

  const handleText = (text: string) => {
    onChange(question.id, text)
  }

  const isAnswered =
    question.type === 'text'
      ? (value as string).trim().length > 0
      : question.type === 'multi'
      ? (value as string[]).length > 0
      : (value as string).length > 0

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className={[
            'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 transition-all duration-200',
            isAnswered
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground',
          ].join(' ')}
        >
          {isAnswered ? <Check size={12} /> : index + 1}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-snug">{question.text}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {question.type === 'single' ? 'Choose one' : question.type === 'multi' ? 'Choose all that apply' : 'Free text'}
          </p>
        </div>
      </div>

      {/* Single choice */}
      {question.type === 'single' && question.options && (
        <div className="flex flex-wrap gap-2 ml-9">
          {question.options.map((option) => (
            <button
              key={option}
              onClick={() => handleSingle(option)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95',
                value === option
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary border border-border',
              ].join(' ')}
            >
              {option}
            </button>
          ))}
          <button
            onClick={() => handleSingle("I'm not sure yet")}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 italic',
              value === "I'm not sure yet"
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground border border-dashed border-border',
            ].join(' ')}
          >
            Not sure yet
          </button>
        </div>
      )}

      {/* Multi choice */}
      {question.type === 'multi' && question.options && (
        <div className="flex flex-wrap gap-2 ml-9">
          {question.options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option)
            return (
              <button
                key={option}
                onClick={() => handleMulti(option)}
                className={[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 flex items-center gap-1.5',
                  selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary border border-border',
                ].join(' ')}
              >
                {selected && <Check size={12} />}
                {option}
              </button>
            )
          })}
        </div>
      )}

      {/* Text input */}
      {question.type === 'text' && (
        <div className="ml-9">
          <textarea
            className="w-full px-3 py-2.5 rounded-xl text-sm bg-secondary border border-border text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-150"
            placeholder={question.placeholder || 'Type your answer…'}
            value={value as string}
            onChange={(e) => handleText(e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  )
}
