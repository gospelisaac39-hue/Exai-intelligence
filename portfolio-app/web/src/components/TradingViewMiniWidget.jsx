import React, { useEffect, useRef } from 'react';

// TradingView's embeddable widgets are script-tag based (not an npm
// package), so React can't render them via JSX/dangerouslySetInnerHTML —
// the script has to be injected imperatively for TradingView's own JS to
// pick it up and mount the chart. No API key needed; this is their
// official free embed.
export default function TradingViewMiniWidget({ symbol, height = 130 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.text = JSON.stringify({
      symbol,
      width: '100%',
      height,
      locale: 'en',
      dateRange: '1D',
      colorTheme: 'dark',
      isTransparent: true,
      autosize: false,
      noTimeScale: false,
    });
    containerRef.current.appendChild(script);
  }, [symbol, height]);

  return <div className="tradingview-widget-container overflow-hidden rounded-md" ref={containerRef} style={{ height }} />;
}
