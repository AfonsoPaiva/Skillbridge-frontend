// Klaro Cookie Consent Configuration
// Documentação: https://kiprotect.com/docs/klaro

window.klaroConfig = {
  // Idioma
  lang: 'pt',
  
  // Tradução personalizada
  translations: {
    pt: {
      consentModal: {
        title: 'Gestão de Cookies',
        description: 'Utilizamos cookies e tecnologias semelhantes para melhorar a tua experiência, analisar o uso do site e personalizar conteúdo. Podes gerir as tuas preferências abaixo.',
      },
      consentNotice: {
        title: 'Cookies & Privacidade',
        description: 'Utilizamos cookies para garantir o funcionamento do site e melhorar a tua experiência. Ao continuar, aceitas a nossa política de cookies.',
        learnMore: 'Saber mais',
        testing: 'Modo de teste!',
      },
      purposes: {
        essential: 'Essenciais',
        analytics: 'Análise',
        marketing: 'Marketing',
      },
      ok: 'Aceitar todos',
      acceptAll: 'Aceitar todos',
      acceptSelected: 'Aceitar selecionados',
      decline: 'Rejeitar',
      close: 'Fechar',
      save: 'Guardar',
      poweredBy: 'Desenvolvido com Klaro',
    },
  },

  // UI customization
  elementID: 'klaro',
  storageMethod: 'localStorage',
  storageName: 'klaro-consent',
  htmlTexts: true,
  cookieExpiresAfterDays: 365,
  
  // Modal behavior
  mustConsent: false,
  acceptAll: true,
  hideDeclineAll: false,
  hideLearnMore: false,
  noticeAsModal: false,
  
  // Custom styling - matching SkillBridge colors
  styling: {
    theme: ['light', 'top', 'wide'],
  },

  // Services/Apps to manage
  services: [
    {
      name: 'essential',
      title: 'Cookies Essenciais',
      description: 'Estes cookies são necessários para o funcionamento básico do site, incluindo autenticação e segurança.',
      purposes: ['essential'],
      required: true,
      optOut: false,
      default: true,
    },
    {
      name: 'google-analytics',
      title: 'Google Analytics',
      description: 'Utilizamos o Google Analytics para entender como os visitantes utilizam o nosso site e melhorar a experiência.',
      purposes: ['analytics'],
      required: false,
      optOut: true,
      default: false,
      onAccept: function() {
        // Initialize Google Analytics if needed
        console.log('Google Analytics enabled');
      },
      onDecline: function() {
        console.log('Google Analytics disabled');
      },
    },
    {
      name: 'stripe',
      title: 'Stripe',
      description: 'Processamento de pagamentos para doações através do Stripe.',
      purposes: ['essential'],
      required: true,
      optOut: false,
      default: true,
    },
    {
      name: 'firebase',
      title: 'Firebase Authentication',
      description: 'Sistema de autenticação para gerir o teu acesso à plataforma.',
      purposes: ['essential'],
      required: true,
      optOut: false,
      default: true,
    },
  ],

  // Callback when consent is saved
  callback: function(consent, service) {
    console.log('Consent updated for', service, ':', consent);
  },
};

