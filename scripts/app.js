const supabaseClient = window.supabaseClient;

const dynamicCopy = {
  ko: {
    loading: '가입 정보를 불러오는 중입니다...',
    empty: '등록된 가입 정보가 없습니다.',
    error: '가입 정보를 불러오지 못했습니다.',
    unavailable: '현재 가입 정보를 확인할 수 없습니다.',
    userType: {
      supplier: '공급업체',
      seller: '셀러',
      member: '일반회원'
    },
    marketing: {
      yes: '동의',
      no: '미동의'
    }
  },
  en: {
    loading: 'Loading signup data...',
    empty: 'No signup records found.',
    error: 'Failed to load signup data.',
    unavailable: 'Signup data is currently unavailable.',
    userType: {
      supplier: 'Supplier',
      seller: 'Seller',
      member: 'Member'
    },
    marketing: {
      yes: 'Opted-in',
      no: 'Opted-out'
    }
  },
  zh: {
    loading: '正在加载会员注册信息……',
    empty: '暂无注册信息。',
    error: '无法加载注册信息。',
    unavailable: '目前无法查看注册信息。',
    userType: {
      supplier: '供应商',
      seller: '卖家',
      member: '普通会员'
    },
    marketing: {
      yes: '同意接收',
      no: '不同意'
    }
  }
};

const localeMap = {
  ko: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN'
};

