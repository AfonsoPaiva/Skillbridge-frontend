(function () {
  'use strict';

  var trustedScriptUrlPatterns = [
    /^\/firebase-messaging-sw\.js(?:\?.*)?$/,
    /^https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=GTM-KHGQ445F(?:&l=dataLayer)?$/,
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/klaro@0\.7\.22\/dist\/klaro-no-css\.min\.js$/,
    /^https:\/\/js\.stripe\.com\/(?:v3(?:\/.*)?|clover\/stripe\.js(?:\/.*)?)(?:\?.*)?$/,
    /^https:\/\/apis\.google\.com\/.*/,
    /^https:\/\/accounts\.google\.com\/.*/,
    /^https:\/\/www\.google\.com\/.*/,
    /^https:\/\/recaptcha\.google\.com\/.*/,
    /^https:\/\/www\.gstatic\.com\/.*/,
    /^https:\/\/ssl\.gstatic\.com\/.*/,
    /^https:\/\/www\.googleapis\.com\/.*/
  ];

  var trustedPolicy = window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function'
    ? window.trustedTypes.createPolicy('skillbridge#scripts', {
        createScriptURL: function (value) {
          var normalized = String(value);
          var isAllowed = trustedScriptUrlPatterns.some(function (pattern) {
            return pattern.test(normalized);
          });

          if (!isAllowed) {
            throw new TypeError('Blocked untrusted script URL: ' + normalized);
          }

          return normalized;
        }
      })
    : null;

  function toTrustedScriptURL(value) {
    return trustedPolicy ? trustedPolicy.createScriptURL(value) : value;
  }

  if (window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function') {
    try {
      window.trustedTypes.createPolicy('default', {
        createHTML: function (value) {
          return String(value);
        },
        createScript: function (value) {
          return String(value);
        },
        createScriptURL: function (value) {
          // Allow all script URLs through Trusted Types.
          // CSP script-src already restricts which domains can actually execute.
          // Throwing here would crash the page on strict browsers like Brave mobile.
          return String(value);
        }
      });
    } catch (error) {
      // Ignore if a default policy already exists.
    }
  }

  window.__skillbridgeTrustedScriptURL = toTrustedScriptURL;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  (function (w, d, s, l, i) {
    var hostname = (w.location.hostname || '').toLowerCase();
    var isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(hostname);
    var isProductionHost = /^(skillbridge\.pt|www\.skillbridge\.pt)$/.test(hostname);
    if (isLocalhost || !isProductionHost) {
      return;
    }

    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    function loadGTM() {
      var f = d.getElementsByTagName(s)[0];
      var j = d.createElement(s);
      var dl = l !== 'dataLayer' ? '&l=' + l : '';
      var hasTrackedLoad = false;

      j.async = true;
      j.src = toTrustedScriptURL('https://www.googletagmanager.com/gtm.js?id=' + i + dl);

      j.onload = function () {
        hasTrackedLoad = true;
        console.info('GTM loaded successfully.');
      };

      j.onerror = function () {
        hasTrackedLoad = true;
        console.debug('GTM failed to load. Analytics disabled for this session.');
      };

      setTimeout(function () {
        if (!hasTrackedLoad) {
          console.debug('GTM load timeout. Analytics disabled for this session.');
          hasTrackedLoad = true;
        }
      }, 15000);

      if (f && f.parentNode) {
        f.parentNode.insertBefore(j, f);
      } else {
        d.head.appendChild(j);
      }
    }

    var gtmLoaded = false;
    function tryLoadGTM() {
      if (!gtmLoaded) {
        gtmLoaded = true;
        loadGTM();
      }
    }

    setTimeout(function () {
      if (d.readyState === 'complete') {
        setTimeout(tryLoadGTM, 4000);
      } else {
        w.addEventListener('load', function () { setTimeout(tryLoadGTM, 4000); }, { once: true });
      }
    }, 0);

    ['click', 'scroll', 'touchstart', 'keydown'].forEach(function (eventName) {
      w.addEventListener(eventName, tryLoadGTM, { once: true, passive: true });
    });
  })(window, document, 'script', 'dataLayer', 'GTM-KHGQ445F');

  var iconsLoaded = false;
  function loadIcons() {
    if (iconsLoaded) {
      return;
    }
    iconsLoaded = true;

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons&display=swap';
    document.head.appendChild(link);
  }

  if (document.readyState === 'complete') {
    setTimeout(loadIcons, 100);
  } else {
    window.addEventListener('load', function () { setTimeout(loadIcons, 100); }, { once: true });
  }

  ['click', 'scroll', 'touchstart'].forEach(function (eventName) {
    window.addEventListener(eventName, loadIcons, { once: true, passive: true });
  });

  window.klaroConfig = {
    lang: 'pt',
    translations: {
      pt: {
        consentModal: {
          title: 'Definições de Cookies',
          description: 'Aqui podes ver e personalizar as informações que recolhemos sobre ti.'
        },
        consentNotice: {
          changeDescription: 'Houve alterações desde a tua última visita, por favor atualiza o teu consentimento.',
          description: 'Utilizamos cookies e tecnologias semelhantes para oferecer a melhor experiência no SkillBridge. Clica em "Aceitar todos" para consentir ou "Personalizar" para gerir as tuas preferências.',
          learnMore: 'Personalizar',
          title: 'Cookies & Privacidade'
        },
        ok: 'Aceitar todos',
        acceptAll: 'Aceitar todos',
        acceptSelected: 'Guardar seleção',
        decline: 'Rejeitar todos',
        close: 'Fechar',
        save: 'Guardar',
        service: {
          purpose: 'Finalidade',
          purposes: 'Finalidades',
          required: {
            title: 'Sempre necessário',
            description: 'Este serviço é essencial para o funcionamento do site.'
          },
          disableAll: {
            title: 'Alternar todas as aplicações',
            description: 'Usa este interruptor para ativar/desativar todas as aplicações.'
          }
        },
        poweredBy: 'Criado por estudantes e para estudantes'
      }
    },
    storageMethod: 'localStorage',
    storageName: 'klaro-sb',
    cookieExpiresAfterDays: 365,
    htmlTexts: true,
    embedded: false,
    groupByPurpose: true,
    mustConsent: false,
    acceptAll: true,
    hideDeclineAll: false,
    hideLearnMore: false,
    noticeAsModal: false,
    services: [
      {
        name: 'essencial',
        title: 'Cookies Essenciais',
        description: 'Necessários para autenticação, sessão e preferências.',
        purposes: ['essencial'],
        required: true,
        optOut: false,
        default: true,
        cookies: [/^sb_/, 'klaro-sb']
      },
      {
        name: 'firebase',
        title: 'Firebase Authentication',
        description: 'Autenticação segura da tua conta.',
        purposes: ['essencial', 'funcional'],
        required: true,
        optOut: false,
        default: true,
        cookies: [/^firebase/, '__session']
      },
      {
        name: 'stripe',
        title: 'Stripe (Doações)',
        description: 'Processa pagamentos seguros quando fazes uma doação.',
        purposes: ['pagamentos'],
        required: false,
        optOut: true,
        default: true,
        cookies: [/^__stripe/, 'm']
      },
      {
        name: 'analytics',
        title: 'Análise e Estatísticas',
        description: 'Ajuda-nos a melhorar a experiência de todos.',
        purposes: ['analytics'],
        required: false,
        optOut: true,
        default: false
      }
    ],
    callback: function (consent, service) {
      var analyticsGranted = !!(consent && consent.analytics);
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          analytics_storage: analyticsGranted ? 'granted' : 'denied'
        });
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'consent_update',
        analytics_storage: analyticsGranted ? 'granted' : 'denied',
        updated_service: service ? service.name : 'all'
      });
      console.log('Klaro consent updated:', service ? service.name : 'all services', consent);
    }
  };

  var klaroLoaded = false;
  function loadKlaro() {
    if (klaroLoaded) {
      return;
    }
    klaroLoaded = true;

    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/klaro@0.7.22/dist/klaro.min.css';
    document.head.appendChild(css);

    var script = document.createElement('script');
    script.src = toTrustedScriptURL('https://cdn.jsdelivr.net/npm/klaro@0.7.22/dist/klaro-no-css.min.js');
    script.async = true;
    document.head.appendChild(script);
  }

  window.addEventListener('load', function () { setTimeout(loadKlaro, 5000); }, { once: true });
  ['scroll', 'click', 'touchstart', 'keydown'].forEach(function (eventName) {
    window.addEventListener(eventName, loadKlaro, { once: true, passive: true });
  });
})();
