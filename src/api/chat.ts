import Taro, { getEnv } from '@tarojs/taro'
import { request } from '@/api/client'
import type { ChatConversationResponse, ChatHealth, ChatProfile, ChatStreamChunk, ChatStreamRequest } from '@/types/chat'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || '/api'

interface StreamHandlers {
  onChunk?: (chunk: ChatStreamChunk) => void;
  onError?: (chunk: ChatStreamChunk) => void;
  onDone?: (chunk: ChatStreamChunk) => void;
  signal?: AbortSignal;
}

/** Detect WeChat Mini Program environment */
function isWeapp(): boolean {
  return getEnv() === 'WEAPP'
}

interface ParsedSseEvent {
  event: string;
  data: string;
}

interface EmitResult {
  done: boolean;
}

function readAuthToken(): string | null {
  return Taro.getStorageSync('token') || null
}

function parseSseBlock(block: string): ParsedSseEvent | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)

  if (!lines.length) {
    return null
  }

  const eventLine = lines.find((line) => line.startsWith('event:'))
  const dataLines = lines.filter((line) => line.startsWith('data:'))
  if (!dataLines.length) {
    return null
  }

  return {
    event: eventLine ? eventLine.slice(6).trim() : 'message',
    data: dataLines.map((line) => line.slice(5).trimStart()).join('\n'),
  }
}

async function parseErrorResponse(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) {
    return response.status === 401 ? '登录已失效，请重新登录' : '聊天请求失败'
  }

  try {
    const body = JSON.parse(text) as { message?: string }
    return body.message || text
  } catch {
    return text
  }
}

function emitChunk(parsed: ParsedSseEvent, handlers: StreamHandlers): EmitResult {
  const chunk = JSON.parse(parsed.data) as ChatStreamChunk
  const eventType = chunk.event || parsed.event

  if (eventType === 'error') {
    handlers.onError?.(chunk)
    return { done: false }
  }
  if (eventType === 'done') {
    handlers.onDone?.(chunk)
    return { done: true }
  }
  handlers.onChunk?.(chunk)
  return { done: false }
}

/** Detect Capacitor native environment (Android/iOS) */
function isNativePlatform(): boolean {
  return typeof window !== 'undefined'
    && 'Capacitor' in window
    && !!(window as any).Capacitor?.isNativePlatform?.()
}

export const chatApi = {
  createConversation: (): Promise<ChatConversationResponse> => request('post', '/chat/new'),

  checkHealth: (): Promise<ChatHealth> => request('get', '/chat/health'),

  fetchChatProfile: (): Promise<ChatProfile> => request('get', '/chat/profile'),

  async streamChat(payload: ChatStreamRequest, handlers: StreamHandlers = {}): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    }

    const token = readAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const url = `${API_BASE_URL}/chat/stream`

    if (isWeapp()) {
      // WeChat Mini Program: use Taro.request with enableChunked
      return new Promise((resolve, reject) => {
        let buffer = ''
        let hasCompleted = false
        let hasMeaningfulEvent = false

        const task = Taro.request({
          url,
          method: 'POST',
          header: headers,
          data: payload,
          enableChunked: true,
          success: () => {
            // Stream completed
            if (!hasCompleted && !hasMeaningfulEvent) {
              reject(new Error('未收到有效回复'))
            } else {
              resolve()
            }
          },
          fail: (err) => {
            reject(new Error(err.errMsg || '请求失败'))
          },
        })

        // Handle chunked data
        task.onHeadersReceived?.(() => {
          // Headers received, stream started
        })

        // For WeChat Mini Program, we need to handle incremental data
        // Unfortunately, onChunkReceived is not available in all Taro versions
        // So we use a workaround: the response will be received in chunks via success callback
        // But this doesn't give us true streaming. For now, we'll handle it as buffered response.

        // Abort signal handling
        if (handlers.signal) {
          handlers.signal.addEventListener('abort', () => {
            task.abort?.()
          })
        }
      }).then(async () => {
        // Fallback: fetch the complete response and parse SSE blocks
        // This is not true streaming but works for WeChat Mini Program
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: handlers.signal,
        })

        if (!response.ok) {
          throw new Error(await parseErrorResponse(response))
        }

        const text = await response.text()
        const blocks = text.split(/\r?\n\r?\n/)

        for (const block of blocks) {
          const parsed = parseSseBlock(block)
          if (!parsed) continue
          const result = emitChunk(parsed, handlers)
          if (result.done) return
        }
      })
    }

    if (isNativePlatform()) {
      // Capacitor native: CapacitorHttp buffers the full response,
      // so ReadableStream won't stream progressively. Parse the
      // complete SSE text at once instead.
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: handlers.signal,
      })

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response))
      }

      const text = await response.text()
      const blocks = text.split(/\r?\n\r?\n/)

      for (const block of blocks) {
        const parsed = parseSseBlock(block)
        if (!parsed) continue
        const result = emitChunk(parsed, handlers)
        if (result.done) return
      }
      return
    }

    // Web: use streaming ReadableStream for real-time SSE
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: handlers.signal,
    })

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response))
    }

    if (!response.body) {
      throw new Error('未收到流式响应')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let hasCompleted = false
    let hasMeaningfulEvent = false

    const processBlock = (block: string): void => {
      const parsed = parseSseBlock(block)
      if (!parsed) {
        return
      }
      const result = emitChunk(parsed, handlers)
      hasMeaningfulEvent = true
      if (result.done) {
        hasCompleted = true
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })

        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          processBlock(block)
        }

        if (done) {
          if (buffer.trim()) {
            processBlock(buffer)
          }
          break
        }
      }
    } catch (error) {
      if (hasCompleted || hasMeaningfulEvent) {
        return
      }
      throw error
    } finally {
      reader.releaseLock()
    }
  },
}