const platformLabelMap = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  grab: 'Grab',
  clickmate: 'Clickmate',
  other: 'Other'
};

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('lookbook-grid');
  const metricProducts = document.getElementById('metric-products');
  const metricSuppliers = document.getElementById('metric-suppliers');
  const metricSellers = document.getElementById('metric-sellers');
  const metricMembers = document.getElementById('metric-members');
  const metricUpdated = document.getElementById('metric-updated');
  const metricError = document.getElementById('metric-error');
  const signupStatusBody = document.getElementById('signup-status-body');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const navLinks = document.querySelectorAll('.main-nav a[data-view-target]');
  const sections = document.querySelectorAll('[data-view-section]');

  if (window.luceI18n?.init) {
    await window.luceI18n.init({ root: document, langSwitcherSelector: '.lang-switcher' });
  }

  if (!grid || !window.lookbookData) {
    console.error('룩북 그리드 또는 데이터를 찾을 수 없습니다.');
    if (grid) {
      grid.innerHTML = '<p>룩북 데이터를 불러오는 데 실패했습니다.</p>';
    }
    return;
  }

  const allData = window.lookbookData;
  let cachedProfiles = [];
  let cachedCounts = { supplier: 0, seller: 0, member: 0 };
  let lastRenderError = false;
  let lastErrorKey = null;

  function getLang() {
    return window.luceI18n?.getCurrentLanguage?.() || 'ko';
  }

  function translateDynamic(key) {
    const lang = getLang();
    return dynamicCopy[lang]?.[key] ?? dynamicCopy.ko[key] ?? key;
  }

  function userTypeLabel(type) {
    const lang = getLang();
    return dynamicCopy[lang]?.userType?.[type] ?? dynamicCopy.ko.userType[type] ?? type;
  }

  function marketingLabel(consent) {
    const lang = getLang();
    const key = consent ? 'yes' : 'no';
    return dynamicCopy[lang]?.marketing?.[key] ?? dynamicCopy.ko.marketing[key];
  }

  function formatPlatformLabel(value) {
    if (!value) {
      return '';
    }

    const normalized = value.toString().trim().toLowerCase();
    return platformLabelMap[normalized] || value;
  }

  function formatDate(value) {
    if (!value) {
      return '-';
    }

    try {
      const lang = getLang();
      const locale = localeMap[lang] || lang || undefined;
      return new Date(value).toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch (error) {
      console.error('날짜 포맷 오류', error);
      return '-';
    }
  }

  function renderGrid(items) {
    if (!grid) return;

    if (items.length === 0) {
      grid.innerHTML = '<p>해당 카테고리의 룩이 없습니다.</p>';
      return;
    }

    grid.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'look-card';
      card.dataset.id = item.id;
      card.innerHTML = `
        <div class="look-card__image-wrapper">
          <img src="${item.imageUrl}" alt="${item.title}" class="look-card__image" loading="lazy"
               onerror="this.src='https://placehold.co/600x800/EEE/333?text=Image+Not+Found'; this.classList.add('error');">
        </div>
        <div class="look-card__body">
          <h3 class="look-card__title">${item.title}</h3>
          <p class="look-card__supplier">${item.supplier}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function updateMetricsFromProfiles(profiles = [], counts = null) {
    if (metricProducts) {
      metricProducts.textContent = allData.length;
    }

    const activeCounts = counts || cachedCounts || { supplier: 0, seller: 0, member: 0 };
    const supplierCount = Number.isFinite(activeCounts.supplier) ? activeCounts.supplier : 0;
    const sellerCount = Number.isFinite(activeCounts.seller) ? activeCounts.seller : 0;
    const memberCount = Number.isFinite(activeCounts.member) ? activeCounts.member : 0;

    if (metricSuppliers) {
      metricSuppliers.textContent = supplierCount;
    }
    if (metricSellers) {
      metricSellers.textContent = sellerCount;
    }
    if (metricMembers) {
      metricMembers.textContent = memberCount;
    }
    if (metricUpdated) {
      const latest = profiles[0]?.created_at;
      metricUpdated.textContent = latest ? formatDate(latest) : '-';
    }

    if (metricError) {
      metricError.hidden = true;
      metricError.setAttribute('hidden', '');
    }
  }

  function renderSignupStatus(profiles = [], errorKey = null) {
    if (!signupStatusBody) {
      return;
    }

    signupStatusBody.innerHTML = '';

    if (errorKey) {
      const errorRow = document.createElement('tr');
      const errorCell = document.createElement('td');
      errorCell.colSpan = 7;
      errorCell.textContent = translateDynamic(errorKey);
      errorRow.appendChild(errorCell);
      signupStatusBody.appendChild(errorRow);
      return;
    }

    if (profiles.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 7;
      emptyCell.textContent = translateDynamic('empty');
      emptyRow.appendChild(emptyCell);
      signupStatusBody.appendChild(emptyRow);
      return;
    }

    profiles.forEach(profile => {
      const profileRow = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = profile.full_name || '-';

      const typeCell = document.createElement('td');
      typeCell.textContent = userTypeLabel(profile.user_type);

      const companyCell = document.createElement('td');
      companyCell.textContent = profile.company_name || '-';

      const platformCell = document.createElement('td');
      let platforms = '-';
      if (Array.isArray(profile.main_platforms)) {
        const normalized = profile.main_platforms
          .map(platform => formatPlatformLabel(platform))
          .filter(value => value && value.trim().length > 0);
        platforms = normalized.length ? normalized.join(', ') : '-';
      } else if (typeof profile.main_platforms === 'string') {
        platforms = profile.main_platforms
          .split(',')
          .map(platform => formatPlatformLabel(platform.trim()))
          .filter(Boolean)
          .join(', ') || '-';
      }
      platformCell.textContent = platforms;

      const channelCell = document.createElement('td');
      const channelUrl = profile.channel_url?.trim();
      if (channelUrl) {
        if (/^https?:\/\//i.test(channelUrl)) {
          const link = document.createElement('a');
          link.href = channelUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = channelUrl;
          channelCell.appendChild(link);
        } else {
          channelCell.textContent = channelUrl;
        }
      } else {
        channelCell.textContent = '-';
      }

      const marketingCell = document.createElement('td');
      marketingCell.textContent = marketingLabel(Boolean(profile.marketing_consent));

      const createdCell = document.createElement('td');
      createdCell.textContent = formatDate(profile.created_at);

      profileRow.appendChild(nameCell);
      profileRow.appendChild(typeCell);
      profileRow.appendChild(companyCell);
      profileRow.appendChild(platformCell);
      profileRow.appendChild(channelCell);
      profileRow.appendChild(marketingCell);
      profileRow.appendChild(createdCell);

      signupStatusBody.appendChild(profileRow);
    });
  }

  async function fetchProfileCounts() {
    const defaultCounts = { supplier: 0, seller: 0, member: 0 };

    if (!supabaseClient) {
      return defaultCounts;
    }

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('user_type, count:id', { head: false })
      .group('user_type');

    if (error) {
      throw error;
    }

    const counts = { ...defaultCounts };

    if (Array.isArray(data)) {
      data.forEach(entry => {
        const type = entry.user_type;
        const value = typeof entry.count === 'number' ? entry.count : parseInt(entry.count, 10);
        if (Object.prototype.hasOwnProperty.call(counts, type) && Number.isFinite(value)) {
          counts[type] = value;
        }
      });
    }

    return counts;
  }

  async function fetchProfiles() {
    if (!signupStatusBody) {
      return;
    }

    signupStatusBody.innerHTML = '';
    const loadingRow = document.createElement('tr');
    const loadingCell = document.createElement('td');
    loadingCell.colSpan = 7;
    loadingCell.textContent = translateDynamic('loading');
    loadingRow.appendChild(loadingCell);
    signupStatusBody.appendChild(loadingRow);

    if (!supabaseClient) {
      console.warn('Supabase client not available.');
      cachedProfiles = [];
      lastRenderError = true;
      lastErrorKey = 'unavailable';
      renderSignupStatus([], lastErrorKey);
      updateMetricsFromProfiles([]);
      if (metricError) {
        metricError.hidden = false;
        metricError.removeAttribute('hidden');
      }
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, user_type, full_name, company_name, main_platforms, channel_url, marketing_consent, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      cachedProfiles = Array.isArray(data)
        ? data.map(profile => ({
          ...profile,
          marketing_consent: profile.marketing_consent === true
        }))
        : [];
      lastRenderError = false;
      lastErrorKey = null;
      let counts = null;
      let countsFailed = false;

      try {
        counts = await fetchProfileCounts();
        cachedCounts = counts;
      } catch (countError) {
        console.error('Failed to load profile counts', countError);
        countsFailed = true;
        counts = cachedCounts;
      }

      renderSignupStatus(cachedProfiles);
      updateMetricsFromProfiles(cachedProfiles, counts);

      if (countsFailed && metricError) {
        metricError.hidden = false;
        metricError.removeAttribute('hidden');
      }
    } catch (error) {
      console.error('Failed to load signup profiles', error);
      cachedProfiles = [];
      lastRenderError = true;
      lastErrorKey = 'error';
      renderSignupStatus([], lastErrorKey);
      updateMetricsFromProfiles([]);
      if (metricError) {
        metricError.hidden = false;
        metricError.removeAttribute('hidden');
      }
    }
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const filter = button.dataset.filter;

      if (filter === 'all') {
        renderGrid(allData);
      } else {
        const filteredData = allData.filter(item => item.category === filter);
        renderGrid(filteredData);
      }
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('href') === 'admin.html' || link.getAttribute('href') === 'signup.html') {
        return;
      }

      event.preventDefault();
      const targetId = link.dataset.viewTarget;
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        sections.forEach(section => section.setAttribute('aria-hidden', 'true'));
        targetSection.setAttribute('aria-hidden', 'false');

        navLinks.forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  renderGrid(allData);
  updateMetricsFromProfiles([], cachedCounts);
  fetchProfiles();

  document.getElementById('lookbook')?.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-nav a[data-view-target="lookbook"]')?.classList.add('active');

  document.addEventListener('luce:language-changed', () => {
    if (lastRenderError) {
      renderSignupStatus([], lastErrorKey || 'error');
      updateMetricsFromProfiles([], cachedCounts);
      if (metricError) {
        metricError.hidden = false;
        metricError.removeAttribute('hidden');
      }
      return;
    }

    renderSignupStatus(cachedProfiles);
    updateMetricsFromProfiles(cachedProfiles, cachedCounts);
  });
});
