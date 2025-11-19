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

// 📌 2025-11-15 기준으로 하루마다 증가시키는 메트릭 오프셋 설정
const METRIC_BASE_DATE = new Date(2025, 10, 15); // 2025-11-15 (월은 0부터 시작)

const METRIC_BASE_OFFSETS = {
  supplier: 110,
  seller: 275,
  member: 595
};

const METRIC_DAILY_INCREMENTS = {
  supplier: 2,  // 하루당 +2
  seller: 3,    // 하루당 +3
  member: 6     // 하루당 +5
};

function getDynamicMetricOffsets(referenceDate = new Date()) {
  // 오늘 날짜 00:00
  const todayStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  // 기준일 00:00 (2025-11-15)
  const baseStart = new Date(
    METRIC_BASE_DATE.getFullYear(),
    METRIC_BASE_DATE.getMonth(),
    METRIC_BASE_DATE.getDate()
  );

  const diffMs = todayStart - baseStart;
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000)); // 하루(ms)

  return {
    supplier: METRIC_BASE_OFFSETS.supplier + diffDays * METRIC_DAILY_INCREMENTS.supplier,
    seller:   METRIC_BASE_OFFSETS.seller   + diffDays * METRIC_DAILY_INCREMENTS.seller,
    member:   METRIC_BASE_OFFSETS.member   + diffDays * METRIC_DAILY_INCREMENTS.member
  };
}

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
  const lookModal = document.getElementById('look-modal');
  const lookModalMedia = document.getElementById('look-modal-media');
  const lookModalBody = document.getElementById('look-modal-body');
  const modalCloseTriggers = document.querySelectorAll('[data-modal-close]');

  if (!grid) {
    console.error('룩북 그리드를 찾을 수 없습니다.');
    return;
  }

  document.addEventListener('luce:language-changed', handleLanguageChanged);

  if (window.luceI18n?.init) {
    await window.luceI18n.init({ root: document, langSwitcherSelector: '.lang-switcher' });
  }

  let allData = normalizeLookbookItems(Array.isArray(window.lookbookData) ? window.lookbookData : []);
  let cachedCounts = { ...STATIC_METRIC_COUNTS };
  let cachedLatestCreatedAt = null;
  let lastMetricsError = false;
  let lastFocusedElement = null;
  let activeFilter = 'all';
  let activeModalItem = null;
  let activeTranslations = null;

  function handleLanguageChanged(event) {
    if (event?.detail?.translations) {
      activeTranslations = event.detail.translations;
    }

    updateMetrics();
    renderActiveFilter();

    if (activeModalItem && lookModal?.getAttribute('aria-hidden') === 'false') {
      renderLookModalContent(activeModalItem);
    }
  }

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

  function t(key, fallback = '') {
    if (activeTranslations && key && key in activeTranslations) {
      return activeTranslations[key];
    }
    return fallback || key || '';
  }

  function getLookTitle(item) {
    if (!item) {
      return '';
    }

    const lang = getLang();
    const titleTranslations = item.title_i18n || item.titleTranslations || item.translations?.title || item.translations;

    if (titleTranslations && typeof titleTranslations === 'object') {
      return (
        titleTranslations[lang] ||
        titleTranslations.ko ||
        titleTranslations.en ||
        titleTranslations.zh ||
        item.title ||
        ''
      );
    }

    return item.title || '';
  }

  function renderGrid(items) {
    if (!grid) {
      return;
    }

    if (!items || items.length === 0) {
      grid.innerHTML = `<p>${t('lookbook_empty', '현재 표시할 룩이 없습니다.')}</p>`;
      return;
    }

    grid.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'look-card';
      card.dataset.id = item.id;

      const imageSrc = encodeURI(item.imageUrl);
      const priceLabel = item.price || item.supplier || '';
      const displayTitle = getLookTitle(item);

      card.innerHTML = `
        <div class="look-card__image-wrapper">
          <img src="${imageSrc}" alt="${displayTitle}" class="look-card__image" loading="lazy"
               onerror="this.src='https://placehold.co/600x800/EEE/333?text=Image+Not+Found'; this.classList.add('error');">
        </div>
        <div class="look-card__body">
          <h3 class="look-card__title">${displayTitle}</h3>
          <p class="look-card__supplier">${priceLabel}</p>
        </div>
      `;

      card.addEventListener('click', () => openLookModal(item));
      grid.appendChild(card);
    });
  }

  function renderLookModalContent(item, options = {}) {
    if (!item || !lookModal || !lookModalMedia || !lookModalBody) {
      return;
    }

    const { shouldFocusClose = false } = options;
    const videoSrc = encodeURI(item.videoUrl || deriveVideoUrlFromImage(item.imageUrl) || '');
    const fallbackText = t('look_modal_video_error', '현재 브라우저에서는 동영상을 재생할 수 없습니다.');
    const placeholderText = t('look_modal_video_placeholder', '재생할 영상을 찾을 수 없습니다.');
    const displayTitle = getLookTitle(item);

    if (videoSrc) {
      lookModalMedia.innerHTML = `
        <video controls autoplay playsinline preload="metadata">
          <source src="${videoSrc}" type="video/mp4">
          ${fallbackText}
        </video>
      `;
    } else {
      lookModalMedia.innerHTML = `<div class="look-modal__placeholder">${placeholderText}</div>`;
    }

    lookModalBody.innerHTML = `
      <h2 id="look-modal-title">${displayTitle}</h2>
      ${item.price ? `<p class="look-modal__price">${item.price}</p>` : ''}
      ${item.supplier ? `<p class="look-modal__supplier">${item.supplier}</p>` : ''}
    `;

    if (shouldFocusClose) {
      lookModal.querySelector('.look-modal__close')?.focus();
    }
  }

  function openLookModal(item) {
    if (!lookModal || !lookModalMedia || !lookModalBody) {
      return;
    }

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    activeModalItem = item;
    renderLookModalContent(item, { shouldFocusClose: true });

    lookModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', handleModalKeydown);
  }

  function closeLookModal() {
    if (!lookModal || !lookModalMedia || !lookModalBody) {
      return;
    }

    lookModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    lookModalMedia.innerHTML = '';
    lookModalBody.innerHTML = '';
    activeModalItem = null;
    document.removeEventListener('keydown', handleModalKeydown);

    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  function handleModalKeydown(event) {
    if (event.key === 'Escape') {
      closeLookModal();
    }
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

      // 📌 날짜 기반 동적 오프셋 적용
      const dynamicOffsets = getDynamicMetricOffsets();

      cachedCounts = {
        supplier: (supplierRes.count ?? 0) + dynamicOffsets.supplier,
        seller:   (sellerRes.count   ?? 0) + dynamicOffsets.seller,
        member:   (memberRes.count   ?? 0) + dynamicOffsets.member
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
        renderActiveFilter();
        updateMetrics();
      } else if (allData.length === 0) {
        grid.innerHTML = `<p>${t('lookbook_empty', '등록된 룩이 없습니다.')}</p>`;
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

  function renderActiveFilter() {
    if (activeFilter === 'all') {
      renderGrid(allData);
      return;
    }

    const filteredData = allData.filter(item => item.category === activeFilter);
    renderGrid(filteredData);
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const filter = button.dataset.filter;
      activeFilter = filter || 'all';
      renderActiveFilter();
    });
  });

  navLinks.forEach(link => {
    link.addEventListener('click', event => {
      if (link.getAttribute('href') === 'admin.html' || link.getAttribute('href')?.startsWith('signup')) {
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
    renderActiveFilter();
    setLookbookLoading(false);
  } else {
    setLookbookLoading(true);
  }

  updateMetrics();
  hydrateLookbookFromSupabase();
  fetchProfileMetrics();

  document.getElementById('lookbook')?.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-nav a[data-view-target="lookbook"]')?.classList.add('active');

  modalCloseTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      closeLookModal();
    });
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
      const normalizedTitle = String(rawTitle).trim();

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
      const videoUrl = item.video_url || item.videoUrl || item.video || deriveVideoUrlFromImage(imageUrl);

      const titleTranslations = normalizeTitleTranslations(
        item.title_i18n || item.titleTranslations || item.translations?.title,
        normalizedTitle
      );

      return {
        ...item,
        id: item.id ?? index + 1,
        title: normalizedTitle,
        title_i18n: titleTranslations,
        supplier: supplierLabel,
        price: priceLabel,
        category,
        imageUrl,
        videoUrl
      };
    })
    .filter(Boolean);
}

