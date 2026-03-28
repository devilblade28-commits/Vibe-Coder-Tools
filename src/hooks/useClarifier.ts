import { useState } from 'react'
import { blink } from '../blink/client'
import type { Question, Answer, AppStep } from '../types/clarifier'

const QUESTION_SYSTEM_PROMPT = `You are an expert software requirements analyst. Your job is to clarify a user's coding project idea by generating highly relevant, targeted questions.

Given a project idea, generate 6–8 clarifying questions that cover:
- Core scope and primary use case
- Target users and deployment context
- Tech stack preferences (frontend, backend, database)
- Authentication and user management needs
- Data model and key entities
- Design aesthetic and responsive needs
- Integrations and third-party services
- Performance and scalability expectations

Rules:
- Make questions specific and actionable (not generic)
- Tailor questions to the actual project described
- Each question should be concise (max 12 words)
- For single/multi choice, provide 3–5 realistic options
- Assign type: "single" (pick one), "multi" (pick multiple), or "text" (free input)
- The "text" type is for open-ended answers where options don't make sense`

const SUMMARY_SYSTEM_PROMPT = `You are an expert technical writer and software architect. Your job is to convert a set of clarifying Q&A pairs into a clear, actionable project specification.

Format the output as a well-structured markdown document with these sections:
## Project Overview
## Target Users
## Core Features
## Tech Stack
## Data Model (key entities)
## Auth & Permissions
## Design & UX Notes
## Out of Scope (this version)

Rules:
- Be specific and developer-ready
- Avoid vague language
- If an answer is "unsure", provide a sensible default recommendation
- Keep each section concise but complete
- The spec should be ready to hand to a developer or AI coding assistant`

export function useClarifier() {
  const [step, setStep] = useState<AppStep>('input')
  const [projectIdea, setProjectIdea] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [summary, setSummary] = useState('')
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateQuestions = async (idea: string) => {
    setError(null)
    setIsGeneratingQuestions(true)
    setProjectIdea(idea)

    try {
      const { object } = await blink.ai.generateObject({
        prompt: `${QUESTION_SYSTEM_PROMPT}\n\nProject idea: "${idea}"\n\nGenerate 6–8 tailored clarifying questions for this specific project.`,
        schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  type: { type: 'string', enum: ['single', 'multi', 'text'] },
                  options: { type: 'array', items: { type: 'string' } },
                  placeholder: { type: 'string' },
                },
                required: ['id', 'text', 'type'],
              },
            },
          },
          required: ['questions'],
        },
      })

      const typedObject = object as { questions: Question[] }
      setQuestions(typedObject.questions || [])
      setAnswers(typedObject.questions.map((q: Question) => ({
        questionId: q.id,
        value: q.type === 'multi' ? [] : '',
      })))
      setStep('questions')
    } catch (err: unknown) {
      const authError = err as { details?: { originalError?: { name?: string } }; message?: string }
      const isAuthError =
        authError?.details?.originalError?.name === 'BlinkAuthError' ||
        authError?.message?.includes('401') ||
        authError?.message?.includes('Unauthorized')
      if (isAuthError) {
        blink.auth.login(window.location.href)
        return
      }
      setError('Failed to generate questions. Please try again.')
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  const generateSummary = async () => {
    setError(null)
    setIsGeneratingSummary(true)

    const qaText = questions
      .map((q) => {
        const answer = answers.find((a) => a.questionId === q.id)
        const value = Array.isArray(answer?.value)
          ? (answer?.value as string[]).join(', ')
          : (answer?.value as string) || 'Not specified'
        return `Q: ${q.text}\nA: ${value}`
      })
      .join('\n\n')

    // Switch to summary step immediately so user sees streaming content
    setStep('summary')
    setSummary('')

    try {
      await blink.ai.streamText(
        {
          prompt: `${SUMMARY_SYSTEM_PROMPT}\n\nProject idea: "${projectIdea}"\n\nClarifying answers:\n\n${qaText}\n\nGenerate a complete project specification.`,
        },
        (chunk) => {
          setSummary((prev) => prev + chunk)
        }
      )
    } catch (err: unknown) {
      const authError = err as { details?: { originalError?: { name?: string } }; message?: string }
      const isAuthError =
        authError?.details?.originalError?.name === 'BlinkAuthError' ||
        authError?.message?.includes('401') ||
        authError?.message?.includes('Unauthorized')
      if (isAuthError) {
        blink.auth.login(window.location.href)
        return
      }
      setError('Failed to generate summary. Please try again.')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) =>
      prev.map((a) => (a.questionId === questionId ? { ...a, value } : a))
    )
  }

  const reset = () => {
    setStep('input')
    setProjectIdea('')
    setQuestions([])
    setAnswers([])
    setSummary('')
    setError(null)
  }

  return {
    step,
    projectIdea,
    questions,
    answers,
    summary,
    isGeneratingQuestions,
    isGeneratingSummary,
    error,
    generateQuestions,
    generateSummary,
    setAnswer,
    reset,
  }
}
