import React from 'react';
import { Sparkles } from 'lucide-react';

export const EarnEmptyState: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200/90 text-center max-w-lg mx-auto space-y-3 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#6C2BD9] flex items-center justify-center mx-auto shadow-xs">
        <Sparkles className="w-7 h-7 text-[#6C2BD9]" />
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-extrabold text-zinc-900">
          No earning opportunities available right now
        </h3>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
          New opportunities will appear here when available. Check back soon for new ways to earn.
        </p>
      </div>
    </div>
  );
};
