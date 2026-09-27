import React from 'react';

export const EarnLoadingState: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/70 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100" />
            <div className="w-16 h-6 rounded-full bg-zinc-100" />
          </div>
          <div className="space-y-2">
            <div className="w-3/4 h-5 rounded-lg bg-zinc-100" />
            <div className="w-full h-3.5 rounded-lg bg-zinc-100" />
            <div className="w-2/3 h-3.5 rounded-lg bg-zinc-100" />
          </div>
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div className="w-16 h-4 rounded-md bg-zinc-100" />
            <div className="w-20 h-10 rounded-xl bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
};
