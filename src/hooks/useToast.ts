import { useState, useCallback } from 'react'

export interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  variant?: 'default' | 'destructive' | 'success'
}

export interface ToastState {
  id: string
  title?: string
  description?: string
  variant: 'default' | 'destructive' | 'success'
  duration: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastState = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
      duration: options.duration || 4000,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, newToast.duration)

    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    return toast({ ...options, variant: 'success' })
  }, [toast])

  const error = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    return toast({ ...options, variant: 'destructive' })
  }, [toast])

  return {
    toasts,
    toast,
    success,
    error,
    dismiss,
  }
}
