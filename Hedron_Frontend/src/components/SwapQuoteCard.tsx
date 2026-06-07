import React from 'react';
import { ArrowRight, TrendingUp, Zap, ExternalLink } from 'lucide-react';
import { SwapQuoteData } from '../types/chat';

interface SwapQuoteCardProps {
  quote: SwapQuoteData;
  onExecuteSwap?: (quote: SwapQuoteData) => void;
}

export default function SwapQuoteCard({ quote, onExecuteSwap }: SwapQuoteCardProps) {
  const formatFees = (fees: number[]) => {
    return fees.map(fee => `${(fee / 10000).toFixed(2)}%`).join(', ');
  };

  const handleExecuteClick = () => {
    if (onExecuteSwap) {
      onExecuteSwap(quote);
    }
  };

  return (
    <div className="bg-theme-bg-secondary dark:bg-gray-800 rounded-xl border border-theme-border-primary dark:border-gray-700 shadow-theme-md my-3 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-4 py-3 border-b border-theme-border-primary dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-text-primary">💱 Swap Quote</h3>
              <span className="text-xs text-theme-text-secondary capitalize">{quote.network}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-theme-text-secondary">
              {quote.operation === 'get_amounts_out' ? 'Exact Input' : 'Exact Output'}
            </div>
          </div>
        </div>
      </div>

      {/* Trade Details - More Compact */}
      <div className="p-4">
        <div className="flex items-center justify-between bg-theme-bg-primary dark:bg-gray-700/50 rounded-lg p-3 mb-3">
          {/* You Pay */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-theme-bg-secondary dark:bg-gray-600 rounded-full flex items-center justify-center border border-theme-border-primary dark:border-gray-600">
              {quote.input.token === 'HBAR' ? (
                <img 
                  src="/hedera-hbar-logo.png" 
                  alt="HBAR" 
                  className="w-5 h-5"
                />
              ) : (
                <span className="text-xs font-bold text-theme-text-primary">{quote.input.token}</span>
              )}
            </div>
            <div>
              <div className="text-lg font-bold text-theme-text-primary">{quote.input.formatted}</div>
              <div className="text-xs text-theme-text-secondary">{quote.input.token}</div>
            </div>
          </div>

          {/* Arrow */}
          <div className="mx-4">
            <ArrowRight size={16} className="text-theme-text-secondary" />
          </div>

          {/* You Receive */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="text-right">
              <div className="text-lg font-bold text-theme-text-primary">{quote.output.formatted}</div>
              <div className="text-xs text-theme-text-secondary">{quote.output.token}</div>
            </div>
            <div className="w-8 h-8 bg-theme-bg-secondary dark:bg-gray-600 rounded-full flex items-center justify-center border border-theme-border-primary dark:border-gray-600">
              {quote.output.token === 'SAUCE' ? (
                <img 
                  src="/SauceIcon.png" 
                  alt="SAUCE" 
                  className="w-5 h-5"
                />
              ) : quote.output.token === 'HBAR' ? (
                <img 
                  src="/hedera-hbar-logo.png" 
                  alt="HBAR" 
                  className="w-5 h-5"
                />
              ) : (
                <span className="text-xs font-bold text-theme-text-primary">{quote.output.token}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quote Metadata - Compact Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <div className="bg-theme-bg-primary dark:bg-gray-700/30 rounded-lg p-2">
            <div className="text-theme-text-secondary">Exchange Rate</div>
            <div className="font-medium text-theme-text-primary">
              1 {quote.input.token} = {quote.exchangeRate} {quote.output.token}
            </div>
          </div>
          
          <div className="bg-theme-bg-primary dark:bg-gray-700/30 rounded-lg p-2">
            <div className="text-theme-text-secondary">Fees</div>
            <div className="font-medium text-theme-text-primary">{formatFees(quote.fees)}</div>
          </div>

          {quote.gasEstimate && (
            <div className="bg-theme-bg-primary dark:bg-gray-700/30 rounded-lg p-2 col-span-2">
              <div className="text-theme-text-secondary">Gas Estimate</div>
              <div className="font-medium text-theme-text-primary">{quote.gasEstimate}</div>
            </div>
          )}
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex gap-2">
          {onExecuteSwap && (
            <button
              onClick={handleExecuteClick}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-theme-sm hover:shadow-theme-md"
            >
              <Zap size={16} />
              Execute Swap
            </button>
          )}
          
          <button 
            onClick={() => window.open('https://www.saucerswap.finance/swap', '_blank')}
            className="flex-1 bg-theme-bg-primary dark:bg-gray-700 hover:bg-theme-bg-tertiary dark:hover:bg-gray-600 text-theme-text-primary font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-theme-border-primary dark:border-gray-600 text-sm"
          >
            <ExternalLink size={14} />
            SaucerSwap
          </button>
        </div>

        {/* Source Info - Compact */}
        <div className="mt-3 pt-3 border-t border-theme-border-primary dark:border-gray-700">
          <div className="text-xs text-theme-text-tertiary text-center">
            Quote from SaucerSwap V2 QuoterV2 Contract
          </div>
        </div>
      </div>
    </div>
  );
}