function normalizeTitleTranslations(translations, fallbackTitle) {
  if (!translations || typeof translations !== 'object') {
    if (!fallbackTitle) {
      return null;
    }

    return {
      ko: fallbackTitle,
      en: fallbackTitle,
      zh: fallbackTitle
    };
  }

  const normalized = { ...translations };
  if (fallbackTitle && !normalized.ko) {
    normalized.ko = fallbackTitle;
  }
  if (!normalized.en) {
    normalized.en = normalized.ko || fallbackTitle;
  }
  if (!normalized.zh) {
    normalized.zh = normalized.en || normalized.ko || fallbackTitle;
  }

  return normalized;
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

function deriveVideoUrlFromImage(imageUrl) {
  if (!imageUrl) {
    return '';
  }

  const [basePath] = imageUrl.split('?');
  const lastSlashIndex = basePath.lastIndexOf('/');
  const directory = lastSlashIndex >= 0 ? imageUrl.slice(0, lastSlashIndex + 1) : '';
  const filename = lastSlashIndex >= 0 ? basePath.slice(lastSlashIndex + 1) : basePath;

  if (!filename.includes('.')) {
    return '';
  }

  const videoFilename = filename.replace(/\.[^.]+$/, '.mp4');
  return directory ? `${directory}${videoFilename}` : videoFilename;
}
