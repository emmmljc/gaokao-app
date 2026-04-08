import Taro from '@tarojs/taro'
import { request } from '@/api/client'
import type { ChatConversationResponse, ChatHealth, ChatProfile, ChatStreamChunk, ChatStreamRequest } from '@/types/chat'

const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || '/api'

interface StreamHandlers {
  onChunk?: (chunk: ChatStreamChunk) => void;
  onError?: (chunk: ChatStreamChunk) => void;
  onDone?: (chunk: ChatStreamChunk) => void;
  signal?: AbortSignal;
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

    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
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
