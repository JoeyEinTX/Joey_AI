import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage as ChatMessageType, TestScenario } from '../../types';
import { postChatMessageStream } from '../../services/apiService';
import ChatInput from '../chat/ChatInput';
import ChatMessage from '../chat/ChatMessage';
import DeveloperTools from '../chat/DeveloperTools';
import { useAppContext } from '../../hooks/useAppContext';
import WelcomeScreen from '../chat/WelcomeScreen';

const Chat: React.FC = () => {
  const { currentChatId, chatSessions, selectedModel, backendStatus, updateChatSessionTitle, isDeveloperMode } = useAppContext();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testScenario, setTestScenario] = useState<TestScenario>('normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chatSessions.find(c => c.id === currentChatId);

  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages);
    } else {
      setMessages([]);
    }
  }, [currentChatId, chatSessions, currentChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !currentChatId) return;

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    
    const aiPlaceholder: ChatMessageType = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: '',
        timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage, aiPlaceholder]);
    setIsLoading(true);

    try {
      const stream = postChatMessageStream(currentChatId, text, isDeveloperMode ? testScenario : 'normal');
      let currentText = '';
      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          currentText += chunk;
          setMessages(prev => prev.map(msg => 
              msg.id === aiPlaceholder.id ? { ...msg, text: currentText } : msg
          ));
        } else if (chunk.type === 'titleUpdate' && currentChatId) {
          updateChatSessionTitle(currentChatId, chunk.title);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessageText = error instanceof Error ? error.message : 'An unknown error occurred.';
      const errorMessage: ChatMessageType = {
        id: aiPlaceholder.id,
        sender: 'ai',
        text: `Sorry, I encountered an error: **${errorMessageText}**`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => prev.map(msg => msg.id === aiPlaceholder.id ? errorMessage : msg));
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentChatId) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <h1 className="text-4xl font-bold text-joey-accent mb-4" style={{textShadow: '0 0 10px #00bfff'}}>Joey_AI</h1>
        <p className="text-joey-text-darker">Select a chat or start a new one from the menu.</p>
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <WelcomeScreen
        selectedModel={selectedModel}
        isDeveloperMode={isDeveloperMode}
        testScenario={testScenario}
        onScenarioChange={setTestScenario}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        backendStatus={backendStatus}
      />
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen p-4">
      <div className="flex-1 overflow-y-auto pr-4 space-y-6 pt-16">
        {messages.map((msg, index) => (
          <ChatMessage key={msg.id || index} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4 max-w-3xl w-full mx-auto">
        {isDeveloperMode && <DeveloperTools currentScenario={testScenario} onScenarioChange={setTestScenario} />}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} isDisabled={backendStatus !== 'connected'} />
      </div>
    </div>
  );
};

export default Chat;