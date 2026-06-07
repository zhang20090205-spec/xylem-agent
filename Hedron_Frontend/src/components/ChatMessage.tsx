import { Bot, User, Settings, CreditCard, CheckCircle, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types/chat';
import SwapQuoteCard from './SwapQuoteCard';

interface ChatMessageProps {
  message: Message;
  onExecuteSwap?: (content: string) => void;
}

export default function ChatMessage({ message, onExecuteSwap }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isAI = message.sender === 'ai';
  
  const getIcon = () => {
    if (isUser) return <User size={18} />;
    if (isSystem) {
      if (message.hasTransaction) {
        return message.transactionData?.status === 'success' 
          ? <CheckCircle size={18} />
          : <CreditCard size={18} />;
      }
      return <Settings size={18} />;
    }
    // This won't be used for bot messages since they render image directly
    return <Bot size={18} />;
  };

  const getAvatarStyle = () => {
    if (isUser) {
      return 'bg-gradient-to-br from-blue-600 to-blue-700 text-white';
    }
    if (isSystem) {
      if (message.hasTransaction) {
        return message.transactionData?.status === 'success'
          ? 'bg-gradient-to-br from-green-600 to-green-700 text-white'
          : 'bg-gradient-to-br from-orange-600 to-orange-700 text-white';
      }
      return 'bg-gradient-to-br from-purple-600 to-purple-700 text-white';
    }
    // For assistant/bot messages, no background - just the image
    return '';
  };

  const getCopyText = (): string => {
    if (message.swapQuote && !message.content) {
      const q = message.swapQuote;
      const fees = q.fees.map((f) => `${(f / 10000).toFixed(2)}%`).join(', ');
      const op = q.operation === 'get_amounts_out' ? 'Exact Input' : 'Exact Output';
      return `Swap Quote (${q.network}, ${op})\n` +
        `You pay: ${q.input.formatted} ${q.input.token}\n` +
        `You receive: ${q.output.formatted} ${q.output.token}\n` +
        `Rate: 1 ${q.input.token} = ${q.exchangeRate} ${q.output.token}\n` +
        `Fees: ${fees}` + (q.gasEstimate ? `\nGas: ${q.gasEstimate}` : '');
    }
    return message.content;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // noop
    }
  };

  const getMessageStyle = () => {
    if (isUser) {
      return 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md';
    }
    if (isSystem) {
      if (message.hasTransaction) {
        return message.transactionData?.status === 'success'
          ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700 rounded-bl-md'
          : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-700 rounded-bl-md';
      }
      return 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700 rounded-bl-md';
    }
    return 'bg-theme-bg-secondary dark:bg-gray-800 text-theme-text-primary rounded-bl-md border border-theme-border-primary dark:border-gray-700';
  };

  // Function to detect and parse ASCII tables
  const parseTableData = (content: string) => {
    const lines = content.split('\n');
    const tables: Array<{
      startIndex: number;
      endIndex: number;
      headers: string[];
      rows: string[][];
    }> = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Look for table patterns - lines with multiple | characters
      if (line.includes('|') && line.split('|').length >= 3) {
        // Check if this looks like a header row
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
        
        // Look ahead to see if next line is a separator (dashes)
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const isSeparator = nextLine.includes('-') && nextLine.includes('|');
          
          if (isSeparator || (cells.length >= 2)) {
            // Found a table! Parse it
            const headers = cells;
            const rows: string[][] = [];
            
            let tableStartIndex = i;
            let currentIndex = isSeparator ? i + 2 : i + 1; // Skip separator if present
            
            // Parse data rows
            while (currentIndex < lines.length) {
              const rowLine = lines[currentIndex];
              if (rowLine.includes('|') && rowLine.split('|').length >= 3) {
                const rowCells = rowLine.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
                if (rowCells.length > 0) {
                  rows.push(rowCells);
                  currentIndex++;
                } else {
                  break;
                }
              } else {
                break;
              }
            }
            
            if (rows.length > 0) {
              tables.push({
                startIndex: tableStartIndex,
                endIndex: currentIndex - 1,
                headers,
                rows
              });
            }
            
            i = currentIndex;
            continue;
          }
        }
      }
      i++;
    }
    
    return tables;
  };

  // Function to fix potential balance formatting issues
  const fixBalanceFormatting = (text: string): string => {
    // More conservative approach: only fix very specific decimal formatting issues
    // Look for patterns like "39,08 HBAR" (European decimal format) and convert to "39.08 HBAR"
    
    // First, normalize European decimal format (comma) to US format (dot)
    let result = text.replace(/(\d+),(\d{1,2})\s+HBAR/g, '$1.$2 HBAR');
    
    // Only apply balance corrections for very specific cases where we're confident
    // This is more conservative to avoid over-correcting user input
    const suspiciousPatterns = [
      // Only correct if it matches very specific "display balance" contexts
      /Your current balance:\s*(\d{1,2})\.(\d{1,2})\s+HBAR/g,
      /Balance:\s*(\d{1,2})\.(\d{1,2})\s+HBAR/g,
      /Available:\s*(\d{1,2})\.(\d{1,2})\s+HBAR/g
    ];
    
    suspiciousPatterns.forEach(pattern => {
      result = result.replace(pattern, (match, whole, decimal) => {
        const numValue = parseFloat(`${whole}.${decimal}`);
        
        // Only correct if it's a very small balance that looks like a display error
        if (numValue > 0 && numValue < 50) {
          const correctedValue = numValue * 10;
          if (correctedValue > 100 && correctedValue < 10000) {
            console.log(`🔧 Correcting HBAR balance display: ${numValue} → ${correctedValue}`);
            return match.replace(`${whole}.${decimal}`, correctedValue.toFixed(2));
          }
        }
        
        return match;
      });
    });
    
    return result;
  };

  // Simple icon replacement for table content
  const renderTextWithIcons = (text: string) => {
    // First fix any balance formatting issues
    const fixedText = fixBalanceFormatting(text);
    
    if (fixedText.includes('::BONZO::') || fixedText.includes('::SAUCERSWAP::') || fixedText.includes('::HEDERA::')) {
      const parts = fixedText.split(/(::BONZO::|::SAUCERSWAP::|::HEDERA::)/);
      return parts.map((part, index) => {
        if (part === '::BONZO::') {
          return (
            <img
              key={index}
              src="/BonzoIcon.png"
              alt="Bonzo Finance"
              className="inline-block w-12 h-12 mx-1 align-text-bottom"
            />
          );
        }
        if (part === '::SAUCERSWAP::') {
          return (
            <img
              key={index}
              src="/SauceIcon.png"
              alt="SaucerSwap"
              className="inline-block w-10 h-10 mx-1 align-text-bottom"
            />
          );
        }
        if (part === '::HEDERA::') {
          return (
            <img
              key={index}
              src="/hedera-hbar-logo.png"
              alt="Hedera"
              className="inline-block w-10 h-10 mx-1 align-text-bottom"
            />
          );
        }
        return part;
      });
    }
    return fixedText;
  };

  const renderTable = (headers: string[], rows: string[][], index: number) => {
    return (
      <div key={index} className="my-4 overflow-x-auto">
        <table className="min-w-full border border-theme-border-primary dark:border-gray-600 rounded-lg overflow-hidden">
          <thead className="bg-theme-bg-secondary dark:bg-gray-700">
            <tr>
              {headers.map((header, i) => {
                const headerText = header.replace(/\*\*/g, '');
                return (
                  <th 
                    key={i} 
                    className="px-4 py-3 text-left text-sm font-semibold text-theme-text-primary dark:text-white border-r border-theme-border-primary dark:border-gray-600 last:border-r-0"
                  >
                    {renderTextWithIcons(headerText)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-theme-bg-primary dark:bg-gray-800">
            {rows.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className={`${rowIndex % 2 === 0 ? 'bg-theme-bg-primary dark:bg-gray-800' : 'bg-theme-bg-secondary/50 dark:bg-gray-700/50'} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}
              >
                {row.map((cell, cellIndex) => {
                  const cellText = cell.replace(/\*\*/g, '');
                  return (
                    <td 
                      key={cellIndex}
                      className="px-4 py-3 text-sm text-theme-text-primary dark:text-gray-300 border-r border-theme-border-primary dark:border-gray-600 last:border-r-0"
                    >
                      {renderTextWithIcons(cellText)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContentWithTables = (content: string) => {
    const tables = parseTableData(content);
    
    if (tables.length === 0) {
      // Fix balance formatting first, then process icons - convert to markdown image syntax
      const fixedContent = fixBalanceFormatting(content);
      const processedContent = fixedContent
        .replace(/::BONZO::/g, '![Bonzo Finance](BonzoIcon.png)')
        .replace(/::SAUCERSWAP::/g, '![SaucerSwap](SauceIcon.png)')
        .replace(/::HEDERA::/g, '![Hedera](hedera-hbar-logo.png)');

      return (
        <ReactMarkdown
          components={{
            h1: (props: any) => (
              <h1 className="text-xl font-bold mb-4 text-theme-text-primary dark:text-white border-b border-theme-border-primary dark:border-gray-600 pb-2">
                {props.children}
              </h1>
            ),
            h2: (props: any) => (
              <h2 className="text-lg font-bold mb-3 text-theme-text-primary dark:text-white">
                {props.children}
              </h2>
            ),
            h3: (props: any) => (
              <h3 className="text-base font-bold mb-3 text-theme-text-primary dark:text-white border-b border-theme-border-primary dark:border-gray-600 pb-1">
                {props.children}
              </h3>
            ),
            p: (props: any) => (
              <p className="mb-3 last:mb-0 leading-relaxed">
                {props.children}
              </p>
            ),
            ul: (props: any) => (
              <ul className="mb-3 space-y-1">
                {props.children}
              </ul>
            ),
            li: (props: any) => (
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 font-bold mt-1">•</span>
                <span className="flex-1">
                  {props.children}
                </span>
              </li>
            ),
            strong: (props: any) => (
              <strong className="font-semibold text-theme-text-primary dark:text-white">
                {props.children}
              </strong>
            ),
            code: (props: any) => (
              <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">
                {props.children}
              </code>
            ),
            pre: (props: any) => (
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto mb-3">
                {props.children}
              </pre>
            ),
            // Custom image renderer for icons
            img: (props: any) => {
              if (props.src === 'BonzoIcon.png') {
                return (
                  <img
                    src={`/${props.src}`}
                    alt={props.alt}
                    className="inline-block w-12 h-12 mx-1 align-text-bottom"
                  />
                );
              }
              if (props.src === 'SauceIcon.png') {
                return (
                  <img
                    src={`/${props.src}`}
                    alt={props.alt}
                    className="inline-block w-10 h-10 mx-1 align-text-bottom"
                  />
                );
              }
              if (props.src === 'hedera-hbar-logo.png') {
                return (
                  <img
                    src={`/${props.src}`}
                    alt={props.alt}
                    className="inline-block w-10 h-10 mx-1 align-text-bottom"
                  />
                );
              }
              return <img {...props} />;
            },
          }}
        >
          {processedContent}
        </ReactMarkdown>
      );
    }

    // Fix balance formatting first, then process icons for tables content too
    const fixedContent = fixBalanceFormatting(content);
    const processedContent = fixedContent
      .replace(/::BONZO::/g, '![Bonzo Finance](BonzoIcon.png)')
      .replace(/::SAUCERSWAP::/g, '![SaucerSwap](SauceIcon.png)')
      .replace(/::HEDERA::/g, '![Hedera](hedera-hbar-logo.png)');

    // Split content by tables and render each part
    const lines = processedContent.split('\n');
    const elements: JSX.Element[] = [];
    let lastEndIndex = -1;

    tables.forEach((table, tableIndex) => {
      // Add content before this table
      if (table.startIndex > lastEndIndex + 1) {
        const beforeContent = lines.slice(lastEndIndex + 1, table.startIndex).join('\n').trim();
        if (beforeContent) {
          elements.push(
            <div key={`before-${tableIndex}`} className="mb-3">
              <ReactMarkdown
                components={{
                  p: (props: any) => (
                    <p className="mb-3 last:mb-0 leading-relaxed">
                      {props.children}
                    </p>
                  ),
                  h3: (props: any) => (
                    <h3 className="text-base font-bold mb-3 text-theme-text-primary dark:text-white border-b border-theme-border-primary dark:border-gray-600 pb-1">
                      {props.children}
                    </h3>
                  ),
                  img: (props: any) => {
                    if (props.src === 'BonzoIcon.png') {
                      return (
                        <img
                          src={`/${props.src}`}
                          alt={props.alt}
                          className="inline-block w-12 h-12 mx-1 align-text-bottom"
                        />
                      );
                    }
                    if (props.src === 'SauceIcon.png') {
                      return (
                        <img
                          src={`/${props.src}`}
                          alt={props.alt}
                          className="inline-block w-10 h-10 mx-1 align-text-bottom"
                        />
                      );
                    }
                    if (props.src === 'hedera-hbar-logo.png') {
                      return (
                        <img
                          src={`/${props.src}`}
                          alt={props.alt}
                          className="inline-block w-10 h-10 mx-1 align-text-bottom"
                        />
                      );
                    }
                    return <img {...props} />;
                  },
                }}
              >
                {beforeContent}
              </ReactMarkdown>
            </div>
          );
        }
      }

      // Add the table (process table content for icons too)
      const processedHeaders = table.headers.map(h => 
        h.replace(/!\[Bonzo Finance\]\(BonzoIcon\.png\)/g, '::BONZO::')
         .replace(/!\[SaucerSwap\]\(SauceIcon\.png\)/g, '::SAUCERSWAP::')
         .replace(/!\[Hedera\]\(hedera-hbar-logo\.png\)/g, '::HEDERA::')
      );
      const processedRows = table.rows.map(row => 
        row.map(cell => 
          cell.replace(/!\[Bonzo Finance\]\(BonzoIcon\.png\)/g, '::BONZO::')
              .replace(/!\[SaucerSwap\]\(SauceIcon\.png\)/g, '::SAUCERSWAP::')
              .replace(/!\[Hedera\]\(hedera-hbar-logo\.png\)/g, '::HEDERA::')
        )
      );
      elements.push(renderTable(processedHeaders, processedRows, tableIndex));
      lastEndIndex = table.endIndex;
    });

    // Add remaining content after the last table
    if (lastEndIndex < lines.length - 1) {
      const afterContent = lines.slice(lastEndIndex + 1).join('\n').trim();
      if (afterContent) {
        elements.push(
          <div key="after-tables" className="mt-3">
            <ReactMarkdown
              components={{
                p: (props: any) => (
                  <p className="mb-3 last:mb-0 leading-relaxed">
                    {props.children}
                  </p>
                ),
                img: (props: any) => {
                  if (props.src === 'BonzoIcon.png') {
                    return (
                      <img
                        src={`/${props.src}`}
                        alt={props.alt}
                        className="inline-block w-12 h-12 mx-1 align-text-bottom"
                      />
                    );
                  }
                  if (props.src === 'SauceIcon.png') {
                    return (
                      <img
                        src={`/${props.src}`}
                        alt={props.alt}
                        className="inline-block w-10 h-10 mx-1 align-text-bottom"
                      />
                    );
                  }
                  if (props.src === 'hedera-hbar-logo.png') {
                    return (
                      <img
                        src={`/${props.src}`}
                        alt={props.alt}
                        className="inline-block w-10 h-10 mx-1 align-text-bottom"
                      />
                    );
                  }
                  return <img {...props} />;
                },
              }}
            >
              {afterContent}
            </ReactMarkdown>
          </div>
        );
      }
    }

    return <div>{elements}</div>;
  };

  const handleSwapExecution = (quote: any) => {
    if (onExecuteSwap) {
      const swapMessage = `Execute swap: ${quote.input.formatted} ${quote.input.token} to ${quote.output.token}`;
      onExecuteSwap(swapMessage);
    }
  };

  const renderMessageContent = () => {
    // If this is an AI message with swap quote data, show ONLY the specialized component
    if (isAI && message.swapQuote) {
      return (
        <SwapQuoteCard 
          quote={message.swapQuote} 
          onExecuteSwap={handleSwapExecution}
        />
      );
    }
    
    if (isAI) {
      return renderContentWithTables(message.content);
    }
    
    return (
      <div className="whitespace-pre-wrap break-words font-medium word-wrap">
        {fixBalanceFormatting(message.content)}
      </div>
    );
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group w-full`}>
      {/* Avatar */}
      {!isUser && !isSystem ? (
        // For bot messages, show image directly without container
        <img 
          src="/hedron-bot.png" 
          alt="Hedron Bot" 
          className="w-10 h-10 object-cover rounded-full flex-shrink-0 shadow-md transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        // For user and system messages, use icon container
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md
          transition-transform duration-200 group-hover:scale-105
          ${getAvatarStyle()}
        `}>
          {getIcon()}
        </div>
      )}

      {/* Message Content */}
      <div className={`
        flex-1 min-w-0 ${isUser ? 'text-right flex flex-col items-end max-w-[85%]' : 'flex flex-col items-start max-w-[85%]'}
      `}>
        <div className={`
          inline-block px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm
          transition-all duration-200 hover:shadow-theme-md w-auto max-w-full
          ${getMessageStyle()}
          relative
        `}>
          {/* Copy button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white focus:outline-none"
              title={copied ? 'Copiado' : 'Copiar mensaje'}
              aria-label={copied ? 'Copiado' : 'Copiar mensaje'}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          {renderMessageContent()}

          {/* Transaction Status Indicator */}
          {message.hasTransaction && message.transactionData && (
            <div className="mt-3 pt-3 border-t border-current opacity-60">
              <div className="flex items-center gap-2 text-xs">
                {message.transactionData.status === 'pending' && (
                  <>
                    <Clock size={14} className="animate-pulse" />
                    <span>Transaction pending...</span>
                  </>
                )}
                {message.transactionData.status === 'success' && (
                  <>
                    <CheckCircle size={14} />
                    <span>Transaction ID: {message.transactionData.transactionId}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`
          text-xs text-theme-text-tertiary mt-2 font-medium px-1
          ${isUser ? 'text-right' : 'text-left'}
        `}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
}