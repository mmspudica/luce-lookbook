/* * LUCE Lookbook Platform 메인 스크립트 (app.js)
 * 1. 룩북 그리드와 필터 기능 구현 (demo-data.js)
 * 2. 다국어(i18n) 기능 구현 (locales/*.json)
 */

// DOMContentLoaded 이벤트 리스너를 async로 설정하여 await setLanguage 사용
document.addEventListener('DOMContentLoaded', async () => {
  // --- 1. 전역 DOM 요소 캐싱 ---
  const grid = document.getElementById('lookbook-grid');
  const metricProducts = document.getElementById('metric-products');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const navLinks = document.querySelectorAll('.main-nav a[data-view-target]');
  const sections = document.querySelectorAll('[data-view-section]');
  
  // 다국어 기능에 필요한 요소
  const langSwitcher = document.querySelector('.lang-switcher');

  // --- 2. 데이터 및 그리드 로드 확인 ---
  if (!grid || !window.lookbookData) {
    console.error('룩북 그리드 또는 데이터를 찾을 수 없습니다.');
    if (grid) {
      grid.innerHTML = '<p>룩북 데이터를 불러오는 데 실패했습니다.</p>';
    }
    return;
  }

  const allData = window.lookbookData;

  // --- 3. [기존 기능] 룩북 그리드 렌더링 함수 ---
  function renderGrid(items) {
    if (items.length === 0) {
      grid.innerHTML = '<p>해당 카테고리의 룩이 없습니다.</p>';
      return;
    }
    
    grid.innerHTML = ''; // 그리드 비우기
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
    // 참고: 룩북 아이템(item.title) 자체의 번역은
    // demo-data.js의 구조를 바꾸거나 이 함수 내에서 번역을 조회해야 합니다.
    // 현재는 index.html의 정적 텍스트만 번역됩니다.
  }

  // --- 4. [기존 기능] 지표 업데이트 함수 ---
  function updateMetrics() {
    if (metricProducts) {
      metricProducts.textContent = allData.length;
    }
    // TODO: 다른 지표들 (공급업체, 셀러 등)
    // const suppliers = new Set(allData.map(item => item.supplier));
    // document.getElementById('metric-suppliers').textContent = suppliers.size;
  }

  // --- 5. [신규 기능] 번역 로드 및 적용 (i18n) ---
  const setLanguage = async (lang) => {
    const translations = await fetchTranslations(lang);
    if (!translations) return; 

    document.querySelectorAll('[data-i18n-key]').forEach(element => {
      const key = element.dataset.i18nKey;
      const translation = translations[key];
      
      if (translation) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    document.documentElement.lang = lang;

    if (langSwitcher) {
      langSwitcher.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
      });
    }
    
    localStorage.setItem('luce-lang', lang);
  };

  // --- 6. [신규 기능] 번역 JSON 파일 가져오기 (i18n) ---
  const fetchTranslations = async (lang) => {
    try {
      // locales/ko.json, locales/en.json ...
      const response = await fetch(`locales/${lang}.json`); 
      if (!response.ok) {
        throw new Error(`Failed to load ${lang}.json`);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      // 기본 한국어 텍스트로 대체하거나 오류 메시지 표시
      return null;
    }
  };

  // --- 7. [기존 기능] 필터 버튼 이벤트 리스너 ---
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

  // --- 8. [기존 기능] 네비게이션 (SPA) 이벤트 리스너 ---
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // 'admin.html'로 가는 링크는 기본 동작을 허용
      if (link.getAttribute('href') === 'admin.html' || link.getAttribute('href') === 'signup.html') {
        return; 
      }
      
      e.preventDefault();
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

  // --- 9. [신규 기능] 언어 선택기 이벤트 리스너 (i18n) ---
  if (langSwitcher) {
    langSwitcher.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        const lang = e.target.dataset.lang;
        if (lang) {
          setLanguage(lang);
        }
      }
    });
  }

  // --- 10. 초기화 실행 ---
  
  // 10a. [신규] 언어 먼저 설정
  const savedLang = localStorage.getItem('luce-lang') || 'ko';
  await setLanguage(savedLang);

  // 10b. [기존] 룩북 및 지표 렌더링
  renderGrid(allData); 
  updateMetrics(); 
  
  // 10c. [기존] 기본 섹션 표시
  document.getElementById('lookbook')?.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-nav a[data-view-target="lookbook"]')?.classList.add('active');

});
