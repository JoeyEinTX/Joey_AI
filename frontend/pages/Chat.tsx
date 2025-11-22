import React, { useState } from 'react';

const Chat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setMessages([...messages, { role: 'user', content: message }]);
    setMessage('');
    
    // Placeholder for API integration in next phase
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'This is a placeholder response. API integration coming in next phase!' 
      }]);
    }, 500);
  };

  return (
    <div className="h-full flex flex-col bg-joey-main">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-joey-accent mb-2">
                Welcome to Joey AI
              </h2>
              <p className="text-joey-text/60">
                Start a conversation by typing a message below
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-joey-accent text-joey-main'
                    : 'bg-joey-secondary text-joey-text'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-joey-accent bg-joey-secondary p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-joey-main text-joey-text rounded-lg border border-joey-accent focus:outline-none focus:ring-2 focus:ring-joey-accent"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-6 py-2 bg-joey-accent text-joey-main rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
