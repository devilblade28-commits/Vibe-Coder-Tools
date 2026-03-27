export type AnswerType = 'single' | 'multi' | 'text'

export interface Question {
  id: string
  text: string
  type: AnswerType
  options?: string[]
  placeholder?: string
}

export interface Answer {
  questionId: string
  value: string | string[]
}

export type AppStep = 'input' | 'questions' | 'summary'
