/* 룩북을 위한 데모 데이터 (demo-data.js)
 * assets 폴더에 추가된 실제 상품 이미지를 사용하여 룩북 아이템을 구성합니다.
 */
const lookbookFilenames = [
  '럭비카라셔츠 32000.png',
  '누빔 점퍼 네이비 82000.png',
  '더스티 스웨이드 자켓 69000.png',
  '벨로아 무드스판 팬츠 34000.png',
  '소프트 스웨이드 크롭자켓 49000.png',
  '양모 원피스 2장 20000.png',
  '울 상의 하의 세트 46000.png',
  '페이크 레더 사파리 74000.png',
  '페이즐리 보타닉 가디건 25000.png'
];

function createLookbookEntry(filename, index) {
  const trimmed = filename.trim();
  const withoutExtension = trimmed.replace(/\.[^.]+$/, '');
  const parts = withoutExtension.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const rawPricePart = parts[parts.length - 1];
  const numericPrice = Number(rawPricePart.replace(/[^\d]/g, ''));
  const hasValidPrice = Number.isFinite(numericPrice) && numericPrice > 0;

  const titleParts = hasValidPrice ? parts.slice(0, -1) : parts;
  const title = titleParts.join(' ').trim() || `LOOK ${index + 1}`;
  const formattedPrice = hasValidPrice ? `₩${numericPrice.toLocaleString('ko-KR')}` : '';

  return {
    id: index + 1,
    title,
    imageUrl: `assets/${trimmed}`,
    price: formattedPrice,
    supplier: formattedPrice,
    category: 'fashion'
  };
}

window.lookbookData = lookbookFilenames
  .map(createLookbookEntry)
  .filter(Boolean);
