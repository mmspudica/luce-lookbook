// 1. Supabase 클라이언트를 초기화하는 스크립트를 로드합니다.
//    (index.html에서 <script type="module" src="scripts/supabaseClient.js"></script> 로드)
//    여기서는 전역(window.supabaseClient)에 주입된 클라이언트를 활용합니다.

const localeMap = {
  ko: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN'
};

const STATIC_METRIC_COUNTS = Object.freeze({
  supplier: 0,
  seller: 0,
  member: 0
});

const LOOKBOOK_TABLE_CANDIDATES = ['lookbook_items', 'lookbook', 'looks'];

async function resolveSupabaseClient(options = {}) {
  const { attempts = 5, delayMs = 150 } = options;

  if (typeof window === 'undefined') {
    return null;
  }

  if (window.supabaseClient) {
    return window.supabaseClient;
  }

  if (typeof window.getSupabaseClient === 'function') {
    try {
      const client = await window.getSupabaseClient();
      if (client) {
        return client;
      }
    } catch (error) {
      console.error('Supabase client 초기화 실패:', error);
    }
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    if (window.supabaseClientReady && typeof window.supabaseClientReady.then === 'function') {
      try {
        const client = await window.supabaseClientReady;
        if (client) {
          return client;
        }
      } catch (error) {
        console.error('Supabase client 초기화 실패:', error);
        break;
      }
    }

    if (attempt < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('lookbook-grid');
  const lookbookLoader = document.getElementById('lookbook-loader');
  const metricProducts = document.getElementById('metric-products');
  const metricSuppliers = document.getElementById('metric-suppliers');
  const metricSellers = document.getElementById('metric-sellers');
  const metricMembers = document.getElementById('metric-members');
  const metricUpdated = document.getElementById('metric-updated');
  const metricError = document.getElementById('metric-error');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const navLinks = document.querySelectorAll('.main-nav a[data-view-target]');
  const sections = document.querySelectorAll('[data-view-section]');

  if (!grid) {
    console.error('룩북 그리드를 찾을 수 없습니다.');
    return;
  }

  if (window.luceI18n?.init) {
    await window.luceI18n.init({ root: document, langSwitcherSelector: '.lang-switcher' });
  }

  let allData = normalizeLookbookItems(Array.isArray(window.lookbookData) ? window.lookbookData : []);
  let cachedCounts = { ...STATIC_METRIC_COUNTS };
  let cachedLatestCreatedAt = null;
  let lastMetricsError = false;

  function setLookbookLoading(isLoading) {
    if (!lookbookLoader) {
      return;
    }

    if (isLoading) {
      lookbookLoader.removeAttribute('hidden');
      lookbookLoader.setAttribute('aria-hidden', 'false');
    } else {
      lookbookLoader.setAttribute('aria-hidden', 'true');
      lookbookLoader.setAttribute('hidden', '');
    }
  }

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
    if (!grid) {
      return;
    }

    if (!items || items.length === 0) {
      grid.innerHTML = '<p>현재 표시할 룩이 없습니다.</p>';
      return;
    }

    grid.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'look-card';
      card.dataset.id = item.id;

      const imageSrc = encodeURI(item.imageUrl);
      const priceLabel = item.price || item.supplier || '';

      card.innerHTML = `
        <div class="look-card__image-wrapper">
          <img src="${imageSrc}" alt="${item.title}" class="look-card__image" loading="lazy"
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

    if (!metricError) {
      return;
    }

    if (hasError) {
      metricError.hidden = false;
      metricError.removeAttribute('hidden');
    } else {
      metricError.hidden = true;
      metricError.setAttribute('hidden', '');
    }
  }

  async function fetchProfileMetrics() {
    const supabase = await resolveSupabaseClient();

    if (!supabase) {
      console.error('Supabase client is not available.');
      lastMetricsError = true;
      updateMetrics(cachedCounts, cachedLatestCreatedAt, true);
      return;
    }

    try {
      const [supplierRes, sellerRes, memberRes, latestRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'supplier'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'seller'),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'member'),
        supabase
          .from('profiles')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      const errors = [supplierRes.error, sellerRes.error, memberRes.error, latestRes.error].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      cachedCounts = {
        supplier: supplierRes.count ?? 0,
        seller: sellerRes.count ?? 0,
        member: memberRes.count ?? 0
      };
      cachedLatestCreatedAt = latestRes.data?.created_at || null;
      lastMetricsError = false;

      updateMetrics(cachedCounts, cachedLatestCreatedAt, false);
    } catch (error) {
      console.error('프로필 메트릭 로딩 오류:', error);
      lastMetricsError = true;
      updateMetrics(cachedCounts, cachedLatestCreatedAt, true);
    }
  }

  async function fetchLookbookRows(supabase) {
    for (const tableName of LOOKBOOK_TABLE_CANDIDATES) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn(`[Lookbook] ${tableName} 테이블 조회 실패:`, error.message);
          continue;
        }

        return { data: Array.isArray(data) ? data : [], tableName };
      } catch (error) {
        console.warn(`[Lookbook] ${tableName} 테이블 조회 중 오류:`, error);
      }
    }

    return { data: [], tableName: null };
  }

  async function hydrateLookbookFromSupabase() {
    const supabase = await resolveSupabaseClient({ attempts: 8, delayMs: 200 });

    if (!supabase) {
      if (allData.length === 0) {
        grid.innerHTML = '<p>룩북 데이터를 불러오는 데 실패했습니다.</p>';
      }
      return;
    }

    setLookbookLoading(true);

    try {
      const { data } = await fetchLookbookRows(supabase);

      if (Array.isArray(data) && data.length > 0) {
        allData = normalizeLookbookItems(data);
        renderGrid(allData);
        updateMetrics();
      } else if (allData.length === 0) {
        grid.innerHTML = '<p>등록된 룩이 없습니다.</p>';
      }
    } catch (error) {
      console.error('룩북 데이터를 불러오지 못했습니다:', error);
      if (allData.length === 0) {
        grid.innerHTML = '<p>룩북 데이터를 불러오는 데 실패했습니다.</p>';
      }
    } finally {
      setLookbookLoading(false);
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
    link.addEventListener('click', event => {
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

  if (allData.length > 0) {
    renderGrid(allData);
    setLookbookLoading(false);
  } else {
    setLookbookLoading(true);
  }

  updateMetrics();
  hydrateLookbookFromSupabase();
  fetchProfileMetrics();

  document.getElementById('lookbook')?.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-nav a[data-view-target="lookbook"]')?.classList.add('active');

  document.addEventListener('luce:language-changed', () => {
    updateMetrics();
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