// Custom CSS for Klaro to match SkillBridge theme
(function() {
  const style = document.createElement('style');
  style.innerHTML = `
    /* Klaro Custom Styles for SkillBridge */
    .klaro {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    /* Notice banner */
    .klaro .cookie-notice {
      background: rgba(255, 255, 255, 0.98) !important;
      border-top: 2px solid #68007a !important;
      box-shadow: 0 -4px 24px rgba(104, 0, 122, 0.12) !important;
      backdrop-filter: blur(12px);
    }

    /* Modal */
    .klaro .cookie-modal {
      background: #ffffff !important;
      border: 1px solid rgba(104, 0, 122, 0.1) !important;
      box-shadow: 0 20px 60px rgba(104, 0, 122, 0.2) !important;
    }

    .klaro .cookie-modal .cm-header {
      border-bottom: 1px solid rgba(104, 0, 122, 0.1) !important;
    }

    /* Buttons */
    .klaro .cn-buttons button.cm-btn.cm-btn-success,
    .klaro .cookie-modal .cm-footer .cm-btn.cm-btn-success {
      background: #68007a !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 12px 24px !important;
      font-weight: 600 !important;
      transition: all 0.2s ease !important;
    }

    .klaro .cn-buttons button.cm-btn.cm-btn-success:hover,
    .klaro .cookie-modal .cm-footer .cm-btn.cm-btn-success:hover {
      background: #540060 !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(104, 0, 122, 0.3) !important;
    }

    .klaro .cn-buttons button.cm-btn.cm-btn-info,
    .klaro .cookie-modal .cm-footer .cm-btn.cm-btn-info {
      background: transparent !important;
      color: #68007a !important;
      border: 1px solid #68007a !important;
      border-radius: 8px !important;
      padding: 12px 24px !important;
      font-weight: 600 !important;
      transition: all 0.2s ease !important;
    }

    .klaro .cn-buttons button.cm-btn.cm-btn-info:hover,
    .klaro .cookie-modal .cm-footer .cm-btn.cm-btn-info:hover {
      background: rgba(104, 0, 122, 0.05) !important;
      border-color: #540060 !important;
    }

    .klaro .cn-buttons button.cm-btn.cm-btn-decline {
      color: rgba(0, 0, 0, 0.6) !important;
      background: transparent !important;
      border: none !important;
    }

    .klaro .cn-buttons button.cm-btn.cm-btn-decline:hover {
      color: rgba(0, 0, 0, 0.8) !important;
      background: rgba(0, 0, 0, 0.05) !important;
    }

    /* Switches */
    .klaro .cookie-modal .cm-list-input:checked + .cm-list-label .slider {
      background: #68007a !important;
    }

    .klaro .cookie-modal .cm-list-label .slider {
      background: rgba(0, 0, 0, 0.2) !important;
    }

    /* Links */
    .klaro a,
    .klaro .cm-link {
      color: #68007a !important;
      text-decoration: underline !important;
    }

    .klaro a:hover,
    .klaro .cm-link:hover {
      color: #540060 !important;
    }

    /* Purpose badges */
    .klaro .cookie-modal .cm-purposes .cm-purpose {
      background: rgba(104, 0, 122, 0.08) !important;
      color: #68007a !important;
      border-radius: 12px !important;
      padding: 4px 12px !important;
      font-size: 0.85em !important;
      font-weight: 500 !important;
    }

    /* App titles */
    .klaro .cookie-modal .cm-app-title {
      font-weight: 600 !important;
      color: #1a1a1a !important;
    }

    /* Scrollbar for modal */
    .klaro .cookie-modal .cm-body::-webkit-scrollbar {
      width: 8px;
    }

    .klaro .cookie-modal .cm-body::-webkit-scrollbar-track {
      background: rgba(104, 0, 122, 0.05);
      border-radius: 4px;
    }

    .klaro .cookie-modal .cm-body::-webkit-scrollbar-thumb {
      background: rgba(104, 0, 122, 0.3);
      border-radius: 4px;
    }

    .klaro .cookie-modal .cm-body::-webkit-scrollbar-thumb:hover {
      background: rgba(104, 0, 122, 0.5);
    }

    /* Mobile responsiveness */
    @media (max-width: 600px) {
      .klaro .cookie-notice,
      .klaro .cookie-modal {
        font-size: 14px !important;
      }

      .klaro .cn-buttons button,
      .klaro .cookie-modal .cm-footer .cm-btn {
        padding: 10px 16px !important;
        font-size: 14px !important;
      }
    }

    /* Hide Klaro badge (optional) */
    .klaro .cookie-notice-button {
      background: #68007a !important;
      border-radius: 8px 8px 0 0 !important;
      box-shadow: 0 -2px 8px rgba(104, 0, 122, 0.2) !important;
    }

    .klaro .cookie-notice-button:hover {
      background: #540060 !important;
    }
  `;
  document.head.appendChild(style);
})();
