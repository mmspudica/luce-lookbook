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

const lookbookTitleTranslations = {
  '럭비카라셔츠': {
    en: 'Rugby Collar Shirt',
    zh: '橄榄球领衬衫'
  },
  '누빔 점퍼 네이비': {
    en: 'Navy Quilted Jumper',
    zh: '海军蓝绗缝夹克'
  },
  '더스티 스웨이드 자켓': {
    en: 'Dusty Suede Jacket',
    zh: '雾感麂皮夹克'
  },
  '벨로아 무드스판 팬츠': {
    en: 'Velour Stretch Pants',
    zh: '丝绒弹力裤'
  },
  '소프트 스웨이드 크롭자켓': {
    en: 'Soft Suede Crop Jacket',
    zh: '柔软麂皮短夹克'
  },
  '양모 원피스 2장': {
    en: 'Wool Dress Set of 2',
    zh: '羊毛连衣裙两件套'
  },
  '울 상의 하의 세트': {
    en: 'Wool Top & Bottom Set',
    zh: '羊毛上下套装'
  },
  '페이크 레더 사파리': {
    en: 'Faux Leather Safari Jacket',
    zh: '仿皮狩猎夹克'
  },
  '페이즐리 보타닉 가디건': {
    en: 'Paisley Botanic Cardigan',
    zh: '佩斯利植物开衫'
  }
};

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

  const titleTranslations = lookbookTitleTranslations[title] || {};
  const titleI18n = {
    ko: title,
    en: titleTranslations.en || title,
    zh: titleTranslations.zh || title
  };

  return {
    id: index + 1,
    title: titleI18n.ko,
    title_i18n: titleI18n,
    imageUrl: `assets/${trimmed}`,
    videoUrl: `assets/${trimmed.replace(/\.[^.]+$/, '.mp4')}`,
    price: formattedPrice,
    supplier: formattedPrice,
    category: 'fashion'
  };
}

window.lookbookData = lookbookFilenames
  .map(createLookbookEntry)
  .filter(Boolean);
