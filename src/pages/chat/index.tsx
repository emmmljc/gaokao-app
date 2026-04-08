import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { Button, TextArea, Toast, DotLoading, Empty, Avatar } from 'antd-mobile'
import { SendOutline, AddOutline, StopOutline } from 'antd-mobile-icons'
import { useChat } from '@/hooks/useChat'
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

export default function ChatPage() {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<any>(null)
  const {
    messages,
    sending,
    health,
    streamError,
    exampleQuestions,
    sendMessage,
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

  return (
    <View className='chat-page'>
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
    </View>
  )
}
