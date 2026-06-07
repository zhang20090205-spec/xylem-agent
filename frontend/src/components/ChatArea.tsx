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

  const promptCategories = [
    {
      code: '01',
      title: 'MARKET DATA',
      label: '分析与市场数据',
      prompts: [
        '帮我查看 Bonzo Finance 的借贷利率和市场统计',
        '当前 SaucerSwap 有哪些 farming 机会？',
      ],
    },
    {
      code: '02',
      title: 'DEFI OPS',
      label: 'DeFi 操作',
      prompts: [
        '将 25 SAUCE 存入 Bonzo Finance 赚取收益',
        '当 SAUCE 价格跌到 0.0045 USDC 时，用 10 HBAR 创建限价单',
      ],
    },
    {
      code: '03',
      title: 'ACCOUNT QUERY',
      label: '账户与网络查询',
      prompts: [
        '根据我的情况，为我的 HBAR 制定收益策略',
        '查看我的 Infinity Pool 质押奖励和 xSAUCE 余额',
      ],
    },
  ];

  const promptList = promptCategories.flatMap((category) =>
    category.prompts.map((prompt, promptIndex) => ({
      ...category,
      prompt,
      itemCode: `${category.code}.${promptIndex + 1}`,
    })),
  );

  const handlePromptClick = (prompt: string) => {
    onSendMessage?.(prompt);
  };

  if (messages.length === 0) {
    return (
      <div className="ether-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="relative mx-auto flex min-h-full max-w-7xl flex-col px-5 py-6 lg:px-8">
          <section className="flex min-h-[calc(100vh-300px)] flex-1 flex-col items-center justify-center pb-20 pt-14 text-center lg:min-h-[500px] lg:pb-16 lg:pt-0">
            <div className="ether-line-label ether-micro mb-12">
              CURRENTLY TRANSMITTING
            </div>
            <h2 className="ether-serif max-w-5xl text-6xl leading-none text-white/88 drop-shadow-sm md:text-7xl lg:text-8xl">
              Xylem agent
            </h2>
            <p className="ether-serif mt-8 text-2xl italic text-white/46 md:text-3xl">
              hedera defi signal room
            </p>
            <div className="ether-micro ether-label mt-10 flex items-center gap-3">
              <span className="ether-signal-dot" />
              <span>FREQUENCY 89.4 / {promptList.length.toLocaleString()} LISTENING</span>
            </div>
            <button
              onClick={() => handlePromptClick(promptList[0].prompt)}
              className="ether-button mt-12 px-12 py-5"
            >
              TUNE IN SIMULTANEOUSLY
            </button>
          </section>

            <section className="grid gap-5 pb-6 lg:pointer-events-none lg:fixed lg:bottom-44 lg:left-[22rem] lg:right-8 lg:z-10 lg:grid-cols-[1fr_360px] lg:items-end lg:pb-0">
            <div className="ether-micro ether-label hidden space-y-2 lg:block">
              <div>DATA: STREAMING</div>
              <div>ENCRYPTION: WALLET SIGNED</div>
              <div>AESTHETIC: ANALOG</div>
            </div>

              <div className="ether-scroll space-y-3 lg:pointer-events-auto lg:max-h-[168px] lg:space-y-2 lg:overflow-y-auto lg:pr-1">
              {promptList.map((item) => (
                <button
                  key={`${item.itemCode}-${item.prompt}`}
                  onClick={() => handlePromptClick(item.prompt)}
                  className="group grid w-full grid-cols-[34px_1fr] gap-4 text-left transition-transform duration-200 hover:-translate-x-1"
                >
                  <span className="ether-micro ether-faint pt-1">{item.itemCode}</span>
                  <span>
                    <span className="ether-micro block text-white/64">{item.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-white/78 lg:line-clamp-1">
                      {item.prompt}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <div
        className="ether-scroll h-full overflow-y-auto overflow-x-hidden"
        style={{
          scrollbarWidth: 'thin',
          scrollBehavior: 'smooth',
        }}
      >
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 lg:px-6">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onExecuteSwap={onExecuteSwap} />
          ))}

          {isLoading && (
            <div className="flex gap-4 group">
              <div className="ether-panel h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                <img
                  src="/hedron-bot.png"
                  alt="Hedron 机器人"
                  className="h-full w-full object-cover opacity-80"
                />
              </div>
              <div className="max-w-[85%] flex-1">
                <div className="ether-panel inline-block px-5 py-4">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-200/80" />
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-200/80" style={{ animationDelay: '0.15s' }} />
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-200/80" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-8" />
        </div>
      </div>
    </div>
  );
}
