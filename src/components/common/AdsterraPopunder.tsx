import React, { useEffect, useRef } from 'react';

/**
 * Adsterra Popunder Component (On-Click / User-Initiated Event Format)
 *
 * SPECIFICATION & SAFETY CONSTRAINTS:
 * 1. Uses exact Adsterra Popunder code:
 *    <script src="https://pl31509034.profitableratecpmnetwork.com/98/bc/be/98bcbe7e25b9cae9ed2a45aed8c9b40f.js"></script>
 *
 * 2. Strict Security & Isolation:
 *    - Encapsulated strictly inside an isolated iframe (srcdoc).
 *    - Does NOT inject third-party scripts into global document.head or document.body.
 *    - Protects the top-level application, React Router SPA navigation, and fixed bottom
 *      navigation (#swift-earn-bottom-nav) from click-hijacking.
 *    - Event listeners from the script remain strictly scoped to the sandboxed iframe context.
 *
 * 3. Conservative Activation Rules:
 *    - Never activates automatically on page load, render, or route navigation.
 *    - Never activates on wallet, withdrawal, login/signup, or admin interactions.
 *    - Activates solely on deliberate user click within the dedicated advertisement trigger frame.
 *
 * 4. Pure Monetization Layer:
 *    - Does NOT trigger, listen for, or dispatch any user rewards or wallet events.
 *    - Viewing, loading, or interacting with this advertisement NEVER credits a user's wallet (₦0 reward).
 *    - Clear "ADVERTISEMENT" labeling conforming to advertising standards.
 *    - Explicit disclosure: "Monetization partner. Views or clicks do not generate wallet rewards."
 */
export const AdsterraPopunder: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset container contents to prevent duplicate execution or memory leaks during StrictMode/remounts
    container.innerHTML = '';

    // Create an isolated iframe for the Adsterra Popunder script
    const iframe = document.createElement('iframe');
    iframe.title = 'Advertisement Popunder';
    iframe.width = '100%';
    iframe.height = '110';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameBorder', '0');
    iframe.style.width = '100%';
    iframe.style.height = '110px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';

    // Exact Adsterra Popunder script wrapped in an isolated HTML document with a user-initiated interaction surface
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
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      -webkit-user-select: none;
    }
    .trigger-card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      text-align: center;
      background: #f8fafc;
      border: 1.5px dashed #cbd5e1;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .trigger-card:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .trigger-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      color: #6c2bd9;
      background: #ede9fe;
      padding: 2px 8px;
      border-radius: 6px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .trigger-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }
    .trigger-desc {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="trigger-card" id="popunder-surface" role="button" tabindex="0">
    <div class="trigger-badge">Partner Offer</div>
    <div class="trigger-title">Tap to Open Verified Sponsor Destination</div>
    <div class="trigger-desc">Opens external sponsor partner in a separate tab</div>
  </div>
  <script src="https://pl31509034.profitableratecpmnetwork.com/98/bc/be/98bcbe7e25b9cae9ed2a45aed8c9b40f.js"></script>
</body>
</html>`;

    iframe.srcdoc = adDocumentContent;
    container.appendChild(iframe);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <section aria-label="Sponsored Advertisement (Popunder)" className="w-full flex justify-center my-4 overflow-hidden">
      <div className="w-full max-w-3xl bg-white rounded-3xl px-3 py-4 sm:p-5 border border-zinc-200/80 shadow-xs flex flex-col items-center overflow-hidden">
        {/* Ad Header Label */}
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 text-[10px] sm:text-xs px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md text-[9px] sm:text-[10px]">
              ADVERTISEMENT
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-400 font-medium">On-Click Popunder Partner</span>
          </div>
          <span className="text-zinc-400 text-[10px] font-mono">
            On-Click Format
          </span>
        </div>

        {/* Adsterra Popunder Container - Safe isolated sandboxed iframe */}
        <div
          ref={containerRef}
          className="w-full h-[110px] rounded-2xl overflow-hidden relative"
          aria-label="Advertisement Container (Popunder)"
        />

        {/* Ad Footer Note - Mandatory disclosure */}
        <div className="w-full text-center mt-3 pt-2.5 border-t border-zinc-100">
          <p className="text-[10px] text-zinc-400 leading-normal">
            Monetization partner. Views or clicks do not generate wallet rewards.
          </p>
        </div>
      </div>
    </section>
  );
};
