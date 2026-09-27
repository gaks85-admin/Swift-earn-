import React, { useEffect, useRef } from 'react';

/**
 * Adsterra 160x300 Skyscraper Banner Component
 *
 * SPECIFICATION & SAFETY CONSTRAINTS:
 * 1. Uses exact Adsterra configuration:
 *    - key: '19fdddf79609bef82482ac6176d8ee77'
 *    - format: 'iframe'
 *    - height: 300
 *    - width: 160
 *    - params: {}
 *    - script src: 'https://www.highrevenueformat.com/19fdddf79609bef82482ac6176d8ee77/invoke.js'
 * 2. Complete isolation inside an embedded iframe with its own clean document context (srcdoc).
 *    - Prevents document.write violations or collisions with React SPA routing.
 *    - Prevents global window pollution in the main application.
 *    - Guarantees zero duplicate scripts in document.head across navigations and remounts.
 *    - Ensures React StrictMode unmount/remount cleanups properly destroy and recreate the ad container cleanly.
 * 3. Pure monetization layer:
 *    - Does NOT trigger, listen for, or dispatch any user rewards or wallet events.
 *    - Viewing, loading, or clicking this advertisement NEVER credits a user's wallet.
 *    - Clear "ADVERTISEMENT" labeling conforming to advertising standards.
 * 4. Responsive & Mobile-friendly:
 *    - Exactly 160px by 300px native ad size.
 *    - Container width designed to avoid horizontal scrolling on any mobile device (>= 320px).
 *    - Styled with Swift Earn design system (rounded-3xl, zinc borders, shadow-xs).
 */
export const AdsterraBanner160x300: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset container contents to prevent duplicate ad containers or scripts on remount/Strict Mode
    container.innerHTML = '';

    // Create an isolated iframe for the Adsterra 160x300 invocation
    const iframe = document.createElement('iframe');
    iframe.title = 'Advertisement 160x300';
    iframe.width = '160';
    iframe.height = '300';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameBorder', '0');
    iframe.style.width = '160px';
    iframe.style.height = '300px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';

    // Exact Adsterra 160x300 code wrapped in a clean, self-contained HTML document
    const adDocumentContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=160, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 160px;
      height: 300px;
      overflow: hidden;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '19fdddf79609bef82482ac6176d8ee77',
      'format' : 'iframe',
      'height' : 300,
      'width' : 160,
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="https://www.highrevenueformat.com/19fdddf79609bef82482ac6176d8ee77/invoke.js"></script>
</body>
</html>`;

    iframe.srcdoc = adDocumentContent;
    container.appendChild(iframe);

    return () => {
      // Clean up completely when component unmounts
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <section aria-label="Sponsored Advertisement (160x300)" className="w-full flex justify-center my-6 overflow-hidden">
      <div className="w-full max-w-[220px] sm:max-w-[240px] bg-white rounded-3xl px-3 py-4 sm:p-5 border border-zinc-200/80 shadow-xs flex flex-col items-center overflow-hidden">
        {/* Ad Header Label */}
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px]">
              ADVERTISEMENT
            </span>
          </div>
          <span className="text-zinc-400 text-[10px] font-mono">
            160 × 300
          </span>
        </div>

        {/* Adsterra 160x300 Ad Container - Fixed native dimensions prevent Cumulative Layout Shift (CLS) */}
        <div
          ref={containerRef}
          className="w-[160px] h-[300px] bg-zinc-50 rounded-2xl overflow-hidden flex items-center justify-center relative border border-zinc-100 shadow-inner"
          aria-label="Advertisement Container (160x300)"
        >
          {/* Subtle placeholder while iframe initializes */}
          <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-xs font-medium pointer-events-none text-center px-2">
            Sponsored Partner Ad
          </div>
        </div>

        {/* Ad Footer Note - Clarifying monetization separation and no reward connection */}
        <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400 leading-normal">
            Monetization partner. Views or clicks do not generate wallet rewards.
          </p>
        </div>
      </div>
    </section>
  );
};
