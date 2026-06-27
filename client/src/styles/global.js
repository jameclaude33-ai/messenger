export default function GlobalStyles() {
  return (
    <style jsx global>{`
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f0f0f;
        color: #e0e0e0;
        height: 100vh;
      }

      #__next {
        height: 100vh;
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
          height: 100vh;
          z-index: 100;
          background: #1a1a1a;
        }
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
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
