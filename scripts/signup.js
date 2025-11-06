const SUPABASE_URL = 'https://tsvfopwndnpnpapnlwxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdmZvcHduZG5wbnBhcG5sd3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzYwMjIsImV4cCI6MjA3NjI1MjAyMn0.YtVMHTFzJAXX_1-sltWQa_7YOWa_YdNqnAj2cXv7F88';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const stepButtons = document.querySelectorAll('.signup-step');
  const panels = document.querySelectorAll('[data-step-panel]');
  const toStep2Button = document.getElementById('to-step-2');
  const backToStep1 = document.getElementById('back-to-step-1');
  const feedbackEl = document.getElementById('signup-feedback');
  const userTypeRadios = Array.from(document.querySelectorAll('input[name="user_type"]'));
  const requiredBusinessFields = document.querySelectorAll('[data-extra="business"] input');
  const businessFieldGroups = document.querySelectorAll('[data-extra="business"]');
  const channelFieldGroups = document.querySelectorAll('[data-extra="channels"]');
  const memberTypeCards = document.querySelectorAll('.member-type-card');
  const termsConsent = document.getElementById('terms_consent');
  const selectedTypeHelp = document.getElementById('selected-type-help');

  let currentStep = 1;
  let selectedUserType = null;

  function resetFeedback() {
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('error', 'success', 'loading');
  }

  function hideOptionalGroups() {
    businessFieldGroups.forEach(group => {
      group.classList.add('is-hidden');
      const input = group.querySelector('input');
      if (input) {
        input.required = false;
      }
    });

    channelFieldGroups.forEach(group => {
      group.classList.add('is-hidden');
      const input = group.querySelector('input');
      if (input) {
        input.required = false;
      }
    });
  }

  hideOptionalGroups();

  function setStep(step) {
    currentStep = step;
    stepButtons.forEach((btn, index) => {
      const stepNumber = index + 1;
      btn.classList.toggle('is-active', stepNumber === step);
      btn.setAttribute('aria-selected', String(stepNumber === step));
      if (stepNumber <= step) {
        btn.removeAttribute('disabled');
      } else {
        btn.setAttribute('disabled', 'true');
      }
    });

    panels.forEach(panel => {
      const panelStep = Number(panel.dataset.stepPanel);
      const isActive = panelStep === step;
      panel.hidden = !isActive;
      panel.setAttribute('aria-hidden', String(!isActive));
    });
  }

  stepButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetStep = Number(btn.dataset.step);
      if (Number.isNaN(targetStep) || targetStep > currentStep) {
        return;
      }

      if (targetStep === 2 && !selectedUserType) {
        feedbackEl.textContent = '회원 유형을 먼저 선택해주세요.';
        feedbackEl.classList.add('error');
        return;
      }

      resetFeedback();
      setStep(targetStep);
    });
  });

  function updateFormForUserType(type) {
    selectedUserType = type;

    const isBusiness = type === 'supplier' || type === 'seller';
    const needsRegistrationNumber = type === 'supplier';
    const needsChannelFields = type !== 'member';

    businessFieldGroups.forEach(group => {
      group.classList.toggle('is-hidden', !isBusiness);
      const input = group.querySelector('input');
      if (input) {
        input.required = isBusiness;
      }
    });

    requiredBusinessFields.forEach(input => {
      if (input.id === 'business_registration_number') {
        input.required = needsRegistrationNumber;
      }
    });

    channelFieldGroups.forEach(group => {
      group.classList.toggle('is-hidden', !needsChannelFields);
      const input = group.querySelector('input');
      if (input) {
        input.required = needsChannelFields && input.id === 'main_platforms';
      }
    });

    if (selectedTypeHelp) {
      if (type === 'supplier') {
        selectedTypeHelp.textContent = '공급업체는 회사/브랜드명과 사업자등록번호를 필수로 입력해야 합니다.';
      } else if (type === 'seller') {
        selectedTypeHelp.textContent = '셀러는 회사/브랜드명을 입력하고 운영 중인 채널 정보를 알려주세요.';
      } else {
        selectedTypeHelp.textContent = '일반회원은 기본 연락처만 입력하면 가입이 완료됩니다.';
      }
    }
  }
  userTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      resetFeedback();
      memberTypeCards.forEach(card => card.classList.remove('is-selected'));
      const parentCard = radio.closest('.member-type-card');
      if (parentCard) {
        parentCard.classList.add('is-selected');
      }
      updateFormForUserType(radio.value);
      toStep2Button.disabled = false;
    });
  });

  toStep2Button.addEventListener('click', () => {
    if (!selectedUserType) {
      feedbackEl.textContent = '회원 유형을 선택해주세요.';
      feedbackEl.classList.add('error');
      return;
    }

    resetFeedback();
    setStep(2);
    document.getElementById('full_name').focus();
  });

  backToStep1.addEventListener('click', () => {
    resetFeedback();
    setStep(1);
  });

  async function handleSubmit(event) {
    event.preventDefault();
    resetFeedback();

    if (!selectedUserType) {
      feedbackEl.textContent = '회원 유형을 선택해주세요.';
      feedbackEl.classList.add('error');
      setStep(1);
      return;
    }

    const formData = new FormData(form);
    const payload = {
      user_type: selectedUserType,
      full_name: formData.get('full_name')?.trim(),
      email: formData.get('email')?.trim(),
      password: formData.get('password')?.trim(),
      phone_number: formData.get('phone_number')?.trim(),
      marketing_consent: formData.get('marketing_consent') === 'on',
      company_name: formData.get('company_name')?.trim() || null,
      business_registration_number: formData.get('business_registration_number')?.trim() || null,
      main_platforms: formData.get('main_platforms')?.trim() || null,
      channel_url: formData.get('channel_url')?.trim() || null,
      terms_consent: formData.get('terms_consent'),
    };

    if (!form.reportValidity()) {
      feedbackEl.textContent = '필수 정보를 다시 확인해주세요.';
      feedbackEl.classList.add('error');
      return;
    }

    if (!termsConsent.checked) {
      feedbackEl.textContent = '필수 약관에 동의해야 가입할 수 있습니다.';
      feedbackEl.classList.add('error');
      return;
    }

    feedbackEl.textContent = '가입을 처리하고 있습니다. 잠시만 기다려주세요...';
    feedbackEl.classList.add('loading');

    try {
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            user_type: payload.user_type,
            full_name: payload.full_name,
            phone_number: payload.phone_number,
            company_name: payload.company_name,
          },
          emailRedirectTo: `${window.location.origin}/index.html`
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      const userId = signUpData?.user?.id;

      if (!userId) {
        throw new Error('회원가입에 실패했습니다. 다시 시도해주세요.');
      }

      const profilePayload = {
        id: userId,
        user_type: payload.user_type,
        full_name: payload.full_name,
        phone_number: payload.phone_number,
        marketing_consent: payload.marketing_consent,
        company_name: payload.company_name,
        business_registration_number: payload.business_registration_number,
        main_platforms: payload.main_platforms,
        channel_url: payload.channel_url,
      };

      const { error: profileError } = await supabaseClient.from('profiles').insert(profilePayload);

      if (profileError) {
        throw profileError;
      }

      feedbackEl.textContent = '가입이 완료되었습니다. 이메일 인증을 진행해주세요.';
      feedbackEl.classList.remove('loading');
      feedbackEl.classList.add('success');

      form.reset();
      memberTypeCards.forEach(card => card.classList.remove('is-selected'));
      selectedUserType = null;
      toStep2Button.disabled = true;
      hideOptionalGroups();
      setStep(3);
    } catch (error) {
      console.error('Signup error', error);
      feedbackEl.textContent = error.message || '가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      feedbackEl.classList.remove('loading');
      feedbackEl.classList.add('error');
    }
  }

  form.addEventListener('submit', handleSubmit);
});
