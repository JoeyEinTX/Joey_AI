
import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../types';
import CodeBlock from './CodeBlock';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  // Simple parser to separate text and code blocks
  const parts = message.text.split(/(```[\s\S]*?```)/g).filter(part => part.trim() !== '');

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full bg-joey-accent flex-shrink-0 flex items-center justify-center font-bold text-white shadow-neon-sm">
          AI
        </div>
      )}
      <div className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-lg ${
          isUser
            ? 'bg-joey-accent text-white'
            : 'bg-joey-secondary border border-joey-accent/20'
        }`}>
        <div className="prose prose-invert prose-p:my-2 prose-pre:my-3 text-joey-text">
            {parts.map((part, index) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/);
                    if (codeMatch) {
                        const language = codeMatch[1] || 'plaintext';
                        const code = codeMatch[2];
                        return <CodeBlock key={index} language={language} code={code} />;
                    }
                }
                // Basic markdown for bold text
                const boldedText = part.split(/(\*\*.*?\*\*)/g).map((subPart, i) => {
                    if (subPart.startsWith('**') && subPart.endsWith('**')) {
                        return <strong key={i}>{subPart.slice(2, -2)}</strong>;
                    }
                    return subPart;
                });

                return <p key={index} className="whitespace-pre-wrap">{boldedText}</p>;
            })}
        </div>
      </div>
       {isUser && (
        <div className="w-10 h-10 rounded-full bg-joey-secondary flex-shrink-0 flex items-center justify-center font-bold text-joey-text-darker">
          You
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
