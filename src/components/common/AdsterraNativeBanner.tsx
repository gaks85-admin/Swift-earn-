import React, { useEffect, useRef, useState } from 'react';

/**
 * Adsterra Native Banner Component
 *
 * SPECIFICATION & SAFETY CONSTRAINTS:
 * 1. Uses exact Adsterra Native Banner code:
 *    <script async="async" data-cfasync="false" src="https://pl31509037.profitableratecpmnetwork.com/bf906121812d35d5e2018e59c9fc4d0a/invoke.js"></script>
 *    <div id="container-bf906121812d35d5e2018e59c9fc4d0a"></div>
 * 2. Complete isolation inside an embedded iframe with its own clean document context (srcdoc).
 *    - Prevents document.write violations or collisions with React SPA routing.
 *    - Prevents global window pollution in the main application.
 *    - Guarantees zero duplicate scripts in document.head across navigations and remounts.
 *    - StrictMode unmount/remount cleanups properly destroy and recreate the ad container cleanly.
 * 3. Responsive Native Dimensions:
 *    - The Native Banner container naturally adapts to responsive layouts.
 *    - Dynamic height notification keeps the iframe seamlessly sized without internal scrollbars.
 * 4. Pure monetization layer:
 *    - Does NOT trigger, listen for, or dispatch any user rewards or wallet events.
 *    - Viewing, loading, or clicking this advertisement NEVER credits a user's wallet.
 *    - Clear "ADVERTISEMENT" labeling conforming to advertising standards.
 *    - Explicit disclosure: "Monetization partner. Views or clicks do not generate wallet rewards."
 */
export const AdsterraNativeBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [frameHeight, setFrameHeight] = useState<number>(220);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === 'ADSTERRA_NATIVE_RESIZE' &&
        typeof event.data.height === 'number'
      ) {
        // Enforce safe bounds (minimum 140px, maximum 800px)
        const safeHeight = Math.max(140, Math.min(event.data.height, 800));
        setFrameHeight(safeHeight);
        if (iframeRef.current) {
          iframeRef.current.style.height = `${safeHeight}px`;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset container contents to prevent duplicate ad containers or scripts on remount/Strict Mode
    container.innerHTML = '';

    // Create an isolated iframe for the Adsterra Native Banner invocation
    const iframe = document.createElement('iframe');
    iframe.title = 'Advertisement Native Banner';
    iframe.width = '100%';
    iframe.height = `${frameHeight}`;
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameBorder', '0');
    iframe.style.width = '100%';
    iframe.style.height = `${frameHeight}px`;
    iframe.style.minHeight = '140px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';

    // Exact Adsterra Native Banner code wrapped in an isolated HTML document
    const adDocumentContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: transparent;
      overflow-x: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #container-bf906121812d35d5e2018e59c9fc4d0a {
      width: 100%;
      min-height: 120px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <script async="async" data-cfasync="false" src="https://pl31509037.profitableratecpmnetwork.com/bf906121812d35d5e2018e59c9fc4d0a/invoke.js"></script>
  <div id="container-bf906121812d35d5e2018e59c9fc4d0a"></div>
  <script>
    function notifyHeight() {
      var h = document.body.scrollHeight || document.documentElement.scrollHeight;
      if (h > 60) {
        window.parent.postMessage({ type: 'ADSTERRA_NATIVE_RESIZE', height: h }, '*');
      }
    }
    window.addEventListener('load', notifyHeight);
    if (window.ResizeObserver) {
      new ResizeObserver(notifyHeight).observe(document.body);
    }
    setInterval(notifyHeight, 1500);
  </script>
</body>
</html>`;

    iframe.srcdoc = adDocumentContent;
    iframeRef.current = iframe;
    container.appendChild(iframe);

    return () => {
      iframeRef.current = null;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <section aria-label="Sponsored Advertisement (Native Banner)" className="w-full flex justify-center my-4 overflow-hidden">
      <div className="w-full max-w-3xl bg-white rounded-3xl px-3 py-4 sm:p-5 border border-zinc-200/80 shadow-xs flex flex-col items-center overflow-hidden">
        {/* Ad Header Label */}
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px]">
              ADVERTISEMENT
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-400 font-medium">Sponsored Native Partner</span>
          </div>
          <span className="text-zinc-400 text-[10px] font-mono">
            Native Format
          </span>
        </div>

        {/* Adsterra Native Ad Container - Fluid responsive width and height */}
        <div
          ref={containerRef}
          className="w-full min-h-[140px] bg-zinc-50 rounded-2xl overflow-hidden relative border border-zinc-100 shadow-inner flex items-center justify-center"
          aria-label="Advertisement Container (Native)"
        >
          {/* Subtle placeholder while iframe initializes */}
          <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-xs font-medium pointer-events-none text-center px-4">
            Sponsored Native Partner Content
          </div>
        </div>

        {/* Ad Footer Note - Exact requested disclosure */}
        <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400 leading-normal">
            Monetization partner. Views or clicks do not generate wallet rewards.
          </p>
        </div>
      </div>
    </section>
  );
};
