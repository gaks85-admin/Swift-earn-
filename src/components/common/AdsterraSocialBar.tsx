import React, { useEffect, useRef, useState } from 'react';

/**
 * Adsterra Social Bar Component
 *
 * SPECIFICATION & SAFETY CONSTRAINTS:
 * 1. Uses exact Adsterra Social Bar script:
 *    <script src="https://pl31509036.profitableratecpmnetwork.com/5b/95/45/5b954594df6cae28c02ab04107b8539a.js"></script>
 * 2. Complete isolation inside an embedded iframe with its own clean document context (srcdoc).
 *    - Prevents document.write violations or collisions with React SPA routing.
 *    - Prevents global window/document pollution in the main application.
 *    - Protects the fixed bottom navigation bar (#swift-earn-bottom-nav) from being hijacked or obscured.
 *    - Guarantees zero duplicate scripts in document.head across navigations and remounts.
 *    - StrictMode unmount/remount cleanups properly destroy and recreate the ad container cleanly.
 * 3. Fluid Overlay Architecture:
 *    - The Social Bar is a rich-media floating/overlay format.
 *    - Embedded within a responsive, isolated fluid container rather than a rigid fixed-size box.
 *    - Dynamic height notification keeps the iframe seamlessly sized without internal scrollbars.
 * 4. Pure monetization layer:
 *    - Does NOT trigger, listen for, or dispatch any user rewards or wallet events.
 *    - Viewing, loading, or clicking this advertisement NEVER credits a user's wallet.
 *    - Clear "ADVERTISEMENT" labeling conforming to advertising standards.
 *    - Explicit disclosure: "Monetization partner. Views or clicks do not generate wallet rewards."
 */
export const AdsterraSocialBar: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [frameHeight, setFrameHeight] = useState<number>(180);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === 'ADSTERRA_SOCIAL_BAR_RESIZE' &&
        typeof event.data.height === 'number'
      ) {
        // Enforce safe bounds (minimum 140px, maximum 500px)
        const safeHeight = Math.max(140, Math.min(event.data.height, 500));
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

    // Create an isolated iframe for the Adsterra Social Bar invocation
    const iframe = document.createElement('iframe');
    iframe.title = 'Advertisement Social Bar';
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

    // Exact Adsterra Social Bar script wrapped in an isolated HTML document
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
      height: 100%;
      background: transparent;
      overflow-x: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <script src="https://pl31509036.profitableratecpmnetwork.com/5b/95/45/5b954594df6cae28c02ab04107b8539a.js"></script>
  <script>
    function notifyHeight() {
      var h = document.body.scrollHeight || document.documentElement.scrollHeight;
      if (h > 60) {
        window.parent.postMessage({ type: 'ADSTERRA_SOCIAL_BAR_RESIZE', height: h }, '*');
      }
    }
    window.addEventListener('load', notifyHeight);
    if (window.ResizeObserver) {
      new ResizeObserver(notifyHeight).observe(document.body);
    }
    setInterval(notifyHeight, 2000);
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
    <section aria-label="Sponsored Advertisement (Social Bar)" className="w-full flex justify-center my-4 overflow-hidden">
      <div className="w-full max-w-3xl bg-white rounded-3xl px-3 py-4 sm:p-5 border border-zinc-200/80 shadow-xs flex flex-col items-center overflow-hidden">
        {/* Ad Header Label */}
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px]">
              ADVERTISEMENT
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-400 font-medium">Sponsored Social Bar</span>
          </div>
          <span className="text-zinc-400 text-[10px] font-mono">
            Rich Media Overlay
          </span>
        </div>

        {/* Adsterra Social Bar Ad Container - Fluid responsive width and height */}
        <div
          ref={containerRef}
          className="w-full min-h-[140px] bg-zinc-50 rounded-2xl overflow-hidden relative border border-zinc-100 shadow-inner flex items-center justify-center"
          aria-label="Advertisement Container (Social Bar)"
        >
          {/* Subtle placeholder while iframe initializes */}
          <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-xs font-medium pointer-events-none text-center px-4">
            Sponsored Social Bar Overlay
          </div>
        </div>

        {/* Ad Footer Note - Exact disclosure */}
        <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400 leading-normal">
            Monetization partner. Views or clicks do not generate wallet rewards.
          </p>
        </div>
      </div>
    </section>
  );
};
