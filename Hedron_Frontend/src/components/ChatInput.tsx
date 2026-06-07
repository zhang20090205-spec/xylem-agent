import React from 'react';
import { Loader2, Send } from 'lucide-react';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  isConnected?: boolean;
  isReady?: boolean;
}

export default function ChatInput({
  message,
  setMessage,
  onSendMessage,
  isLoading,
  isConnected = true,
  isReady = isConnected,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !isLoading && isReady) {
        onSendMessage();
      }
    }
  };

  const getPlaceholder = () => {
    if (!isConnected) {
      return '正在连接后端...';
    }
    if (!isReady) {
      return '正在自动连接 demo 钱包并认证...';
    }
    if (isLoading) {
      return 'Agent 正在回复...';
    }
    return '输入你的 DeFi 信号...';
  };

  return (
    <div className="flex-shrink-0 border-t border-white/12 bg-[#0b1d25]/24 px-4 py-4 backdrop-blur-md lg:px-8 lg:py-5">
      <div className="mx-auto max-w-4xl">
        <div className="ether-micro ether-label mb-2 flex items-center justify-between gap-3">
          <span>TRANSMISSION INPUT</span>
          <span>{isReady ? 'CHANNEL OPEN' : isConnected ? 'AUTHORIZING' : 'CHANNEL LOCKED'}</span>
        </div>
        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="ether-field ether-scroll w-full resize-none px-5 py-4 pr-12 text-sm leading-relaxed text-white placeholder-white/42 disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '54px',
                maxHeight: '128px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
              disabled={isLoading || !isReady}
            />
          </div>

          <button
            onClick={onSendMessage}
            disabled={!message.trim() || isLoading || !isReady}
            className="ether-button flex h-[54px] min-w-[54px] flex-shrink-0 items-center justify-center px-4"
            aria-label="发送消息"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
