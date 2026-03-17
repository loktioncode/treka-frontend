'use client';

import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { Chat, ChatMessage } from './chat';

interface FloatingChatButtonProps {
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  isLoading?: boolean;
}

export function FloatingChatButton({ onSendMessage, messages, isLoading = false }: FloatingChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-6 z-50 w-14 h-14 bg-teal-700 hover:bg-teal-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        style={{ bottom: 'calc(1.5rem + 5vh)' }}
        aria-label="Open AI Chat"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
        
        {/* Pulse animation when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-teal-500 animate-ping opacity-20"></span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed right-6 z-40 w-96 h-[500px] animate-in slide-in-from-bottom-2 duration-200" style={{ bottom: 'calc(1.5rem + 5vh + 4rem)' }}>
          <div className="h-full bg-white rounded-lg shadow-2xl border-2 border-teal-700 overflow-hidden">
            <Chat
              messages={messages}
              onSendMessage={onSendMessage}
              isLoading={isLoading}
              className="h-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
