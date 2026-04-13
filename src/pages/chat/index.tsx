import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button, TextArea, Toast, DotLoading, Empty, Avatar } from 'antd-mobile'
import { SendOutline, AddOutline, StopOutline } from 'antd-mobile-icons'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/contexts/useAuthHook'
import logoImg from '@/assets/logo.png'
import type { ChatIntermediateStep, ChatMessage } from '@/types/chat'
import './index.scss'

function ChatStepPanel({ steps, messageStatus }: { steps: ChatIntermediateStep[]; messageStatus: string }) {
  const [expanded, setExpanded] = useState(false)
  const isAllDone = messageStatus === 'done' || steps.every((s) => s.status === 'done')

  if (steps.length === 0) return null

  return (
    <View className={`chat-step-panel ${isAllDone ? 'is-done' : 'is-running'}`}>
      <View className='step-panel-header' onClick={() => setExpanded(!expanded)}>
        <Text className='step-panel-icon'>{expanded ? '▾' : '▸'}</Text>
        <Text className='step-panel-text'>
          {isAllDone ? `已完成 ${steps.length} 个分析步骤` : '正在分析处理...'}
        </Text>
        {!isAllDone && <DotLoading color='primary' />}
      </View>
      {expanded && (
        <View className='step-panel-content'>
          {steps.map((step) => (
            <View key={step.id} className='step-item'>
              <Text className='step-item-title'>{step.title || '处理中'}</Text>
              <Text className={`step-item-status is-${step.status}`}>
                {step.status === 'running' ? '运行中' : step.status === 'streaming' ? '输出中' : '完成'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <View className={`chat-message-row ${isUser ? 'is-user' : 'is-ai'}`}>
      <View className='chat-message-avatar'>
        {isUser ? (
          <View className='avatar-placeholder avatar-user'>
            <Text className='avatar-text'>我</Text>
          </View>
        ) : (
          <View className='avatar-placeholder avatar-ai'>
            <Text className='avatar-text'>AI</Text>
          </View>
        )}
      </View>
      <View className='chat-message-bubble'>
        {message.role === 'assistant' && message.intermediateSteps && message.intermediateSteps.length > 0 && (
          <ChatStepPanel steps={message.intermediateSteps} messageStatus={message.status} />
        )}
        <Text className='chat-message-text'>{message.content || (message.status === 'streaming' ? '正在思考...' : '')}</Text>
        {message.status === 'streaming' && <Text className='typing-cursor'>|</Text>}
      </View>
    </View>
  )
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

function ConversationSidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onNewConversation,
  onSwitchConversation,
  onDeleteConversation,
}: {
  isOpen: boolean
  onClose: () => void
  conversations: Array<{ id: string; title: string; updatedAt: number; messageCount: number }>
  activeConversationId: string | null
  onNewConversation: () => void
  onSwitchConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
}) {
  return (
    <>
      {/* Overlay */}
      <View
        className={`sidebar-overlay ${isOpen ? 'sidebar-overlay-visible' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <View className={`conversation-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <View className='sidebar-header'>
          <Text className='sidebar-title'>对话历史</Text>
          <View className='sidebar-close' onClick={onClose}>
            <View className='icon-close' />
          </View>
        </View>

        <View className='sidebar-new-btn' onClick={onNewConversation}>
          <View className='icon-plus-white' />
          <Text className='sidebar-new-btn-text'>新对话</Text>
        </View>

        <ScrollView scrollY className='sidebar-list'>
          {conversations.length === 0 ? (
            <View className='sidebar-empty'>
              <Text className='sidebar-empty-text'>暂无对话记录</Text>
            </View>
          ) : (
            conversations.map((conv) => (
              <View
                key={conv.id}
                className={`sidebar-item ${conv.id === activeConversationId ? 'sidebar-item-active' : ''}`}
                onClick={() => {
                  onSwitchConversation(conv.id)
                  onClose()
                }}
              >
                <View className='sidebar-item-content'>
                  <Text className='sidebar-item-title'>{conv.title}</Text>
                  <View className='sidebar-item-meta'>
                    <Text className='sidebar-item-count'>{conv.messageCount} 条消息</Text>
                    <Text className='sidebar-item-time'>{formatRelativeTime(conv.updatedAt)}</Text>
                  </View>
                </View>
                <View
                  className='sidebar-item-delete'
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteConversation(conv.id)
                  }}
                >
                  <View className='icon-trash' />
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </>
  )
}

export default function ChatPage() {
  const { user } = useAuth()
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrollRef = useRef<any>(null)
  const {
    conversations,
    activeConversationId,
    messages,
    sending,
    health,
    streamError,
    exampleQuestions,
    sendMessage,
    startNewConversation,
    switchConversation,
    deleteConversation,
    stopStreaming,
  } = useChat()

  const hasMessages = messages.length > 0

  useEffect(() => {
    if (scrollRef.current) {
      // Scroll to bottom when messages change
    }
  }, [messages])

  const handleSend = async (preset?: string) => {
    const nextContent = (preset ?? draft).trim()
    if (!nextContent) return
    setDraft('')
    await sendMessage(nextContent)
  }

  const handleInputConfirm = () => {
    if (draft.trim() && !sending) {
      void handleSend()
    }
  }

  const handleNewConversation = async () => {
    await startNewConversation()
    setSidebarOpen(false)
  }

  const handleSwitchConversation = (id: string) => {
    switchConversation(id)
  }

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id)
  }

  // Auth gate: show login prompt if not authenticated
  if (!user) {
    return (
      <View className='chat-page'>
        <View className='auth-gate'>
          <View className='auth-gate-icon icon-robot' />
          <Text className='auth-gate-title'>请先登录</Text>
          <Text className='auth-gate-desc'>登录后即可使用AI智能填表助手，获取个性化志愿推荐</Text>
          <View className='auth-gate-actions'>
            <Button block color='primary' size='large' onClick={() => Taro.navigateTo({ url: '/pages/login/index' })} className='auth-gate-btn'>
              登录
            </Button>
            <Button block fill='none' size='large' onClick={() => Taro.navigateTo({ url: '/pages/register/index' })} className='auth-gate-btn auth-gate-btn-secondary'>
              注册新账号
            </Button>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='chat-page'>
      {/* Conversation Sidebar */}
      <ConversationSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={handleNewConversation}
        onSwitchConversation={handleSwitchConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Header Bar */}
      <View className='chat-header'>
        <View className='header-left'>
          <View className='header-icon-btn' onClick={() => setSidebarOpen(true)}>
            <View className='icon-history' />
          </View>
        </View>
        <Text className='header-title'>高考志愿助手</Text>
        <View className='header-right'>
          <View className='header-text-btn' onClick={handleNewConversation}>
            <View className='icon-plus-white' />
            <Text className='header-text-btn-label'>新对话</Text>
          </View>
        </View>
      </View>

      {/* Messages Area */}
      <ScrollView scrollY className='chat-scroll-area' ref={scrollRef}>
        <View className='chat-content'>
          {!hasMessages ? (
            <View className='chat-empty'>
              <View className='chat-welcome'>
                <View className='welcome-icon'>
                  <View className='icon-graduation-cap' />
                </View>
                <Text className='welcome-title'>有什么我可以帮您的？</Text>
                <Text className='welcome-desc'>我可以回答高考分数、专业组、院校录取趋势相关的问题。</Text>
              </View>

              <View className='suggestions-grid'>
                {exampleQuestions.map((q, i) => (
                  <View key={i} className='suggestion-card' onClick={() => void handleSend(q)}>
                    <Text className='suggestion-text'>{q}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View className='chat-messages'>
              {streamError && (
                <View className='chat-error-banner'>
                  <Text className='error-text'>生成回复时出现错误: {streamError}</Text>
                </View>
              )}
              {health?.available === false && (
                <View className='chat-error-banner'>
                  <Text className='error-text'>AI 服务暂不可用，请稍后重试</Text>
                </View>
              )}
              {messages.map((msg) => (
                <ChatMessageBubble key={msg.id} message={msg} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Input Area */}
      <View className='chat-input-area'>
        <View className='chat-input-wrapper'>
          <TextArea
            value={draft}
            onChange={(val) => setDraft(val)}
            placeholder='给志愿助手发送消息...'
            autoSize={{ minRows: 1, maxRows: 4 }}
            className='chat-textarea'
            onSubmit={handleInputConfirm}
          />
          <View className='chat-input-actions'>
            {sending ? (
              <Button
                color='danger'
                shape='rounded'
                size='small'
                onClick={stopStreaming}
                className='stop-btn'
              >
                <StopOutline />
              </Button>
            ) : (
              <Button
                color='primary'
                shape='rounded'
                size='small'
                disabled={!draft.trim()}
                onClick={() => void handleSend()}
                className='send-btn'
              >
                <SendOutline />
              </Button>
            )}
          </View>
        </View>
        <Text className='chat-footer-note'>AI 回复可能会有不准确的地方，志愿填报请结合官方数据核对。</Text>
      </View>
    </View>
  )
}