import { useEffect, useRef, useState } from 'react'
import type { PortfolioContent } from '@nandoos/contracts'
import type { AssistantService } from '../domain/conversation'
import { useAssistantStore } from './assistant.store'

export function useAssistantConversation(service: AssistantService, content: PortfolioContent) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyVersion, setReplyVersion] = useState(0)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => { request.current?.abort(); request.current = null }, [])

  async function send(value: string) {
    const question = value.trim().slice(0, 1000)
    if (!question || request.current) return false
    const current = new AbortController()
    request.current = current
    useAssistantStore.getState().append({ role: 'user', text: question })
    setPending(true)
    setError(null)
    try {
      const reply = await service.ask(question, content, current.signal)
      if (request.current !== current || current.signal.aborted) return false
      useAssistantStore.getState().append({ role: 'assistant', ...reply })
      setReplyVersion((version) => version + 1)
    } catch (reason) {
      if (request.current === current && !current.signal.aborted) {
        setError('No he podido responder. Puedes volver a intentarlo; tu pregunta sigue en la conversación.')
      }
    } finally {
      if (request.current === current) { request.current = null; setPending(false) }
    }
    return true
  }

  function clear() {
    request.current?.abort()
    request.current = null
    setPending(false)
    setError(null)
    useAssistantStore.getState().clear()
  }

  return { send, clear, pending, error, replyVersion }
}
