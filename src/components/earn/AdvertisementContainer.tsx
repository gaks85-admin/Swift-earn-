import React from 'react';

interface AdvertisementContainerProps {
  label?: string;
  formatNotice?: string;
  children: React.ReactNode;
}

export const AdvertisementContainer: React.FC<AdvertisementContainerProps> = ({
  label = 'Sponsored Content',
  formatNotice,
  children,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-3xl p-4 sm:p-6 border border-zinc-200/90 shadow-xs flex flex-col items-center overflow-hidden">
      {/* Subtle Ad Header */}
      <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px]">
            ADVERTISEMENT
          </span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-400 font-medium">{label}</span>
        </div>
        {formatNotice && (
          <span className="text-zinc-400 text-[10px] font-mono">
            {formatNotice}
          </span>
        )}
      </div>

      {/* Main Ad Content Slot */}
      <div className="w-full flex justify-center items-center overflow-hidden py-1">
        {children}
      </div>

      {/* Subtle Ad Footer Disclosure */}
      <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
        <p className="text-[10px] text-zinc-400 leading-normal">
          Sponsored content helps support Swift Earn. Views or interactions do not generate wallet rewards.
        </p>
      </div>
    </div>
  );
};
