import React, { useEffect, useRef } from 'react';

/**
 * Adsterra 300x250 Mobile-Friendly Banner Container
 *
 * SPECIFICATION & SAFETY CONSTRAINTS:
 * 1. Uses exact Adsterra configuration:
 *    - key: 'b6fba3c20455438dd62a8f00739b7b6a'
 *    - format: 'iframe'
 *    - height: 250
 *    - width: 300
 *    - params: {}
 *    - script src: 'https://www.highrevenueformat.com/b6fba3c20455438dd62a8f00739b7b6a/invoke.js'
 * 2. Complete isolation inside an embedded iframe with its own clean document context.
 *    - Prevents document.write violations or collisions with React SPA routing.
 *    - Prevents global window pollution in the main application.
 *    - Guarantees zero duplicate scripts in document.head across navigations and remounts.
 *    - Ensures React StrictMode unmount/remount cleanups properly destroy and recreate the ad container cleanly.
 * 3. Pure monetization layer:
 *    - Does NOT trigger, listen for, or dispatch any user rewards or wallet events.
 *    - Does NOT incentivize ad clicks or interactions.
 *    - Clear "ADVERTISEMENT" labeling conforming to advertising standards.
 * 4. Responsive & Mobile-friendly:
 *    - Exactly 300px by 250px inside a centered container.
 *    - Fits smoothly on mobile screens (>= 320px) without causing horizontal scrolling.
 *    - Styled with Swift Earn design system (rounded-3xl, zinc borders, purple/lime accents).
 */
export const AdsterraBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset container contents to prevent duplicate ad containers or scripts on remount/Strict Mode
    container.innerHTML = '';

    // Create an isolated iframe for the Adsterra 300x250 invocation
    const iframe = document.createElement('iframe');
    iframe.title = 'Advertisement';
    iframe.width = '300';
    iframe.height = '250';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameBorder', '0');
    iframe.style.width = '300px';
    iframe.style.height = '250px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';

    // Exact Adsterra 300x250 code wrapped in a clean, self-contained HTML document
    const adDocumentContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=300, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 300px;
      height: 250px;
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
      'key' : 'b6fba3c20455438dd62a8f00739b7b6a',
      'format' : 'iframe',
      'height' : 250,
      'width' : 300,
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="https://www.highrevenueformat.com/b6fba3c20455438dd62a8f00739b7b6a/invoke.js"></script>
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
    <section aria-label="Sponsored Advertisement" className="w-full flex justify-center my-6 overflow-hidden">
      <div className="w-full max-w-[340px] sm:max-w-md bg-white rounded-3xl px-2.5 py-4 sm:p-5 border border-zinc-200/80 shadow-xs flex flex-col items-center overflow-hidden">
        {/* Ad Header Label */}
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-md text-[10px]">
              ADVERTISEMENT
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-400 font-medium">Sponsored Partner</span>
          </div>
          <span className="text-zinc-400 text-[10px] hidden sm:inline font-mono">
            300 × 250
          </span>
        </div>

        {/* Adsterra 300x250 Ad Container - Fixed dimensions prevent Cumulative Layout Shift (CLS) */}
        <div
          ref={containerRef}
          className="w-[300px] h-[250px] bg-zinc-50 rounded-2xl overflow-hidden flex items-center justify-center relative border border-zinc-100 shadow-inner"
          aria-label="Advertisement Container"
        >
          {/* Subtle placeholder while iframe initializes */}
          <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-xs font-medium pointer-events-none">
            Sponsored Partner Ad
          </div>
        </div>

        {/* Ad Footer Note - Explicitly clarifying monetization separation and no reward connection */}
        <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
          <p className="text-[10px] sm:text-[11px] text-zinc-400 leading-normal">
            Advertisements support Swift Earn infrastructure. Ad views or interactions do not generate wallet rewards.
          </p>
        </div>
      </div>
    </section>
  );
};
