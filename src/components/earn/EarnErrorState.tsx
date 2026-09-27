import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface EarnErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export const EarnErrorState: React.FC<EarnErrorStateProps> = ({
  message,
  onRetry,
}) => {
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 text-center max-w-md mx-auto space-y-3 shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-base font-extrabold text-zinc-900">
          Unable to load opportunities
        </h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
          {message || 'Please try again in a few moments.'}
        </p>
      </div>
      <div className="pt-2">
        <button
          onClick={onRetry}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
};
