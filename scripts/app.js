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

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('lookbook-grid');
  const lookbookLoader = document.getElementById('lookbook-loader');
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

  let profileTableNamePromise = null;

  function getProfileTableName() {
    if (!profileTableNamePromise) {
      profileTableNamePromise = (async () => {
        if (typeof window.resolveSupabaseProfileTable === 'function') {
          try {
            const name = await window.resolveSupabaseProfileTable();
            if (name) {
              return name;
            }
          } catch (error) {
            console.error('Failed to resolve profile table name', error);
          }
        }

        return 'profile';
      })();
    }

    return profileTableNamePromise;
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
          <p class="look-card__supplier">${priceLabel}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function updateMetricsFromProfiles(profiles = []) {
    if (metricProducts) {
      metricProducts.textContent = allData.length;
    }

    const supplierCount = profiles.filter(profile => profile.user_type === 'supplier').length;
    const sellerCount = profiles.filter(profile => profile.user_type === 'seller').length;
    const memberCount = profiles.filter(profile => profile.user_type === 'member').length;

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
      metricUpdated.textContent = formatDate(latest);
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
      const platforms = (profile.main_platforms || '')
        .split(',')
        .map(platform => platform.trim())
        .filter(Boolean)
        .join(', ');
      platformCell.textContent = platforms || '-';

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
      const profileTable = await getProfileTableName();

      const { data, error } = await supabaseClient
        .from(profileTable)
        .select('id, user_type, full_name, company_name, main_platforms, channel_url, marketing_consent, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      cachedProfiles = Array.isArray(data) ? data : [];
      lastRenderError = false;
      lastErrorKey = null;
      renderSignupStatus(cachedProfiles);
      updateMetricsFromProfiles(cachedProfiles);
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
  updateMetricsFromProfiles([]);
  fetchProfiles();

  document.getElementById('lookbook')?.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-nav a[data-view-target="lookbook"]')?.classList.add('active');

  document.addEventListener('luce:language-changed', () => {
    if (lastRenderError) {
      renderSignupStatus([], lastErrorKey || 'error');
      updateMetricsFromProfiles([]);
      if (metricError) {
        metricError.hidden = false;
        metricError.removeAttribute('hidden');
      }
      return;
    }

    renderSignupStatus(cachedProfiles);
    updateMetricsFromProfiles(cachedProfiles);
  });
});

function normalizeLookbookItems(items = []) {
  return items
    .map((item, index) => {
      if (!item) {
        return null;
      }

      const imageUrl =
        item.image_url ||
        item.imageUrl ||
        item.image ||
        item.thumbnail_url ||
        item.thumbnail ||
        item.url ||
        '';

      if (!imageUrl) {
        return null;
      }

      const metadata = parseMetadataFromImageUrl(imageUrl);
      const rawTitle = item.title || item.name || metadata.title || `LOOK ${index + 1}`;

      const rawPrice =
        item.price_label ||
        item.priceLabel ||
        item.display_price ||
        item.price_text ||
        item.price ||
        metadata.priceLabel ||
        '';

      let formattedPrice = '';
      if (!rawPrice) {
        const numericPrice = typeof item.price === 'number'
          ? item.price
          : Number.parseInt(String(item.price ?? item.price_krw ?? ''), 10);

        if (Number.isFinite(numericPrice) && numericPrice > 0) {
          formattedPrice = `₩${numericPrice.toLocaleString('ko-KR')}`;
        }
      }

      const priceLabel = rawPrice || formattedPrice;
      const supplierLabel = item.supplier || item.brand || item.vendor || priceLabel;
      const category = item.category || item.type || item.segment || 'fashion';

      return {
        ...item,
        id: item.id ?? index + 1,
        title: String(rawTitle).trim(),
        supplier: supplierLabel,
        price: priceLabel,
        category,
        imageUrl
      };
    })
    .filter(Boolean);
}

function parseMetadataFromImageUrl(imageUrl) {
  if (!imageUrl) {
    return { title: '', priceLabel: '' };
  }

  const filename = decodeURIComponent(imageUrl.split('/').pop() || '').trim();
  if (!filename) {
    return { title: '', priceLabel: '' };
  }

  const nameWithoutExtension = filename.replace(/\.[^.]+$/, '');
  const parts = nameWithoutExtension.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { title: '', priceLabel: '' };
  }

  const lastPart = parts[parts.length - 1];
  const numericPrice = Number(lastPart.replace(/[^\d]/g, ''));
  const hasValidPrice = Number.isFinite(numericPrice) && numericPrice > 0;

  const titleParts = hasValidPrice ? parts.slice(0, -1) : parts;
  const title = titleParts.join(' ').trim();
  const priceLabel = hasValidPrice ? `₩${numericPrice.toLocaleString('ko-KR')}` : '';

  return { title, priceLabel };
}
