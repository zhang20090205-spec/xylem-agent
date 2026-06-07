import React from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  isConnected?: boolean;
}

export default function ChatInput({ 
  message, 
  setMessage, 
  onSendMessage, 
  isLoading,
  isConnected = true
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isLoading && isConnected) {
        onSendMessage();
      }
    }
  };

  const getPlaceholder = () => {
    if (!isConnected) {
      return "Connecting to Xylem agent...";
    }
    if (isLoading) {
      return "Agent is responding...";
    }
    return "Type your message here...";
  };

  return (
    <div className="border-t border-theme-border-primary dark:border-gray-700 bg-gradient-to-r from-theme-bg-secondary to-theme-bg-primary/50 dark:from-gray-800 dark:to-gray-900/50 p-6 flex-shrink-0">
      <div className="flex gap-4 items-end max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholder()}
            className="w-full resize-none border border-theme-border-secondary dark:border-gray-600 rounded-2xl px-5 py-4 pr-12
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                     max-h-32 min-h-[52px] text-sm leading-relaxed shadow-sm
                     transition-all duration-200 hover:shadow-theme-md focus:shadow-theme-lg
                     bg-theme-bg-secondary dark:bg-gray-800 text-theme-text-primary placeholder-theme-text-tertiary
                     disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{ 
              height: 'auto',
              minHeight: '52px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
            disabled={isLoading || !isConnected}
          />
        </div>
        
        <button
          onClick={onSendMessage}
          disabled={!message.trim() || isLoading || !isConnected}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                   disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed
                   dark:disabled:from-gray-600 dark:disabled:to-gray-700
                   text-white p-4 rounded-2xl transition-all duration-200 flex-shrink-0
                   shadow-theme-lg hover:shadow-theme-xl transform hover:scale-105 active:scale-95
                   disabled:transform-none disabled:shadow-theme-md"
        >
          {isLoading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <Send size={22} />
          )}
        </button>
      </div>
    </div>
  );
}
