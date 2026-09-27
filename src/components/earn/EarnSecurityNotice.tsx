import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export const EarnSecurityNotice: React.FC = () => {
  return (
    <section
      aria-label="Security and Trust Guarantee"
      className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#6C2BD9] flex items-center justify-center shrink-0 shadow-xs border border-purple-100">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-zinc-900">
            Your rewards are protected
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed max-w-xl">
            Swift Earn verifies eligible reward activity before confirmed rewards are added to your wallet.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full text-[11px] border border-emerald-200/60">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Server Verified</span>
        </span>
      </div>
    </section>
  );
};
