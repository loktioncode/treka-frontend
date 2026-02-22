'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from './card';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    dataSource?: string;
    filters?: Record<string, unknown>;
    insights?: string[];
  };
}

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  examplePrompt?: string;
}

export function Chat({
  messages,
  onSendMessage,
  isLoading = false,
  className = '',
  title = 'AI Analytics Assistant',
  subtitle = 'Ask questions about your data',
  placeholder = 'Ask about your data, assets, or performance...',
  examplePrompt = 'What are the top performing assets?',
}: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
    }
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b-2 border-teal-700">
        <div className="p-2 bg-teal-100 rounded-full">
          <Bot className="h-5 w-5 text-teal-700" />
        </div>
        <div>
          <h3 className="font-semibold text-teal-900">{title}</h3>
          <p className="text-sm text-teal-700">{subtitle}</p>
        </div>
        
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-teal-700 py-8">
            <Bot className="h-12 w-12 mx-auto mb-3 text-teal-400" />
            <p className="text-sm">Start a conversation to get insights</p>
            <p className="text-xs mt-1">Try: &quot;{examplePrompt}&quot;</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="p-2 bg-teal-100 rounded-full">
                  <Bot className="h-4 w-4 text-teal-600" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.metadata?.insights && message.metadata.insights.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-teal-700">
                    <p className="text-xs font-medium text-teal-700 mb-1">Key Insights:</p>
                    <ul className="text-xs space-y-1">
                      {message.metadata.insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-teal-700 mt-1">•</span>
                          <span className="text-teal-800">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="p-2 bg-gray-100 rounded-full">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="p-2 bg-teal-100 rounded-full">
              <Bot className="h-4 w-4 text-teal-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                <span className="text-sm text-gray-600">Analyzing data...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t-2 border-teal-700">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          e.g. &quot;{examplePrompt}&quot;
        </p>
      </form>
    </Card>
  );
}
