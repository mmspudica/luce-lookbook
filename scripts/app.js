/* * LUCE Lookbook Platform 메인 스크립트 (app.js)
 * demo-data.js 의 데이터를 가져와 룩북 그리드와 필터 기능을 구현합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 전역에서 사용할 DOM 요소 캐싱
  const grid = document.getElementById('lookbook-grid');
  const metricProducts = document.getElementById('metric-products');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const navLinks = document.querySelectorAll('.main-nav a[data-view-target]');
  const sections = document.querySelectorAll('[data-view-section]');

  // 데이터 로드 확인
  if (!grid || !window.lookbookData) {
    console.error('룩북 그리드 또는 데이터를 찾을 수 없습니다.');
    if (grid) {
      grid.innerHTML = '<p>룩북 데이터를 불러오는 데 실패했습니다.</p>';
    }
    return;
  }

  const allData = window.lookbookData;

  // --- 1. 룩북 그리드 렌더링 함수 ---
  function renderGrid(items) {
    if (items.length === 0) {
      grid.innerHTML = '<p>해당 카테고리의 룩이 없습니다.</p>';
      return;
    }
    
    grid.innerHTML = ''; // 그리드 비우기
    items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'look-card';
      // dataset을 통해 나중에 모달 등에서 ID를 참조할 수 있게 함
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

  // --- 2. 지표 업데이트 함수 ---
  function updateMetrics() {
    if (metricProducts) {
      metricProducts.textContent = allData.length;
    }
    // TODO: 다른 지표들 (공급업체, 셀러 등)도 데이터 기반으로 업데이트
    // 예: const suppliers = new Set(allData.map(item => item.supplier));
    // document.getElementById('metric-suppliers').textContent = suppliers.size;
  }

  // --- 3. 필터 버튼 기능 구현 ---
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 활성 상태 변경
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

  // --- 4. 네비게이션 스크롤 및 활성화 (SPA처럼 보이게) ---
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.dataset.viewTarget;
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        // 모든 섹션 숨기기 (aria-hidden)
        sections.forEach(section => section.setAttribute('aria-hidden', 'true'));
        // 타겟 섹션 보이기
        targetSection.setAttribute('aria-hidden', 'false');

        // 네비게이션 활성 상태
        navLinks.forEach(nav => nav.classList.remove('active'));
        link.classList.add('active');
        
        // (참고: 스크롤 이동이 필요하면 아래 주석 해제)
        // targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  // --- 5. 초기화 실행 ---
  renderGrid(allData); // 처음 로드 시 전체 데이터 렌더링
  updateMetrics(); // 지표 업데이트
  
  // 페이지 로드 시 #lookbook을 기본으로 보여주기
  document.getElementById('lookbook')?.setAttribute('aria-hidden', 'false');
  document.querySelector('.main-nav a[data-view-target="lookbook"]')?.classList.add('active');

});
