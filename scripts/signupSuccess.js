document.addEventListener('DOMContentLoaded', async () => {
  if (window.luceI18n?.init) {
    await window.luceI18n.init({ root: document, langSwitcherSelector: '.lang-switcher' });
  }

  const previewContainer = document.getElementById('signup-preview');
  const emptyMessage = document.getElementById('signup-preview-empty');

  if (!previewContainer) {
    return;
  }

  let previewData = null;
  try {
    const stored = sessionStorage.getItem('signupPreview');
    if (stored) {
      previewData = JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to parse stored preview data', error);
  }

  sessionStorage.removeItem('signupPreview');

  if (!previewData) {
    if (emptyMessage) {
      emptyMessage.hidden = false;
    }
    return;
  }

  if (emptyMessage) {
    emptyMessage.hidden = true;
  }

  const fieldConfigs = [
    {
      labelKey: 'signup_preview_user_type_label',
      getValue: () => ({ type: 'i18n', key: getUserTypeKey(previewData.user_type), fallback: previewData.user_type || '' })
    },
    {
      labelKey: 'signup_preview_name_label',
      getValue: () => previewData.full_name
    },
    {
      labelKey: 'signup_preview_email_label',
      getValue: () => previewData.email
    },
    {
      labelKey: 'signup_preview_phone_label',
      getValue: () => previewData.phone_number
    },
    {
      labelKey: 'signup_preview_company_label',
      getValue: () => previewData.company_name
    },
    {
      labelKey: 'signup_preview_business_label',
      getValue: () => formatBusinessRegistrationNumber(previewData.business_registration_number) || previewData.business_registration_number
    },
    {
      labelKey: 'signup_preview_platforms_label',
      getValue: () => {
        if (!Array.isArray(previewData.main_platforms) || previewData.main_platforms.length === 0) {
          return '';
        }

        return previewData.main_platforms.map(formatPlatformLabel).filter(Boolean).join(', ');
      }
    },
    {
      labelKey: 'signup_preview_channel_label',
      getValue: () => previewData.channel_url
    },
    {
      labelKey: 'signup_preview_marketing_label',
      getValue: () => ({
        type: 'i18n',
        key: previewData.marketing_consent ? 'signup_preview_marketing_yes' : 'signup_preview_marketing_no',
        fallback: previewData.marketing_consent ? '동의' : '미동의'
      })
    }
  ];

  const list = document.createElement('dl');
  list.classList.add('preview-list');

  fieldConfigs.forEach(config => {
    const valueEntry = config.getValue();
    const value = valueEntry?.type === 'i18n' ? valueEntry.fallback : valueEntry;

    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return;
    }

    const dt = document.createElement('dt');
    dt.setAttribute('data-i18n-key', config.labelKey);
    dt.textContent = getFallbackLabel(config.labelKey);

    const dd = document.createElement('dd');
    if (valueEntry?.type === 'i18n' && valueEntry.key) {
      dd.setAttribute('data-i18n-key', valueEntry.key);
      dd.textContent = valueEntry.fallback;
    } else {
      dd.textContent = value;
    }

    list.appendChild(dt);
    list.appendChild(dd);
  });

  if (list.children.length === 0) {
    if (emptyMessage) {
      emptyMessage.hidden = false;
    }
    return;
  }

  const title = document.createElement('h3');
  title.setAttribute('data-i18n-key', 'signup_preview_heading');
  title.textContent = '신청 정보 미리보기';
  previewContainer.appendChild(title);

  previewContainer.appendChild(list);

  if (window.luceI18n?.setLanguage) {
    const currentLang = window.luceI18n.getCurrentLanguage?.() || 'ko';
    window.luceI18n.setLanguage(currentLang, { root: document });
  }
});

function getUserTypeKey(type) {
  switch (type) {
    case 'supplier':
      return 'signup_type_supplier_badge';
    case 'seller':
      return 'signup_type_seller_badge';
    case 'member':
      return 'signup_type_member_badge';
    default:
      return '';
  }
}

function getFallbackLabel(key) {
  const fallbacks = {
    signup_preview_user_type_label: '회원 유형',
    signup_preview_name_label: '이름',
    signup_preview_email_label: '이메일',
    signup_preview_phone_label: '연락처',
    signup_preview_company_label: '회사/브랜드',
    signup_preview_business_label: '사업자등록번호',
    signup_preview_platforms_label: '주요 플랫폼',
    signup_preview_channel_label: '채널 URL',
    signup_preview_marketing_label: '마케팅 수신',
    signup_preview_heading: '신청 정보 미리보기'
  };

  return fallbacks[key] || '';
}

function normalizeBusinessRegistrationNumber(value = '') {
  return value?.toString().replace(/\D/g, '').slice(0, 10) || '';
}

function formatBusinessRegistrationNumber(value = '') {
  const digits = normalizeBusinessRegistrationNumber(value);
  if (!digits) {
    return '';
  }

  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 5);
  const part3 = digits.slice(5, 10);
  return [part1, part2, part3].filter(Boolean).join('-');
}

const platformLabelMap = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  grab: 'Grab',
  clickmate: 'Clickmate',
  other: 'Other'
};

function formatPlatformLabel(value) {
  if (!value) {
    return '';
  }

  const normalized = value.toString().trim().toLowerCase();
  return platformLabelMap[normalized] || value;
}
