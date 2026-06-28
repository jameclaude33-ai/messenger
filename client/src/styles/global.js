export default function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --bg-color: #0f131c;
        --sidebar-bg: #171c29;
        --text-main: #ffffff;
        --text-secondary: #70798a;
        --accent-color: #3390ec;
        --border-color: rgba(255, 255, 255, 0.08);
        --hover-bg: rgba(255, 255, 255, 0.05);
      }

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html, body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: var(--bg-color);
        color: var(--text-main);
        height: 100%;
        -webkit-text-size-adjust: 100%;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      #__next {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      input, textarea, button {
        font-size: 16px !important;
      }

      @media (max-width: 768px) {
        .sidebar-desktop {
          display: none;
        }
        .sidebar-mobile {
          position: fixed;
          top: 0;
          left: 0;
          width: 260px;
          bottom: 0;
          z-index: 100;
          background: var(--sidebar-bg);
        }
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 99;
        }
        .mobile-toggle {
          display: flex !important;
        }
        .message-bubble {
          max-width: 90% !important;
        }
      }

      @media (min-width: 769px) {
        .sidebar-desktop {
          display: flex;
        }
        .sidebar-mobile {
          display: none;
        }
        .sidebar-overlay {
          display: none;
        }
        .mobile-toggle {
          display: none !important;
        }
      }
    `}</style>
  );
}
