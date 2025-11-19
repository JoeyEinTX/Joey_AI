
import React, { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, isDisabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-4 p-2 bg-joey-secondary rounded-lg border border-joey-accent/30">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        }}
        placeholder={isDisabled ? "Backend not connected..." : "Type your message or code here..."}
        className="flex-1 bg-transparent text-joey-text placeholder-joey-text-darker focus:outline-none resize-none p-2"
        rows={2}
        disabled={isLoading || isDisabled}
      />
      <button
        type="submit"
        disabled={isLoading || isDisabled}
        className="bg-joey-accent text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:bg-joey-accent-hover disabled:bg-joey-secondary disabled:cursor-not-allowed disabled:text-joey-text-darker"
      >
        {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
            <SendIcon />
        )}
      </button>
    </form>
  );
};

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
)

export default ChatInput;
