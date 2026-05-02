import { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button, TextArea, DotLoading } from 'antd-mobile'
import { SendOutline, StopOutline } from 'antd-mobile-icons'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/contexts/useAuthHook'
import CustomTabBar from '@/custom-tab-bar'
import type { ChatIntermediateStep, ChatMessage } from '@/types/chat'
import './index.scss'

function getLatestStepTitle(steps: ChatIntermediateStep[]): string | undefined {
  for (let i = steps.length - 1; i >= 0; i--) {
    if ((steps[i].status === 'running' || steps[i].status === 'streaming') && steps[i].title) {
      return steps[i].title
    }
  }
  return steps.length > 0 ? steps[steps.length - 1].title : undefined
}

function ChatStepItem({ step }: { step: ChatIntermediateStep }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <View className='chat-step-item'>
      <View
        className='chat-step-item-header'
        onClick={() => setExpanded(!expanded)}
      >
        <Text className='chat-step-item-arrow'>{expanded ? '▾' : '▸'}</Text>
        <Text className='chat-step-item-title'>{step.title || '处理中'}</Text>
        <Text className={`chat-step-item-status is-${step.status}`}>
          {step.status === 'running' ? '运行中' : step.status === 'streaming' ? '输出中' : '完成'}
        </Text>
      </View>
      {expanded && (
        <View className='chat-step-item-content'>
          <Text className='chat-step-item-content-text'>
            {step.content || (step.status !== 'done' ? '正在处理...' : '')}
          </Text>
        </View>
      )}
    </View>
  )
}

function ChatStepPanel({ steps, messageStatus }: { steps: ChatIntermediateStep[]; messageStatus: string }) {
  const isAllDone = messageStatus === 'done' || steps.every(s => s.status === 'done')
  const [expanded, setExpanded] = useState(true)
  const listRef = useRef<any>(null)
  const headerText = isAllDone
    ? `已完成 ${steps.length} 个分析步骤`
    : `正在${getLatestStepTitle(steps) ?? '分析处理'}...`

  useEffect(() => {
    if (expanded && listRef.current) {
      try {
        listRef.current.scrollTo?.({ y: 999999 })
      } catch { /* ignore */ }
    }
  }, [steps, expanded])

  if (steps.length === 0) return null

  return (
    <View className={`chat-step-panel ${isAllDone ? 'is-done' : 'is-running'}`}>
      <View className='step-panel-header' onClick={() => setExpanded(!expanded)}>
        <Text className='step-panel-icon'>{expanded ? '▾' : '▸'}</Text>
        <Text className='step-panel-text'>{headerText}</Text>
        {!isAllDone && <DotLoading color='primary' />}
      </View>
      {expanded && (
        <View className='step-panel-content'>
          <ScrollView scrollY className='step-list-scroll' ref={listRef}>
            {steps.map(step => (
              <ChatStepItem key={step.id} step={step} />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

function stripChartTags(content: string): string {
  return content
    .replace(/<chart-view\s+content="[\s\S]*?"\s*\/?>/gi, '')
    .replace(/<chart-view[\s\S]*?<\/chart-view>/gi, '')
    .replace(/```\s*vis-chart\s*[\s\S]*?```/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const displayContent = isUser ? message.content : stripChartTags(message.content)

  return (
    <View className={`chat-message-row ${isUser ? 'is-user' : 'is-ai'}`}
      style={isUser ? { flexDirection: 'row-reverse', WebkitFlexDirection: 'row-reverse' } : undefined}
    >
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
      <View className={isUser ? 'chat-message-bubble chat-message-bubble-user' : 'chat-message-bubble'}>
        {message.role === 'assistant' && message.intermediateSteps && message.intermediateSteps.length > 0 && (
          <ChatStepPanel steps={message.intermediateSteps} messageStatus={message.status} />
        )}
        <Text className={isUser ? 'chat-message-text chat-message-text-user' : 'chat-message-text'}>
          {displayContent || (message.status === 'streaming' ? '正在思考...' : '')}
        </Text>
        {message.status === 'streaming' && <Text className='typing-cursor'>|</Text>}
      </View>
    </View>
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
  } = useChat(!!user)

  const hasMessages = messages.length > 0

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        try {
          if (scrollRef.current) {
            scrollRef.current.scrollTo({ y: 999999, animated: true })
          }
        } catch {
          // ignore scroll errors
        }
      }, 100)
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
    setSidebarOpen(false)
  }

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id)
  }

  const handleCloseSidebar = () => {
    setSidebarOpen(false)
  }

  // Auth gate: show login prompt if not authenticated
  if (!user) {
    return (
      <View className='chat-page'>
        <View className='auth-gate'>
          <View className='auth-gate-icon'>
            <Text style={{ fontSize: '32px' }}>🎓</Text>
          </View>
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
        <CustomTabBar />
      </View>
    )
  }

  return (
    <View className='chat-page'>
      {/* Sidebar Overlay */}
      <View
        className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay-visible' : ''}`}
        onClick={handleCloseSidebar}
      ></View>

      {/* Sidebar */}
      <View className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <View className='sidebar-header'>
          <Text className='sidebar-title'>对话历史</Text>
          <View className='sidebar-close' onClick={handleCloseSidebar}>
            <Text style={{ fontSize: '16px', color: '#6b7280' }}>✕</Text>
          </View>
        </View>

        <View className='sidebar-new-btn' onClick={handleNewConversation}>
          <Text style={{ fontSize: '14px', color: '#fff' }}>＋ 新对话</Text>
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
                onClick={() => handleSwitchConversation(conv.id)}
              >
                <View className='sidebar-item-content'>
                  <Text className='sidebar-item-title'>{conv.title}</Text>
                  <View className='sidebar-item-meta'>
                    <Text className='sidebar-item-count'>{conv.messageCount} 条消息</Text>
                  </View>
                </View>
                <View
                  className='sidebar-item-delete'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteConversation(conv.id)
                  }}
                ></View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Header Bar */}
      <View className='chat-header'>
        <View className='header-left'>
          <View className='header-icon-btn' onClick={() => setSidebarOpen(true)}>
            <Text style={{ fontSize: '18px' }}>☰</Text>
          </View>
        </View>
        <Text className='header-title'>高考志愿助手</Text>
        <View className='header-right'>
          <View className='header-text-btn' onClick={handleNewConversation}>
            <Text style={{ fontSize: '13px', color: '#fff' }}>＋ 新对话</Text>
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
                  <Text className='welcome-icon-text'>🎓</Text>
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
      <CustomTabBar />
    </View>
  )
}