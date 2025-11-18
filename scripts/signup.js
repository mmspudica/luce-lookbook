const supabaseClient = window.supabaseClient;

const copy = {
  ko: {
    selectType: '회원 유형을 선택해주세요.',
    formInvalid: '필수 정보를 다시 확인해주세요.',
    confirmTerms: '필수 약관에 동의해야 가입할 수 있습니다.',
    processing: '가입을 처리하고 있습니다. 잠시만 기다려주세요...',
    duplicateChannel: '이미 등록된 채널 URL입니다. 다른 URL을 입력해주세요.',
    platformRequired: '주요 판매 플랫폼을 최소 1개 이상 선택해주세요.',
    signupSuccess: '가입이 완료되었습니다. 환영합니다!',
    signupError: '가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    noSupabase: '시스템 설정에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
    help_supplier: '공급업체는 회사/브랜드명과 사업자등록번호를 필수로 입력해야 합니다.',
    help_seller: '셀러는 연락 가능한 정보를 입력하고 운영 중인 채널을 알려주세요.',
    help_member: '일반회원은 기본 연락처만 입력하면 가입이 완료됩니다.',
    previewTitle: '신청 정보 미리보기',
    previewUserType: '회원 유형',
    previewName: '이름',
    previewEmail: '이메일',
    previewPhone: '연락처',
    previewCompany: '회사/브랜드',
    previewBusinessNumber: '사업자등록번호',
    previewPlatforms: '주요 플랫폼',
    previewChannel: '채널 URL',
    previewMarketing: '마케팅 수신',
    previewMarketingYes: '동의',
    previewMarketingNo: '미동의',
    userType_supplier: '공급업체',
    userType_seller: '셀러',
    userType_member: '일반회원'
  },
  en: {
    selectType: 'Please choose your membership type.',
    formInvalid: 'Please check the required information again.',
    confirmTerms: 'You must agree to the required terms to continue.',
    processing: 'Processing your registration. Please wait...',
    duplicateChannel: 'This channel URL is already registered. Please use a different one.',
    platformRequired: 'Select at least one primary platform.',
    signupSuccess: 'Registration complete. Welcome aboard!',
    signupError: 'An error occurred while signing up. Please try again later.',
    noSupabase: 'Configuration error detected. Please try again soon.',
    help_supplier: 'Suppliers must provide a company/brand name and business registration number.',
    help_seller: 'Sellers should share reachable contact details and tell us about active channels.',
    help_member: 'Members can join with just their basic contact information.',
    previewTitle: 'Registration Preview',
    previewUserType: 'Member Type',
    previewName: 'Full Name',
    previewEmail: 'Email',
    previewPhone: 'Phone',
    previewCompany: 'Company/Brand',
    previewBusinessNumber: 'Business Registration',
    previewPlatforms: 'Primary Platforms',
    previewChannel: 'Channel URL',
    previewMarketing: 'Marketing Consent',
    previewMarketingYes: 'Consented',
    previewMarketingNo: 'Declined',
    userType_supplier: 'Supplier',
    userType_seller: 'Seller',
    userType_member: 'Member'
  },
  zh: {
    selectType: '请选择会员类型。',
    formInvalid: '请再次确认必填信息。',
    confirmTerms: '必须同意必需条款才能继续。',
    processing: '正在处理您的注册，请稍候……',
    duplicateChannel: '该频道 URL 已被注册，请输入其他地址。',
    platformRequired: '请至少选择一个主要销售平台。',
    signupSuccess: '注册完成，欢迎加入！',
    signupError: '注册过程中发生错误，请稍后再试。',
    noSupabase: '系统配置出现问题，请稍后再试。',
    help_supplier: '供应商需填写公司/品牌名称及营业执照号码。',
    help_seller: '卖家请填写可联系信息，并告知正在运营的频道。',
    help_member: '普通会员仅需填写基本联系方式即可完成注册。',
    previewTitle: '注册信息预览',
    previewUserType: '会员类型',
    previewName: '姓名',
    previewEmail: '邮箱',
    previewPhone: '联系电话',
    previewCompany: '公司/品牌',
    previewBusinessNumber: '营业执照号码',
    previewPlatforms: '主要平台',
    previewChannel: '频道 URL',
    previewMarketing: '营销同意',
    previewMarketingYes: '同意',
    previewMarketingNo: '不同意',
    userType_supplier: '供应商',
    userType_seller: '卖家',
    userType_member: '普通会员'
  }
};

