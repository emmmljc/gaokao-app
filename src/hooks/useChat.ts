import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { chatApi } from '@/api/chat'
import type { ChatHealth, ChatIntermediateStep, ChatMessage, ChatStreamChunk } from '@/types/chat'

interface UseChatResult {
  conversations: Array<{ id: string; title: string; updatedAt: number; messageCount: number }>;
  activeConversationId: string | null;
  messages: ChatMessage[];
  sending: boolean;
  health: ChatHealth | null;
  streamError: string | null;
  exampleQuestions: string[];
  sendMessage: (content: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  switchConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  stopStreaming: () => void;
}

interface StoredConversation {
  id: string;
  convUid: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const CHAT_STORAGE_KEY = 'gaokao:chat:sessions'

const EXAMPLE_QUESTIONS = [
  '请分析南京大学近三年物理类专业组最低分变化趋势，并生成图表。',
  '对比东南大学和南京航空航天大学近五年物理类投档分数走势。',
  '如果我是江苏物理类考生，位次 12000，有哪些 211 院校专业组值得重点关注？',
  '帮我总结一下苏州大学近三年历史类招生变化，并给出简短结论。',
]

function buildMessage(role: ChatMessage['role'], content: string, status: ChatMessage['status']): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random()}`,
    role,
    content,
    intermediateSteps: role === 'assistant' ? [] : undefined,
    status,
    createdAt: Date.now(),
  }
}

function createConversationRecord(convUid = ''): StoredConversation {
  return {
    id: `${Date.now()}-${Math.random()}`,
    convUid,
    title: '新对话',
    updatedAt: Date.now(),
    messages: [],
  }
}

function readStoredConversations(): StoredConversation[] {
  try {
    const raw = Taro.getStorageSync(CHAT_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is StoredConversation => {
      return typeof item === 'object'
        && item !== null
        && typeof (item as StoredConversation).id === 'string'
        && typeof (item as StoredConversation).convUid === 'string'
        && typeof (item as StoredConversation).title === 'string'
        && typeof (item as StoredConversation).updatedAt === 'number'
        && Array.isArray((item as StoredConversation).messages)
    })
  } catch {
    return []
  }
}

function saveStoredConversations(conversations: StoredConversation[]) {
  Taro.setStorageSync(CHAT_STORAGE_KEY, JSON.stringify(conversations))
}

function buildConversationTitle(messages: ChatMessage[], fallbackTitle: string): string {
  const firstUserMessage = messages.find((message) => message.role === 'user' && message.content.trim().length > 0)
  if (!firstUserMessage) return fallbackTitle
  const normalized = firstUserMessage.content.trim().replace(/\s+/g, ' ')
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized
}

function containsProfileKeywords(text: string): boolean {
  const directKeywords = ['我', '我的分数', '我的位次', '我的成绩', '我的排名', '我的情况', '我能', '我可以上', '我能不能上', '我能报', '我可以报', '适合我', '我可以', '推荐给我', '帮我推荐', '根据我的情况', '结合我的情况', '我是', '我考了', '我想', '我该', '我该怎么报', '我适合学什么', '我适合什么专业', '我适合哪些学校']
  if (directKeywords.some((keyword) => text.includes(keyword))) return true
  const selfMarkers = ['我', '本人', '自己']
  const profileTopics = ['分数', '成绩', '位次', '排名', '高考', '志愿', '填报', '报考', '学校', '院校', '大学', '专业', '录取', '推荐', '适合', '冲', '稳', '保', '能上', '能报']
  return selfMarkers.some((marker) => text.includes(marker)) && profileTopics.some((topic) => text.includes(topic))
}

let cachedProfileContext: string | null = null

async function buildProfileContext(): Promise<string> {
  if (cachedProfileContext !== null) return cachedProfileContext
  try {
    const profile = await chatApi.fetchChatProfile()
    if (!profile || !profile.totalScore) {
      cachedProfileContext = ''
      return ''
    }
    const parts = [
      '[系统补充] 以下是用户已保存的考生档案。只要用户问题与其本人情况、分数位次、志愿填报、院校专业推荐、录取概率、适合方向有关，请优先基于这份档案回答。',
      `[考生档案] 省份: ${profile.province}`,
      `考试年份: ${profile.examYear}`,
      `科类: ${profile.subjectType}`,
      `总分: ${profile.totalScore}`,
      `位次: ${profile.rankPosition}`,
    ]
    if (profile.preferredCities?.length) parts.push(`意向城市: ${profile.preferredCities.join('、')}`)
    if (profile.preferredMajors?.length) parts.push(`意向专业: ${profile.preferredMajors.join('、')}`)
    if (profile.schoolLevelRange) parts.push(`目标院校层次: ${profile.schoolLevelRange}`)
    cachedProfileContext = parts.join('，') + '\n\n'
    return cachedProfileContext
  } catch {
    cachedProfileContext = ''
    return ''
  }
}

function updateMessage(messages: ChatMessage[], messageId: string, updater: (message: ChatMessage) => ChatMessage): ChatMessage[] {
  return messages.map((message) => (message.id === messageId ? updater(message) : message))
}

function mergeAssistantContent(currentContent: string, nextChunkContent: string): string {
  if (!currentContent) return nextChunkContent
  if (!nextChunkContent) return currentContent
  if (nextChunkContent.startsWith(currentContent)) return nextChunkContent
  if (currentContent.startsWith(nextChunkContent) || currentContent.includes(nextChunkContent)) return currentContent
  return `${currentContent}${nextChunkContent}`
}

function mergeIntermediateStep(steps: ChatIntermediateStep[], chunk: ChatStreamChunk): ChatIntermediateStep[] {
  const stepId = chunk.stepId ?? ''
  if (!stepId) return steps
  const existingIndex = steps.findIndex((step) => step.id === stepId)
  if (existingIndex >= 0) {
    return steps.map((step, index) => {
      if (index !== existingIndex) return step
      return { ...step, title: chunk.stepTitle ?? step.title, content: chunk.content ? step.content + chunk.content : step.content, status: chunk.stepStatus ?? step.status }
    })
  }
  const stepNumber = steps.length + 1
  return [...steps, { id: stepId, title: chunk.stepTitle || `步骤 ${stepNumber}`, content: chunk.content ?? '', status: chunk.stepStatus ?? 'running' }]
}

function encodeHtmlEntities(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function parsePythonDict(raw: string): Record<string, unknown[]> | null {
  try {
    const normalized = raw.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null')
    const parsed: unknown = JSON.parse(normalized)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    const record = parsed as Record<string, unknown>
    const hasArrayValues = Object.values(record).some((v) => Array.isArray(v))
    if (!hasArrayValues) return null
    return record as Record<string, unknown[]>
  } catch {
    return null
  }
}

function dictToRows(dict: Record<string, unknown[]>): Array<Record<string, unknown>> {
  const keys = Object.keys(dict)
  if (keys.length === 0) return []
  const firstArray = dict[keys[0]]
  if (!Array.isArray(firstArray)) return []
  const rowCount = firstArray.length
  const rows: Array<Record<string, unknown>> = []
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, unknown> = {}
    for (const key of keys) {
      const arr = dict[key]
      row[key] = Array.isArray(arr) && i < arr.length ? arr[i] : null
    }
    rows.push(row)
  }
  return rows
}

function parseMarkdownTable(tableText: string): Array<Record<string, unknown>> | null {
  const lines = tableText.trim().split('\n').filter((line) => line.trim().length > 0)
  if (lines.length < 3) return null
  const headerLine = lines[0]
  const separatorLine = lines[1]
  if (!/^\|[\s-:|]+\|$/.test(separatorLine.trim())) return null
  const headers = headerLine.split('|').map((cell) => cell.trim()).filter((cell) => cell.length > 0)
  if (headers.length === 0) return null
  const rows: Array<Record<string, unknown>> = []
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split('|').map((cell) => cell.trim()).filter((cell) => cell.length > 0)
    if (cells.length === 0) continue
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      const cellValue = j < cells.length ? cells[j] : ''
      const numericValue = Number(cellValue)
      row[headers[j]] = cellValue !== '' && Number.isFinite(numericValue) ? numericValue : cellValue
    }
    rows.push(row)
  }
  return rows.length > 0 ? rows : null
}

function detectChartType(content: string): string {
  if (/plt\.pie\s*\(/.test(content)) return 'pie'
  if (/plt\.bar[^a-z]/.test(content) || /\.bar\s*\(/.test(content)) return 'bar'
  if (/plt\.scatter\s*\(/.test(content)) return 'scatter'
  if (/plt\.plot\s*\(/.test(content)) return 'line'
  return 'line'
}

function extractTitle(content: string): string | undefined {
  const titleMatch = /plt\.title\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(content)
  if (titleMatch) return titleMatch[1]
  const setTitleMatch = /\.set_title\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(content)
  if (setTitleMatch) return setTitleMatch[1]
  return undefined
}

function buildChartViewTag(chartType: string, data: Array<Record<string, unknown>>, title?: string, sql?: string): string {
  const payload: Record<string, unknown> = { type: chartType, data }
  if (title) payload.title = title
  if (sql) payload.sql = sql
  const jsonString = JSON.stringify(payload)
  const encoded = encodeHtmlEntities(jsonString)
  return `<chart-view content="${encoded}" />`
}

function extractChartDataFromSteps(steps: ChatIntermediateStep[]): string {
  const allContent = steps.map((step) => step.content).join('\n\n')
  const chartTags: string[] = []

  const pythonDictPattern = /(?:^|\n)\s*(?:data|df|result|table_data)\s*=\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})/g
  let dictMatch = pythonDictPattern.exec(allContent)
  while (dictMatch !== null) {
    const dictStr = dictMatch[1]
    const parsed = parsePythonDict(dictStr)
    if (parsed) {
      const rows = dictToRows(parsed)
      if (rows.length > 0) {
        const chartType = detectChartType(allContent)
        const title = extractTitle(allContent)
        chartTags.push(buildChartViewTag(chartType, rows, title))
      }
    }
    dictMatch = pythonDictPattern.exec(allContent)
  }

  const markdownTablePattern = /(\|[^\n]+\|\n\|[\s-:|]+\|\n(?:\|[^\n]+\|\n?)+)/g
  let tableMatch = markdownTablePattern.exec(allContent)
  while (tableMatch !== null) {
    const rows = parseMarkdownTable(tableMatch[1])
    if (rows && rows.length > 0) {
      const hasNumericColumns = Object.values(rows[0]).some((v) => typeof v === 'number')
      const chartType = hasNumericColumns ? detectChartType(allContent) : 'table'
      chartTags.push(buildChartViewTag(chartType, rows))
    }
    tableMatch = markdownTablePattern.exec(allContent)
  }

  const jsonArrayPattern = /\[\s*\{[^[\]]*\}\s*(?:,\s*\{[^[\]]*\}\s*)*\]/g
  let jsonMatch = jsonArrayPattern.exec(allContent)
  while (jsonMatch !== null) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        const rows = parsed as Array<Record<string, unknown>>
        const chartType = detectChartType(allContent)
        chartTags.push(buildChartViewTag(chartType, rows))
      }
    } catch { /* skip */ }
    jsonMatch = jsonArrayPattern.exec(allContent)
  }

  return chartTags.join('\n\n')
}

export function useChat(): UseChatResult {
  const [conversations, setConversations] = useState<StoredConversation[]>(() => {
    const stored = readStoredConversations()
    return stored.length > 0 ? stored : [createConversationRecord()]
  })
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const stored = readStoredConversations()
    return stored.length > 0 ? stored[0].id : null
  })
  const [streamingConversations, setStreamingConversations] = useState<Set<string>>(new Set())
  const [health, setHealth] = useState<ChatHealth | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const controllersRef = useRef<Map<string, AbortController>>(new Map())
  const convUidRef = useRef<string>('')
  const initRef = useRef(false)

  const sending = useMemo(() => {
    return activeConversationId !== null && streamingConversations.has(activeConversationId)
  }, [activeConversationId, streamingConversations])

  const messages = useMemo(() => {
    const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)
    return activeConversation?.messages ?? []
  }, [activeConversationId, conversations])

  const conversationSummaries = useMemo(
    () => conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messages.length,
    })),
    [conversations],
  )

  const updateConversation = useCallback((conversationId: string, updater: (conversation: StoredConversation) => StoredConversation) => {
    setConversations((prev) => prev.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)))
  }, [])

  const markStreaming = useCallback((conversationId: string, streaming: boolean) => {
    setStreamingConversations((prev) => {
      const next = new Set(prev)
      if (streaming) next.add(conversationId)
      else next.delete(conversationId)
      return next
    })
  }, [])

  useEffect(() => {
    saveStoredConversations(conversations)
  }, [conversations])

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id)
    }
  }, [activeConversationId, conversations])

  useEffect(() => {
    const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)
    convUidRef.current = activeConversation?.convUid ?? ''
  }, [activeConversationId, conversations])

  const refreshHealth = useCallback(async () => {
    try {
      const nextHealth = await chatApi.checkHealth()
      setHealth(nextHealth)
    } catch {
      setHealth({ available: false, message: 'AI 服务暂不可用' })
    }
  }, [])

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (!activeConversationId) {
      const fallbackConversation = createConversationRecord()
      setConversations((prev) => [fallbackConversation, ...prev])
      setActiveConversationId(fallbackConversation.id)
      convUidRef.current = fallbackConversation.convUid
      return fallbackConversation.convUid
    }
    if (convUidRef.current) return convUidRef.current
    const response = await chatApi.createConversation()
    convUidRef.current = response.convUid
    updateConversation(activeConversationId, (conversation) => ({
      ...conversation,
      convUid: response.convUid,
      updatedAt: Date.now(),
    }))
    return response.convUid
  }, [activeConversationId, updateConversation])

  const startNewConversation = useCallback(async () => {
    const response = await chatApi.createConversation()
    const nextConversation = createConversationRecord(response.convUid)
    convUidRef.current = response.convUid
    setConversations((prev) => [nextConversation, ...prev])
    setActiveConversationId(nextConversation.id)
    setStreamError(null)
    await refreshHealth()
  }, [refreshHealth])

  const switchConversation = useCallback((conversationId: string) => {
    setStreamError(null)
    setActiveConversationId(conversationId)
  }, [])

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== conversationId)
      if (filtered.length === 0) {
        const fresh = createConversationRecord()
        setActiveConversationId(fresh.id)
        return [fresh]
      }
      if (conversationId === activeConversationId) {
        setActiveConversationId(filtered[0].id)
      }
      return filtered
    })
  }, [activeConversationId])

  const stopStreaming = useCallback(() => {
    if (!activeConversationId) return
    const controller = controllersRef.current.get(activeConversationId)
    if (controller) {
      controller.abort()
      controllersRef.current.delete(activeConversationId)
    }
    markStreaming(activeConversationId, false)
  }, [activeConversationId, markStreaming])

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || !activeConversationId) return
    if (controllersRef.current.has(activeConversationId)) return

    let enrichedMessage = trimmed
    if (containsProfileKeywords(trimmed)) {
      const profileContext = await buildProfileContext()
      if (profileContext) enrichedMessage = profileContext + trimmed
    }

    const senderConversationId = activeConversationId
    const activeConvUid = await ensureConversation()
    const userMessage = buildMessage('user', trimmed, 'done')
    const assistantMessage = buildMessage('assistant', '', 'streaming')
    let activeAssistantMessageId = assistantMessage.id
    const abortController = new AbortController()
    controllersRef.current.set(senderConversationId, abortController)

    updateConversation(senderConversationId, (conversation) => {
      const nextMessages = [...conversation.messages, userMessage, assistantMessage]
      return {
        ...conversation,
        convUid: activeConvUid,
        messages: nextMessages,
        updatedAt: Date.now(),
        title: buildConversationTitle(nextMessages, conversation.title),
      }
    })
    setStreamError(null)
    markStreaming(senderConversationId, true)

    let hasReceivedChunk = false
    let receivedError = false

    try {
      await chatApi.streamChat(
        { message: enrichedMessage, convUid: activeConvUid },
        {
          signal: abortController.signal,
          onChunk: (chunk) => {
            hasReceivedChunk = true
            if (chunk.convUid) {
              updateConversation(senderConversationId, (conversation) => ({
                ...conversation,
                convUid: chunk.convUid ?? conversation.convUid,
              }))
            }
            if (chunk.event === 'step') {
              updateConversation(senderConversationId, (conversation) => ({
                ...conversation,
                messages: updateMessage(conversation.messages, activeAssistantMessageId, (message) => ({
                  ...message,
                  intermediateSteps: mergeIntermediateStep(message.intermediateSteps ?? [], chunk),
                  status: 'streaming',
                })),
                updatedAt: Date.now(),
              }))
              return
            }
            if (!chunk.content) return
            updateConversation(senderConversationId, (conversation) => {
              const activeMessage = conversation.messages.find((message) => message.id === activeAssistantMessageId)
              if (!activeMessage || !activeMessage.content) {
                return {
                  ...conversation,
                  messages: updateMessage(conversation.messages, activeAssistantMessageId, (message) => ({
                    ...message,
                    content: mergeAssistantContent(message.content, chunk.content ?? ''),
                    status: 'streaming',
                  })),
                  updatedAt: Date.now(),
                }
              }
              const mergedContent = mergeAssistantContent(activeMessage.content, chunk.content ?? '')
              if (mergedContent !== activeMessage.content) {
                return {
                  ...conversation,
                  messages: updateMessage(conversation.messages, activeAssistantMessageId, (message) => ({
                    ...message,
                    content: mergedContent,
                    status: 'streaming',
                  })),
                  updatedAt: Date.now(),
                }
              }
              const nextAssistantMessage = buildMessage('assistant', chunk.content ?? '', 'streaming')
              activeAssistantMessageId = nextAssistantMessage.id
              return {
                ...conversation,
                messages: [
                  ...updateMessage(conversation.messages, activeMessage.id, (message) => ({
                    ...message,
                    status: message.status === 'error' ? 'error' : 'done',
                  })),
                  nextAssistantMessage,
                ],
                updatedAt: Date.now(),
              }
            })
          },
          onError: (chunk) => {
            receivedError = true
            const errorText = chunk.content || 'AI 服务暂时不可用，请稍后重试'
            setStreamError(errorText)
            updateConversation(senderConversationId, (conversation) => ({
              ...conversation,
              messages: updateMessage(conversation.messages, assistantMessage.id, (message) => ({
                ...message,
                content: errorText,
                status: 'error',
              })),
              updatedAt: Date.now(),
            }))
          },
          onDone: (chunk) => {
            if (chunk.convUid) {
              updateConversation(senderConversationId, (conversation) => ({
                ...conversation,
                convUid: chunk.convUid ?? conversation.convUid,
              }))
            }
            updateConversation(senderConversationId, (conversation) => ({
              ...conversation,
              messages: updateMessage(conversation.messages, activeAssistantMessageId, (message) => {
                if (message.status === 'error') return { ...message, status: 'error' }
                const chartViewTags = extractChartDataFromSteps(message.intermediateSteps ?? [])
                const hasExistingChart = message.content.includes('<chart-view') || message.content.includes('```vis-chart')
                const appendChart = chartViewTags && !hasExistingChart
                return {
                  ...message,
                  content: appendChart ? `${message.content}\n\n${chartViewTags}` : message.content,
                  status: 'done',
                }
              }),
              updatedAt: Date.now(),
            }))
          },
        },
      )
      if (!hasReceivedChunk && !receivedError) {
        updateConversation(senderConversationId, (conversation) => ({
          ...conversation,
          messages: updateMessage(conversation.messages, assistantMessage.id, (message) => ({
            ...message,
            content: '未收到有效回复，请稍后重试。',
            status: 'error',
          })),
          updatedAt: Date.now(),
        }))
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        updateConversation(senderConversationId, (conversation) => ({
          ...conversation,
          messages: updateMessage(conversation.messages, assistantMessage.id, (message) => ({
            ...message,
            content: message.content || '已停止生成。',
            status: message.content ? 'done' : 'error',
          })),
          updatedAt: Date.now(),
        }))
        return
      }
      const errorText = error instanceof Error ? error.message : 'AI 服务暂时不可用，请稍后重试'
      setStreamError(errorText)
      updateConversation(senderConversationId, (conversation) => ({
        ...conversation,
        messages: updateMessage(conversation.messages, assistantMessage.id, (message) => ({
          ...message,
          content: errorText,
          status: 'error',
        })),
        updatedAt: Date.now(),
      }))
    } finally {
      controllersRef.current.delete(senderConversationId)
      markStreaming(senderConversationId, false)
      await refreshHealth()
    }
  }, [activeConversationId, ensureConversation, markStreaming, refreshHealth, updateConversation])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    void refreshHealth()
    void ensureConversation()
    return () => {
      for (const controller of controllersRef.current.values()) {
        controller.abort()
      }
      controllersRef.current.clear()
    }
  }, [ensureConversation, refreshHealth])

  return {
    conversations: conversationSummaries,
    activeConversationId,
    messages,
    sending,
    health,
    streamError,
    exampleQuestions: useMemo(() => EXAMPLE_QUESTIONS, []),
    sendMessage,
    startNewConversation,
    switchConversation,
    deleteConversation,
    stopStreaming,
  }
}
