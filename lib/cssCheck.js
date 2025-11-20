// CSS Loading Detection and Fallback
if (typeof window !== 'undefined') {
  // Check if Tailwind CSS is loaded
  const checkTailwind = () => {
    const testEl = document.createElement('div');
    testEl.className = 'hidden';
    document.body.appendChild(testEl);
    const isHidden = window.getComputedStyle(testEl).display === 'none';
    document.body.removeChild(testEl);
    
    if (!isHidden) {
      console.warn('Tailwind CSS not loaded properly, applying fallback styles');
      // Apply critical fallback styles
      const fallbackCSS = `
        body { 
          font-family: 'Kanit', -apple-system, BlinkMacSystemFont, sans-serif !important;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%) !important;
          color: white !important;
          margin: 0 !important;
          padding: 0 !important;
          min-height: 100vh !important;
        }
        .loading-screen {
          position: fixed !important;
          top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%) !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 9999 !important;
        }
      `;
      const style = document.createElement('style');
      style.textContent = fallbackCSS;
      document.head.appendChild(style);
    }
  };

  // Check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkTailwind);
  } else {
    checkTailwind();
  }
}