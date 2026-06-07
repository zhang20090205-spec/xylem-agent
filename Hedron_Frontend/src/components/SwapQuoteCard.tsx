import React from 'react';
import { ArrowRight, ExternalLink, TrendingUp, Zap } from 'lucide-react';
import { SwapQuoteData } from '../types/chat';

interface SwapQuoteCardProps {
  quote: SwapQuoteData;
  onExecuteSwap?: (quote: SwapQuoteData) => void;
}

export default function SwapQuoteCard({ quote, onExecuteSwap }: SwapQuoteCardProps) {
  const formatFees = (fees: number[]) => {
    return fees.map((fee) => `${(fee / 10000).toFixed(2)}%`).join(', ');
  };

  const handleExecuteClick = () => {
    if (onExecuteSwap) {
      onExecuteSwap(quote);
    }
  };

  return (
    <div className="ether-panel my-3 overflow-hidden">
      <div className="border-b border-white/12 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center border border-orange-100/24 bg-orange-200/12 text-orange-100">
              <TrendingUp size={14} />
            </div>
            <div>
              <h3 className="ether-micro text-white/84">SWAP QUOTE / 报价</h3>
              <span className="ether-micro ether-faint">{quote.network}</span>
            </div>
          </div>
          <div className="ether-micro ether-label text-right">
            {quote.operation === 'get_amounts_out' ? '精确输入' : '精确输出'}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between border border-white/12 bg-white/6 p-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/16 bg-white/8">
              {quote.input.token === 'HBAR' ? (
                <img src="/hedera-hbar-logo.png" alt="HBAR" className="h-5 w-5" />
              ) : (
                <span className="ether-micro text-white/86">{quote.input.token}</span>
              )}
            </div>
            <div>
              <div className="ether-serif text-2xl text-white/92">{quote.input.formatted}</div>
              <div className="ether-micro ether-faint">{quote.input.token}</div>
            </div>
          </div>

          <div className="mx-4 text-white/42">
            <ArrowRight size={16} />
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="text-right">
              <div className="ether-serif text-2xl text-white/92">{quote.output.formatted}</div>
              <div className="ether-micro ether-faint">{quote.output.token}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/16 bg-white/8">
              {quote.output.token === 'SAUCE' ? (
                <img src="/SauceIcon.png" alt="SAUCE" className="h-5 w-5" />
              ) : quote.output.token === 'HBAR' ? (
                <img src="/hedera-hbar-logo.png" alt="HBAR" className="h-5 w-5" />
              ) : (
                <span className="ether-micro text-white/86">{quote.output.token}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
          <div className="border border-white/10 bg-white/5 p-2">
            <div className="ether-micro ether-faint">RATE</div>
            <div className="mt-1 font-medium text-white/84">
              1 {quote.input.token} = {quote.exchangeRate} {quote.output.token}
            </div>
          </div>

          <div className="border border-white/10 bg-white/5 p-2">
            <div className="ether-micro ether-faint">FEES</div>
            <div className="mt-1 font-medium text-white/84">{formatFees(quote.fees)}</div>
          </div>

          {quote.gasEstimate && (
            <div className="col-span-2 border border-white/10 bg-white/5 p-2">
              <div className="ether-micro ether-faint">GAS</div>
              <div className="mt-1 font-medium text-white/84">{quote.gasEstimate}</div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {onExecuteSwap && (
            <button
              onClick={handleExecuteClick}
              className="ether-button flex flex-1 items-center justify-center gap-2 px-4 py-3"
            >
              <Zap size={15} />
              执行 Swap
            </button>
          )}

          <button
            onClick={() => window.open('https://www.saucerswap.finance/swap', '_blank')}
            className="ether-button flex flex-1 items-center justify-center gap-2 px-4 py-3"
          >
            <ExternalLink size={14} />
            SaucerSwap
          </button>
        </div>

        <div className="ether-micro ether-faint mt-3 border-t border-white/10 pt-3 text-center">
          SOURCE: SaucerSwap V2 QuoterV2
        </div>
      </div>
    </div>
  );
}
