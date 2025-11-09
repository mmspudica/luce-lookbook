const supabaseClient = window.supabaseClient;

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
  let cachedCounts = { supplier: 0, seller: 0, member: 0 };
  let cachedLatestCreatedAt = null;
  let lastMetricsError = false;

  function getLang() {
    return window.luceI18n?.getCurrentLanguage?.() || 'ko';
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

  function updateMetrics(counts = cachedCounts, latestCreatedAt = cachedLatestCreatedAt, hasError = lastMetricsError) {
    if (metricProducts) {
      metricProducts.textContent = allData.length;
    }

    const activeCounts = counts || { supplier: 0, seller: 0, member: 0 };
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
      metricUpdated.textContent = latestCreatedAt ? formatDate(latestCreatedAt) : '-';
    }

    if (metricError) {
      if (hasError) {
        metricError.hidden = false;
        metricError.removeAttribute('hidden');
      } else {
        metricError.hidden = true;
        metricError.setAttribute('hidden', '');
      }
    }
  }

  async function fetchProfileMetrics() {
    const defaultCounts = { supplier: 0, seller: 0, member: 0 };

    if (!supabaseClient) {
      console.warn('Supabase client not available.');
      cachedCounts = defaultCounts;
      cachedLatestCreatedAt = null;
      lastMetricsError = true;
      updateMetrics();
      return;
    }

    let encounteredError = false;
    const nextCounts = { ...defaultCounts };
    let latestCreatedAt = null;

    const normalizeType = (value) => {
      if (!value) {
        return '';
      }

      return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');
    };

    try {
      const pageSize = 1000;
      let rangeStart = 0;
      let moreRowsAvailable = true;
      let totalCount = null;
      const rows = [];

      while (moreRowsAvailable) {
        const { data, error, count } = await supabaseClient
          .from('profiles')
          .select('user_type, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(rangeStart, rangeStart + pageSize - 1);

        if (error) {
          throw error;
        }

        if (typeof count === 'number' && count >= 0) {
          totalCount = count;
        }

        if (Array.isArray(data)) {
          rows.push(...data);
          moreRowsAvailable = data.length === pageSize;
        } else {
          moreRowsAvailable = false;
        }

        rangeStart += pageSize;
      }

      rows.forEach((row, index) => {
        if (!latestCreatedAt && index === 0 && row?.created_at) {
          latestCreatedAt = row.created_at;
        }

        const normalizedType = normalizeType(row?.user_type);

        if (normalizedType.startsWith('supplier')) {
          nextCounts.supplier += 1;
          return;
        }

        if (normalizedType.startsWith('seller')) {
          nextCounts.seller += 1;
          return;
        }

        if (normalizedType.startsWith('member')) {
          nextCounts.member += 1;
          return;
        }

        if (normalizedType.includes('seller')) {
          nextCounts.seller += 1;
          return;
        }

        nextCounts.member += 1;
      });

      const totalRowsCounted = nextCounts.supplier + nextCounts.seller + nextCounts.member;
      const expectedTotal = Number.isFinite(totalCount) ? totalCount : rows.length;

      if (expectedTotal > totalRowsCounted) {
        nextCounts.member += expectedTotal - totalRowsCounted;
      }

      console.debug('Fetched profile metrics', {
        rowsFetched: rows.length,
        counts: nextCounts,
        expectedTotal,
        latestCreatedAt
      });
    } catch (error) {
      encounteredError = true;
      console.error('Failed to load profile metrics', error);
    }

    cachedCounts = nextCounts;
    cachedLatestCreatedAt = latestCreatedAt;
    lastMetricsError = encounteredError;
    updateMetrics();
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
  updateMetrics();
  fetchProfileMetrics();

  document.getElementById('lookbook')?.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-nav a[data-view-target="lookbook"]')?.classList.add('active');

  document.addEventListener('luce:language-changed', () => {
    updateMetrics();
  });
});
