import React from 'react';
import ChatMessage from './ChatMessage';
import { Message } from '../types/chat';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onExecuteSwap?: (content: string) => void;
  onSendMessage?: (message: string) => void;
}

export default function ChatArea({ messages, isLoading, onExecuteSwap, onSendMessage }: ChatAreaProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Example prompts organized by category
  const promptCategories = [
    {
      emoji: "📈",
      title: "Analytics & Market Data",
      prompts: [
        "Show me Bonzo Finance lending rates and market statistics",
        "What are the current SaucerSwap farming opportunities?"
      ]
    },
    {
      emoji: "💰",
      title: "DeFi Operations",
      prompts: [
        "Deposit 25 SAUCE into Bonzo Finance to earn interest",
                  "Create a limit order with 10 HBAR when SAUCE token price drops to 0.0045 USDC"
      ]
    },
    {
      emoji: "🔍",
      title: "Account & Network Queries",
      prompts: [
        "Create a yield strategy for my HBAR based on my profile",
        "Check my Infinity Pool staking rewards and xSAUCE balance"
      ]
    }
  ];

  const handlePromptClick = (prompt: string) => {
    if (onSendMessage) {
      onSendMessage(prompt);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 bg-gradient-to-br from-theme-bg-primary to-theme-bg-secondary dark:from-gray-900 dark:to-gray-800 min-h-0 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-theme-lg">
              <img 
                src="/xylem-agent.png" 
                alt="Xylem agent" 
                className="w-20 h-20 object-cover rounded-full"
              />
            </div>
            <h2 className="text-3xl font-bold text-theme-text-primary mb-3">
              Welcome to Xylem agent
            </h2>
            <p className="text-theme-text-secondary max-w-md mx-auto text-lg leading-relaxed">
              Start a conversation with your AI assistant. Ask questions, get help, 
              or just have a chat!
            </p>
          </div>

          {/* Example Prompts Grid */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {promptCategories.map((category, categoryIndex) => 
                category.prompts.map((prompt, promptIndex) => (
                  <button
                    key={`${categoryIndex}-${promptIndex}`}
                    onClick={() => handlePromptClick(prompt)}
                    className="group bg-theme-bg-secondary dark:bg-gray-800 border border-theme-border-primary dark:border-gray-700 
                             rounded-xl p-4 text-left hover:border-blue-500 dark:hover:border-blue-400 
                             hover:shadow-theme-lg transition-all duration-200 hover:scale-[1.02] 
                             active:scale-[0.98] cursor-pointer h-full"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-xl flex-shrink-0">{category.emoji}</span>
                      <div className="flex-1">
                        <h4 className="text-xs font-semibold text-theme-text-secondary dark:text-gray-400 mb-1">
                          {category.title}
                        </h4>
                      </div>
                    </div>
                    <div className="text-theme-text-primary dark:text-white text-sm leading-relaxed mb-3">
                      "{prompt}"
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-theme-text-tertiary">
                        Click to send
                      </span>
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full opacity-0 
                                    group-hover:opacity-100 transition-opacity duration-200"></div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Type message to begin section */}
          <div className="mt-12 flex justify-center">
            <div className="bg-theme-bg-secondary dark:bg-gray-800 px-6 py-3 rounded-full shadow-theme-md border border-theme-border-primary dark:border-gray-700">
              <span className="text-sm text-theme-text-tertiary font-medium">Type a message to begin</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-gradient-to-b from-theme-bg-primary/50 to-theme-bg-secondary dark:from-gray-900/50 dark:to-gray-800 overflow-hidden">
      {/* Scrollable messages container */}
      <div 
        className="h-full overflow-y-auto overflow-x-hidden" 
        style={{ 
          scrollbarWidth: 'thin',
          scrollBehavior: 'smooth'
        }}
      >
        <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Messages */}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onExecuteSwap={onExecuteSwap} />
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-4 group">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-theme-md">
                <img 
                  src="/xylem-agent.png" 
                  alt="Xylem agent" 
                  className="w-10 h-10 object-cover rounded-full"
                />
              </div>
              <div className="flex-1 max-w-[85%]">
                <div className="inline-block px-5 py-4 rounded-2xl rounded-bl-md bg-theme-bg-secondary dark:bg-gray-800 border border-theme-border-primary dark:border-gray-700 shadow-theme-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2.5 h-2.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-2.5 h-2.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll target with more space */}
          <div ref={messagesEndRef} className="h-8" />
        </div>
      </div>
    </div>
  );
}
