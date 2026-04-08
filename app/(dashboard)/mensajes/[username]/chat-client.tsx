'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Message } from '@/lib/messages'

export function ChatClient({
  initialMessages,
  currentUserId,
  otherUsername,
}: {
  initialMessages: Message[]
  currentUserId: number
  otherUsername: string
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh())
    }, 30000)
    return () => clearInterval(interval)
  }, [router])

  // Sync when server re-renders (router.refresh causes re-mount with new initialMessages)
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = content.trim()
    if (!text) return
    setSending(true)
    try {
      const res = await fetch(`/api/messages/${otherUsername}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        const msg = await res.json() as Message
        setMessages(prev => [...prev, msg])
        setContent('')
      }
    } finally {
      setSending(false)
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  }

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const date = new Date(msg.created_at).toDateString()
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) {
      last.msgs.push(msg)
    } else {
      grouped.push({ date, msgs: [msg] })
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No hay mensajes todavía. ¡Sé el primero en escribir!
          </p>
        )}

        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground px-2">
                {formatDate(msgs[0].created_at)}
              </span>
              <div className="flex-1 border-t" />
            </div>
            <div className="space-y-2">
              {msgs.map(msg => {
                const isMe = msg.from_user_id === currentUserId
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2 text-sm ${
                        isMe
                          ? 'bg-orange-500 text-white rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-0.5 ${isMe ? 'text-orange-100' : 'text-muted-foreground'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Escribe un mensaje..."
          maxLength={1000}
          className="flex-1 rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
