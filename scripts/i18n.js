(function () {
  const TRANSLATION_ATTR = 'data-i18n-key';
  const LANG_STORAGE_KEY = 'luce-lang';
  const translationCache = new Map();
  let currentLang = 'ko';
  let activeLangSwitcher = null;

  async function loadTranslations(lang) {
    if (translationCache.has(lang)) {
      return translationCache.get(lang);
    }

    try {
      const response = await fetch(`locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }
      const data = await response.json();
      translationCache.set(lang, data);
      return data;
    } catch (error) {
      console.error('[i18n] 번역 파일 로드 실패', error);
      return null;
    }
  }

  function applyTranslations(root, translations) {
    if (!translations) return;

    root.querySelectorAll(`[${TRANSLATION_ATTR}]`).forEach(element => {
      const key = element.getAttribute(TRANSLATION_ATTR);
      const translation = translations[key];

      if (!translation) {
        return;
      }

      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        if (translation.placeholder) {
          element.placeholder = translation.placeholder;
        }
        if (translation.label) {
          const label = root.querySelector(`label[for="${element.id}"] [${TRANSLATION_ATTR}]`);
          if (label) {
            label.textContent = translation.label;
          }
        }
        if (typeof translation.value === 'string') {
          element.value = translation.value;
        }
      } else {
        element.textContent = translation;
      }
    });
  }

  function markActiveLanguage(lang) {
    if (!activeLangSwitcher) return;

    activeLangSwitcher.querySelectorAll('button[data-lang]').forEach(button => {
      button.classList.toggle('active', button.dataset.lang === lang);
    });
  }

  async function setLanguage(lang, options = {}) {
    const { root = document } = options;
    const translations = await loadTranslations(lang);
    if (!translations) {
      return currentLang;
    }

    applyTranslations(root, translations);

    document.documentElement.lang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    currentLang = lang;
    markActiveLanguage(lang);

    document.dispatchEvent(new CustomEvent('luce:language-changed', {
      detail: { lang, translations }
    }));

    return lang;
  }

  function bindLangSwitcher(langSwitcher) {
    if (!langSwitcher) return;

    activeLangSwitcher = langSwitcher;
    langSwitcher.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const lang = target.dataset.lang;
      if (!lang) {
        return;
      }

      setLanguage(lang, { root: document });
    });
  }

  async function init(options = {}) {
    const { root = document, langSwitcherSelector = '.lang-switcher' } = options;
    const langSwitcher = langSwitcherSelector ? root.querySelector(langSwitcherSelector) : null;
    bindLangSwitcher(langSwitcher);

    const savedLang = localStorage.getItem(LANG_STORAGE_KEY) || 'ko';
    await setLanguage(savedLang, { root });
    return currentLang;
  }

  window.luceI18n = {
    init,
    setLanguage,
    getCurrentLanguage: () => currentLang
  };
})();
