(function () {
  const PREVIEW_STORAGE_KEY = 'luce-signup-preview';
  const copy = window.luceSignupCopy || {};

  function getLang() {
    return window.luceI18n?.getCurrentLanguage?.() || 'ko';
  }

  function translate(key) {
    const lang = getLang();
    const fallback = copy.ko || {};
    return copy[lang]?.[key] ?? fallback[key] ?? key;
  }

  function formatPlatforms(platforms) {
    if (!platforms) {
      return '';
    }

    if (Array.isArray(platforms)) {
      return platforms.join(', ');
    }

    return String(platforms);
  }

  function renderPreview(previewContainer, emptyElement, data) {
    if (!previewContainer || !emptyElement) {
      return;
    }

    if (!data) {
      emptyElement.hidden = false;
      previewContainer.hidden = true;
      previewContainer.innerHTML = '';
      return;
    }

    emptyElement.hidden = true;
    previewContainer.hidden = false;
    previewContainer.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = translate('previewTitle');
    previewContainer.appendChild(title);

    const list = document.createElement('dl');
    list.classList.add('preview-list');

    const entries = [
      { label: translate('previewUserType'), value: translate(`userType_${data.user_type}`) },
      { label: translate('previewName'), value: data.full_name },
      { label: translate('previewEmail'), value: data.email },
      { label: translate('previewPhone'), value: data.phone_number },
      { label: translate('previewCompany'), value: data.company_name },
      { label: translate('previewBusinessNumber'), value: data.business_registration_number },
      { label: translate('previewPlatforms'), value: formatPlatforms(data.main_platforms) },
      { label: translate('previewChannel'), value: data.channel_url },
      {
        label: translate('previewMarketing'),
        value: data.marketing_consent ? translate('previewMarketingYes') : translate('previewMarketingNo')
      }
    ];

    entries
      .filter(entry => entry.value && String(entry.value).trim().length > 0)
      .forEach(entry => {
        const dt = document.createElement('dt');
        dt.textContent = entry.label;
        const dd = document.createElement('dd');
        dd.textContent = entry.value;
        list.appendChild(dt);
        list.appendChild(dd);
      });

    previewContainer.appendChild(list);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (window.luceI18n?.init) {
      await window.luceI18n.init({ root: document, langSwitcherSelector: '.lang-switcher' });
    }

    const previewContainer = document.getElementById('signup-success-preview');
    const emptyElement = document.getElementById('signup-success-empty');
    let parsedData = null;

    try {
      const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      if (stored) {
        parsedData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to parse signup preview payload', error);
    }

    try {
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear signup preview payload', error);
    }

    renderPreview(previewContainer, emptyElement, parsedData);

    document.addEventListener('luce:language-changed', () => {
      renderPreview(previewContainer, emptyElement, parsedData);
    });
  });
})();
