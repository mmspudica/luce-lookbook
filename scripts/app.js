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

    const supplierPattern = 'supplier%';
    const sellerPattern = 'seller%';

    async function countProfiles(applyFilter) {
      let query = supabaseClient.from('profiles');
      if (typeof applyFilter === 'function') {
        query = applyFilter(query);
      }

      const { count, error } = await query.select('id', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      return typeof count === 'number' && Number.isFinite(count) ? count : 0;
    }

    try {
      const countResults = await Promise.allSettled([
        countProfiles(),
        countProfiles(query => query.ilike('user_type', supplierPattern)),
        countProfiles(query => query.ilike('user_type', sellerPattern))
      ]);

      const [totalResult, supplierResult, sellerResult] = countResults;

      if (totalResult.status === 'fulfilled') {
        const total = totalResult.value;
        const supplierCount = supplierResult.status === 'fulfilled' ? supplierResult.value : 0;
        const sellerCount = sellerResult.status === 'fulfilled' ? sellerResult.value : 0;

        nextCounts.supplier = supplierCount;
        nextCounts.seller = sellerCount;

        const inferredMembers = total - supplierCount - sellerCount;
        nextCounts.member = inferredMembers > 0 ? inferredMembers : 0;
      } else {
        encounteredError = true;
      }

      if (supplierResult.status === 'rejected' || sellerResult.status === 'rejected') {
        encounteredError = true;
      }
    } catch (error) {
      encounteredError = true;
      console.error('Failed to load profile counts', error);
    }

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        if (first?.created_at) {
          latestCreatedAt = first.created_at;
        }
      }
    } catch (error) {
      encounteredError = true;
      console.error('Failed to load latest profile timestamp', error);
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
