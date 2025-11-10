// 1. Supabase 클라이언트를 초기화하는 스크립트를 로드합니다.
//    (index.html에서 <script type="module" src="scripts/supabaseClient.js"></script> 로드)
//    여기서는 전역(window.supabaseClient)에 주입된 클라이언트를 활용합니다.

const localeMap = {
  ko: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN'
};

// 2. [수정] 이 부분은 이제 초기값이 아닌, fetch 전의 기본값으로 사용됩니다.
// (또는 로딩 중에 0을 표시하고 싶다면 0으로 설정해도 됩니다.)
const STATIC_METRIC_COUNTS = Object.freeze({
  supplier: 0, 
  seller: 0,
  member: 0
});

document.addEventListener('DOMContentLoaded', async () => {
  // ... (기존 코드: grid, metricProducts 등 변수 선언) ...
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
 
  // ... (기존 코드: rawData, allData 처리) ...
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

  // ... (기존 코드: getLang, formatDate, renderGrid, updateMetrics) ...
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
  

  // 3. [교체] fetchProfileMetrics 함수를 Supabase 연동 버전으로 교체
  async function fetchProfileMetrics() {
    const supabase = window.supabaseClient;

    // supabase 객체가 로드되었는지 확인
    if (!supabase) {
      console.error('Supabase client is not available.');
      lastMetricsError = true;
      updateMetrics(cachedCounts, cachedLatestCreatedAt, true);
      return;
    }

    try {
      // 3가지 카운트와 최근 생성일자를 병렬로 동시에 요청 (성능 향상)
      const [supplierRes, sellerRes, memberRes, latestRes] = await Promise.all([
        // Supplier 카운트 (role 컬럼이 'supplier'인 경우)
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'supplier'), 
        
        // Seller 카운트 (role 컬럼이 'seller'인 경우)
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'seller'), // 

        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'member'), 

        // 가장 최근 생성된 프로필 조회 (업데이트 날짜 표시용)
        supabase
          .from('profiles')
          .select('created_at') // <-- [확인!] 'created_at' 컬럼명이 맞는지 확인
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      // 4개의 요청 중 하나라도 에러가 있는지 확인
      const errors = [supplierRes.error, sellerRes.error, memberRes.error, latestRes.error].filter(Boolean);
      if (errors.length > 0) {
        throw new Error(errors.map(e => e.message).join(', '));
      }

      // 에러가 없으면 캐시된 카운트와 날짜를 업데이트
      cachedCounts = {
        supplier: supplierRes.count ?? 0,
        seller: sellerRes.count ?? 0,
        member: memberRes.count ?? 0
      };
      cachedLatestCreatedAt = latestRes.data?.created_at || null;
      lastMetricsError = false;

      // 성공적으로 UI 업데이트
      updateMetrics(cachedCounts, cachedLatestCreatedAt, false);

    } catch (error) {
      console.error('프로필 메트릭 로딩 오류:', error);
      lastMetricsError = true;
      // 에러 발생 시, 기존 캐시값 (초기값 0)과 에러 상태로 UI 업데이트
      updateMetrics(cachedCounts, cachedLatestCreatedAt, true);
    }
  }


  // ... (기존 코드: filterButtons, navLinks 이벤트 리스너) ...
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


  // 페이지 로드 시 초기 렌더링 및 데이터 호출
  renderGrid(allData);
  updateMetrics(); // 초기값(0)으로 먼저 UI를 그림
  fetchProfileMetrics(); // Supabase에서 실제 데이터 비동기 호출

  document.getElementById('lookbook')?.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-nav a[data-view-target="lookbook"]')?.classList.add('active');

  document.addEventListener('luce:language-changed', () => {
    updateMetrics();
  });
});

// ... (기존 코드: parseMetadataFromImageUrl 함수) ...
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
