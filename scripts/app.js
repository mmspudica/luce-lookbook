const localeMap = {
  ko: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN'
};

const STATIC_METRIC_COUNTS = Object.freeze({
  supplier: 107,
  seller: 234,
  member: 565
});

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

  if (!grid) {
    console.error('룩북 그리드를 찾을 수 없습니다.');
    return;
  }

  const rawData = Array.isArray(window.lookbookData) ? window.lookbookData : [];

  const allData = rawData
    .map((item, index) => {
      const imageUrl = item.imageUrl || item.image || item.url || '';
      if (!imageUrl) {
        return null;
      }

      const metadata = parseMetadataFromImageUrl(imageUrl);
      const title = (item.title || metadata.title || `LOOK ${index + 1}`).trim();
      const priceLabel = item.supplier || item.price || metadata.priceLabel || '';

      return {
        ...item,
        id: item.id ?? index + 1,
        title,
        supplier: priceLabel,
        price: priceLabel,
        category: item.category || 'fashion',
        imageUrl
      };
    })
    .filter(Boolean);

  let cachedCounts = { ...STATIC_METRIC_COUNTS };
  let cachedLatestCreatedAt = null;
  let lastMetricsError = false;

  if (allData.length === 0) {
    grid.innerHTML = '<p>룩북 데이터를 불러오는 데 실패했습니다.</p>';
    return;
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
    if (!grid) return;

    if (!items || items.length === 0) {
      grid.innerHTML = '<p>해당 카테고리의 룩이 없습니다.</p>';
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

  function fetchProfileMetrics() {
    cachedCounts = { ...STATIC_METRIC_COUNTS };
    cachedLatestCreatedAt = null;
    lastMetricsError = false;
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
