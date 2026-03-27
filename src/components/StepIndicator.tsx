import { Check } from 'lucide-react'
import type { AppStep } from '../types/clarifier'

interface StepIndicatorProps {
  currentStep: AppStep
}

const steps: { key: AppStep; label: string }[] = [
  { key: 'input', label: 'Describe' },
  { key: 'questions', label: 'Clarify' },
  { key: 'summary', label: 'Spec' },
]

const stepOrder: AppStep[] = ['input', 'questions', 'summary']

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIndex = stepOrder.indexOf(currentStep)

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isActive = index === currentIndex

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isActive
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {isCompleted ? <Check size={14} /> : <span>{index + 1}</span>}
              </div>
              <span
                className={[
                  'text-xs font-medium transition-colors duration-300',
                  isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={[
                  'h-0.5 w-16 mx-1 mb-5 transition-all duration-500',
                  index < currentIndex ? 'bg-primary' : 'bg-border',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
