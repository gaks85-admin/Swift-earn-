import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    aclib?: {
      runAutoTag: (config: { zoneId: string }) => void;
      [key: string]: any;
    };
  }
}

interface AdcashAutotagProps {
  className?: string;
}

/**
 * AdcashAutotag Component
 *
 * Implements Adcash Autotag zone ID: qxrkiekemj
 *
 * SPECIFICATION & SAFETY CONSTRAINTS:
 * 1. Step 1: Loads //acscdn.com/script/aclib.js globally once (with id="aclib").
 * 2. Step 2: Executes aclib.runAutoTag({ zoneId: 'qxrkiekemj' }) exactly once per session.
 * 3. Deduplication: Checks document.getElementById('aclib') and global window execution guards to
 *    prevent duplicate script injections or multiple execution calls on React component re-renders.
 * 4. Error Resilience: If network fails, ad blocker blocks acscdn.com, or aclib is unavailable,
 *    gracefully handles without breaking React runtime or application flow.
 * 5. Pure Monetization Layer: Zero connection to user wallet, ledger, reward sessions, or claims.
 *    No client-side rewards are created.
 * 6. Non-intrusive presentation: Neutral "Sponsored" / "Advertisement" labeling, no provider branding shown to normal users.
 */
export const AdcashAutotag: React.FC<AdcashAutotagProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const ZONE_ID = 'qxrkiekemj';

    const runAdcash = () => {
      try {
        if (typeof window !== 'undefined' && window.aclib && typeof window.aclib.runAutoTag === 'function') {
          // Guard against running multiple times if already active
          const guardKey = `__adcash_autotag_run_${ZONE_ID}`;
          if ((window as any)[guardKey]) {
            return;
          }
          (window as any)[guardKey] = true;
          window.aclib.runAutoTag({
            zoneId: ZONE_ID,
          });
        }
      } catch (err) {
        console.warn('Notice: Adcash Autotag execution notice:', err);
      }
    };

    // Step 1: Check if script #aclib already exists in document
    const existingScript = document.getElementById('aclib') as HTMLScriptElement | null;

    if (existingScript) {
      if (window.aclib) {
        runAdcash();
      } else {
        existingScript.addEventListener('load', runAdcash, { once: true });
      }
      return;
    }

    // Load aclib script once
    const script = document.createElement('script');
    script.id = 'aclib';
    script.type = 'text/javascript';
    script.src = '//acscdn.com/script/aclib.js';
    script.async = true;

    script.onload = () => {
      runAdcash();
    };

    script.onerror = () => {
      // Graceful fallback: Network blocked or adblocker active
      console.warn('Notice: Adcash script (aclib.js) could not be loaded or was blocked.');
    };

    document.head.appendChild(script);
  }, []);

  return (
    <section
      aria-label="Sponsored Content"
      className={`w-full flex justify-center my-4 overflow-hidden ${className}`}
    >
      <div className="w-full max-w-3xl bg-white rounded-3xl px-4 py-5 sm:p-6 border border-zinc-200/90 shadow-xs flex flex-col items-center overflow-hidden">
        {/* Subtle Header Label */}
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px]">
              ADVERTISEMENT
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-400 font-medium">Sponsored Channel</span>
          </div>
          <span className="text-zinc-400 text-[10px] font-mono">
            Automated Tag
          </span>
        </div>

        {/* Mounting anchor for autotag injections */}
        <div
          ref={containerRef}
          id="adcash-autotag-anchor"
          className="w-full min-h-[50px] flex items-center justify-center text-center text-xs text-zinc-400 py-2"
        >
          <span className="text-[11px] text-zinc-400">
            Sponsored Partner Content
          </span>
        </div>

        {/* Footer Disclosure */}
        <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400 leading-normal">
            Sponsored advertising. Interactions do not generate wallet rewards.
          </p>
        </div>
      </div>
    </section>
  );
};
