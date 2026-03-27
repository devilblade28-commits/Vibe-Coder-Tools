import { useState, useEffect } from 'react'
import { blink } from '../blink/client'

interface AuthState {
  user: unknown | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<unknown | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (!state.isLoading) setIsLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, isLoading, isAuthenticated: !!user }
}