function getLang() {
  return window.luceI18n?.getCurrentLanguage?.() || 'ko';
}

function translate(key) {
  const lang = getLang();
  return copy[lang]?.[key] ?? copy.ko[key] ?? key;
}

function normalizeBusinessRegistrationNumber(value = '') {
  return value.replace(/\D/g, '').slice(0, 10);
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

function normalizePhoneNumber(value = '') {
  return value.replace(/\D/g, '').slice(0, 11);
}

function formatPhoneNumber(value = '') {
  const digits = normalizePhoneNumber(value);
  if (!digits) {
    return '';
  }

  if (digits.length < 4) {
    return digits;
  }

  if (digits.length < 8) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
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

document.addEventListener('DOMContentLoaded', async () => {
  if (!supabaseClient) {
    console.error('Supabase client is missing.');
  }

  if (window.luceI18n?.init) {
    await window.luceI18n.init({ root: document, langSwitcherSelector: '.lang-switcher' });
  }

  const form = document.getElementById('signup-form');
  const feedbackEl = document.getElementById('signup-feedback');
  const businessFieldGroups = document.querySelectorAll('[data-extra="business"]');
  const channelFieldGroups = document.querySelectorAll('[data-extra="channels"]');
  const platformFieldGroups = document.querySelectorAll('[data-extra="platforms"]');
  const termsConsent = document.getElementById('terms_consent');
  const selectedTypeHelp = document.getElementById('selected-type-help');
  const businessRegistrationInput = document.getElementById('business_registration_number');
  const phoneNumberInput = document.getElementById('phone_number');
  const selectedTypeLabel = document.getElementById('selected-user-type-label');
  const userTypeInput = document.getElementById('user_type');
  const policyToggles = document.querySelectorAll('[data-toggle-policy]');
  const validUserTypes = ['supplier', 'seller', 'member'];
  let selectedUserType = null;

  if (businessRegistrationInput) {
    businessRegistrationInput.addEventListener('input', () => {
      const formatted = formatBusinessRegistrationNumber(businessRegistrationInput.value);
      businessRegistrationInput.value = formatted;
    });

    businessRegistrationInput.addEventListener('blur', () => {
      const formatted = formatBusinessRegistrationNumber(businessRegistrationInput.value);
      businessRegistrationInput.value = formatted;
    });
  }

  if (phoneNumberInput) {
    phoneNumberInput.addEventListener('input', () => {
      const formatted = formatPhoneNumber(phoneNumberInput.value);
      phoneNumberInput.value = formatted;
    });

    phoneNumberInput.addEventListener('blur', () => {
      const formatted = formatPhoneNumber(phoneNumberInput.value);
      phoneNumberInput.value = formatted;
    });
  }

  function resetFeedback() {
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('error', 'success', 'loading');
    delete feedbackEl.dataset.copyKey;
  }

  function setFeedback(state, key, override) {
    resetFeedback();
    if (state) {
      feedbackEl.classList.add(state);
    }

    const message = override ?? (key ? translate(key) : '');
    if (message) {
      feedbackEl.textContent = message;
      if (key && !override) {
        feedbackEl.dataset.copyKey = key;
      }
    }
  }

  function clearGroupInputs(group) {
    const input = group.querySelector('input');
    if (input) {
      input.value = '';
      input.required = false;
    }

    const checkboxes = group.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
      checkbox.required = false;
    });
  }

  function hideOptionalGroups() {
    businessFieldGroups.forEach(group => {
      group.classList.add('is-hidden');
      clearGroupInputs(group);
    });

    platformFieldGroups.forEach(group => {
      group.classList.add('is-hidden');
      clearGroupInputs(group);
    });

    channelFieldGroups.forEach(group => {
      group.classList.add('is-hidden');
      clearGroupInputs(group);
    });
  }

  hideOptionalGroups();

  function resolveUserType() {
    const params = new URLSearchParams(window.location.search);
    const typeFromQuery = params.get('user_type')?.toLowerCase();
    let typeFromStorage = null;

    try {
      typeFromStorage = sessionStorage.getItem('luceSelectedUserType')?.toLowerCase() || null;
    } catch (storageError) {
      console.warn('선택한 회원 유형을 불러오지 못했습니다.', storageError);
    }

    const resolvedType = [typeFromQuery, typeFromStorage].find(
      type => type && validUserTypes.includes(type)
    );

    if (!resolvedType) {
      return null;
    }

    if (!typeFromQuery) {
      const url = new URL(window.location.href);
      url.searchParams.set('user_type', resolvedType);
      window.history.replaceState({}, '', url.toString());
    }

    return resolvedType;
  }

  const initialUserType = resolveUserType();

  if (!initialUserType) {
    window.location.replace('signupUserTypeSelect.html');
    return;
  }

  updateFormForUserType(initialUserType);

  function updateTypeHelp(type) {
    if (!selectedTypeHelp) return;
    const key = `help_${type}`;
    selectedTypeHelp.textContent = translate(key);
    selectedTypeHelp.dataset.copyKey = key;
  }

  function updateTypeLabel(type) {
    if (!selectedTypeLabel) return;
    const key = `userType_${type}`;
    selectedTypeLabel.textContent = translate(key);
    selectedTypeLabel.dataset.copyKey = key;
  }

  function updateFormForUserType(type) {
    selectedUserType = type;
    if (userTypeInput) {
      userTypeInput.value = type;
    }

    const isSupplier = type === 'supplier';
    const isSeller = type === 'seller';
    const showBusiness = isSupplier;
    const showChannel = isSeller;
    const showPlatforms = isSeller;

    businessFieldGroups.forEach(group => {
      const input = group.querySelector('input');
      group.classList.toggle('is-hidden', !showBusiness);
      if (input) {
        input.required = showBusiness;
        if (!showBusiness) {
          input.value = '';
        }
      }
    });

    if (businessRegistrationInput) {
      businessRegistrationInput.required = isSupplier;
      if (!isSupplier) {
        businessRegistrationInput.value = '';
      }
    }

    platformFieldGroups.forEach(group => {
      group.classList.toggle('is-hidden', !showPlatforms);
      const checkboxes = group.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.required = false;
        if (!showPlatforms) {
          checkbox.checked = false;
        }
      });
    });

    channelFieldGroups.forEach(group => {
      const input = group.querySelector('input');
      group.classList.toggle('is-hidden', !showChannel);
      if (input) {
        input.required = false;
        if (!showChannel) {
          input.value = '';
        }
      }
    });

    updateTypeLabel(type);
    updateTypeHelp(type);
  }

  function getSelectedPlatforms() {
    return Array.from(form.querySelectorAll('input[name="main_platforms"]:checked'))
      .map(input => input.value?.toString().trim())
      .filter(Boolean);
  }

  policyToggles.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.togglePolicy;
      const target = document.getElementById(targetId);
      if (!target) return;

      const shouldShow = target.hasAttribute('hidden');
      if (shouldShow) {
        target.removeAttribute('hidden');
        button.textContent = '[닫기]';
      } else {
        target.setAttribute('hidden', '');
        button.textContent = '[보기]';
      }
    });
  });

  document.addEventListener('luce:language-changed', () => {
    if (feedbackEl.dataset.copyKey) {
      feedbackEl.textContent = translate(feedbackEl.dataset.copyKey);
    }

    if (selectedUserType) {
      updateTypeLabel(selectedUserType);
      updateTypeHelp(selectedUserType);
    }
  });

  async function handleSubmit(event) {
    event.preventDefault();
    resetFeedback();

    if (!selectedUserType) {
      setFeedback('error', 'selectType');
      return;
    }

    if (!supabaseClient) {
      setFeedback('error', 'noSupabase');
      return;
    }

    const formData = new FormData(form);
    const selectedPlatforms = getSelectedPlatforms();
    const databasePlatforms = selectedPlatforms.map(platform => platform.toLowerCase());
    const businessRegistrationRaw = formData.get('business_registration_number')?.toString().trim() || '';
    const businessRegistrationSanitized = normalizeBusinessRegistrationNumber(businessRegistrationRaw);
    const phoneNumberRaw = formData.get('phone_number')?.toString().trim() || '';
    const phoneNumberSanitized = normalizePhoneNumber(phoneNumberRaw);
    const payload = {
      user_type: selectedUserType,
      full_name: formData.get('full_name')?.toString().trim() || '',
      email: formData.get('email')?.toString().trim() || '',
      password: formData.get('password')?.toString().trim() || '',
      phone_number: phoneNumberSanitized,
      marketing_consent: formData.get('marketing_consent') === 'on',
      company_name: formData.get('company_name')?.toString().trim() || '',
      business_registration_number: businessRegistrationSanitized,
      main_platforms: databasePlatforms,
      channel_url: formData.get('channel_url')?.toString().trim() || ''
    };

    if (!form.reportValidity()) {
      setFeedback('error', 'formInvalid');
      return;
    }

    if (!termsConsent.checked) {
      setFeedback('error', 'confirmTerms');
      return;
    }

    if (selectedUserType === 'seller' && selectedPlatforms.length === 0) {
      setFeedback('error', 'platformRequired');
      return;
    }

    setFeedback('loading', 'processing');

    try {
      if (payload.channel_url) {
        const { count, error: duplicateError } = await supabaseClient
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('channel_url', payload.channel_url);

        if (duplicateError) {
          throw duplicateError;
        }

        if ((count ?? 0) > 0) {
          setFeedback('error', 'duplicateChannel');
          return;
        }
      }

      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            user_type: payload.user_type,
            full_name: payload.full_name,
            phone_number: payload.phone_number,
            company_name: payload.company_name
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      const userId = signUpData?.user?.id;

      if (!userId) {
        throw new Error(translate('signupError'));
      }

      const profilePayload = {
        id: userId,
        user_type: payload.user_type,
        full_name: payload.full_name,
        phone_number: payload.phone_number || null,
        marketing_consent: payload.marketing_consent === true,
        company_name: payload.company_name || null,
        business_registration_number: payload.business_registration_number || null,
        main_platforms: payload.main_platforms.length ? payload.main_platforms : null,
        channel_url: payload.channel_url || null
      };

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        const isDuplicateKey =
          profileError.code === '23505' ||
          profileError.message?.includes('duplicate key value violates unique constraint "profiles_pkey"');

        if (isDuplicateKey) {
          const updatePayload = { ...profilePayload };
          delete updatePayload.id;

          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId);

          if (updateError) {
            throw updateError;
          }
        } else {
          throw profileError;
        }
      }

      setFeedback('success', 'signupSuccess');

      const previewData = {
        user_type: payload.user_type,
        full_name: payload.full_name,
        email: payload.email,
        phone_number: formatPhoneNumber(payload.phone_number),
        marketing_consent: payload.marketing_consent,
        company_name: payload.company_name,
        business_registration_number: formatBusinessRegistrationNumber(payload.business_registration_number),
        main_platforms: selectedPlatforms.map(formatPlatformLabel),
        channel_url: payload.channel_url
      };

      try {
        sessionStorage.setItem('signupPreview', JSON.stringify(previewData));
      } catch (storageError) {
        console.warn('Preview storage failed', storageError);
      }

      window.location.href = 'signupSuccess.html';
    } catch (error) {
      console.error('Signup error', error);
      setFeedback('error', null, error.message || translate('signupError'));
    }
  }

  form.addEventListener('submit', handleSubmit);
});
