import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode, RefObject } from 'react'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { analyzeMenuImage, askDiningAssistant, validateMenuImage, type BackendDish, type BackendRisk, type EvidenceSource } from './api'

type Language = 'en' | 'ko' | 'ja' | 'ru' | 'es' | 'it'
type Screen = 'home' | 'scan' | 'camera' | 'menu' | 'detail' | 'cart' | 'order' | 'bill' | 'find' | 'community' | 'orders' | 'profile' | 'passport' | 'savedRestaurants' | 'companions' | 'companionDetail'
type Status = 'MATCH' | 'WARNING' | 'CONFLICT' | 'UNKNOWN'
type BillMode = 'equal' | 'item'
type AllergySeverity = 'mild' | 'moderate' | 'severe'
type AllergyProfile = { severity: AllergySeverity; crossContact: boolean }
type DietStyle = 'none' | 'vegetarian' | 'vegan' | 'lacto' | 'ovo' | 'lacto-ovo' | 'pescatarian' | 'flexitarian'
type FaithDiet = 'none' | 'halal' | 'kosher' | 'other'
type SubscriptionTier = 'free' | 'pro'
type UserProfile = { username: string; email: string; avatarSrc?: string; subscriptionTier?: SubscriptionTier; subscriptionExpiresAt?: number | null; subscriptionPlanDays?: number }
type RestaurantIntent = 'dumplings' | 'noodles' | 'vegetarian' | 'not-spicy' | 'hot-pot' | 'surprise'
type SavedRestaurant = {
  id: string
  name: string
  initials: string
  emoji: string
  cuisine: string
  location: string
  why: string
  tone: string
  intents?: RestaurantIntent[]
  rating?: number
  distanceKm?: number
  address?: string
  source?: string
  photoSrc?: string
}
type FoodPost = {
  id: string
  restaurantId: string
  category: string
  categoryLabel: string
  author: string
  initials: string
  avatarTone: string
  time: string
  title: string
  body: string
  dish: string
  dishMeta: string
  imageSrc: string
  imageTone: string
  likes: number
  comments: number
}
type FoodPostDraft = { title: string; body: string; dish: string; dishMeta: string; category: string; imageSrc?: string }
type Companion = { id: string; name: string; email: string; initials: string; passport: Passport; note: string; inviteId: string }
type CompanionAddResult = { ok: boolean; message: string }
type CompanionInvite = { id: string; fromEmail: string; toEmail: string; status: 'pending' | 'accepted' | 'declined' | 'revoked'; createdAt: number }
type CapturedPage = { id: number; title: string; variant: number }
type DishCategory = 'featured' | 'appetizer' | 'salad' | 'soup' | 'main' | 'side' | 'staple' | 'combo' | 'dessert' | 'drink' | 'alcohol' | 'other'

type Passport = {
  allergies: string[]
  otherAllergen: string
  allergyProfiles: Record<string, AllergyProfile>
  diets: string[]
  dietStyle: DietStyle
  faithDiet: FaithDiet
  faithOther: string
  avoidFoods: string[]
  preferences: string[]
  spiceLevel: number | null
  severity: 'mild' | 'moderate' | 'severe'
  crossContact: boolean
}

type Dish = {
  id: string
  name: string
  zh: string
  localized: Record<Language, string>
  category?: DishCategory
  price: number
  imageSrc: string
  className: string
  ingredients: string[]
  zhIngredients: string[]
  allergens: string[]
  possibleAllergens?: string[]
  possibleIngredients?: string[]
  possibleZhIngredients?: string[]
  tags: string[]
  spicy: number
  vegetarian: boolean
  vegan: boolean
  hasPork?: boolean
  hasBeef?: boolean
  hasPoultry?: boolean
  hasSeafood?: boolean
  hasOffal?: boolean
  hasCilantro?: boolean
  hasScallion?: boolean
  hasGarlic?: boolean
  hasLard?: boolean
  confidence: number
  taste: string
  texture: string
  cooking: string
  bestWith: string
  culture: string
  reason: string
  ingredientEvidence?: { label: string; labelZh?: string; source: EvidenceSource }[]
  allergenEvidence?: { id: string; label?: string; source: EvidenceSource }[]
  knowledgeMatch?: { id: string; nameZh: string; nameEn: string; aliases: string[] }
}

const menuCategoryOrder: DishCategory[] = ['featured', 'appetizer', 'salad', 'soup', 'main', 'side', 'staple', 'combo', 'dessert', 'drink', 'alcohol', 'other']
const menuCategoryMeta: Record<DishCategory, { label: string; zh: string; icon: string }> = {
  featured: { label: 'Featured', zh: '招牌推荐', icon: '★' },
  appetizer: { label: 'Appetizers & small plates', zh: '开胃菜 / 小食', icon: '✦' },
  salad: { label: 'Salads & cold dishes', zh: '沙拉 / 冷菜', icon: '❋' },
  soup: { label: 'Soups & broths', zh: '汤羹 / 汤底', icon: '◌' },
  main: { label: 'Main dishes', zh: '主菜', icon: '◉' },
  side: { label: 'Sides & vegetables', zh: '配菜 / 时蔬', icon: '⌁' },
  staple: { label: 'Rice, noodles & bread', zh: '米饭 / 面食 / 面包', icon: '⌂' },
  combo: { label: 'Sets & combos', zh: '套餐 / 组合', icon: '＋' },
  dessert: { label: 'Desserts', zh: '甜品', icon: '◇' },
  drink: { label: 'Non-alcoholic drinks', zh: '无酒精饮料', icon: '○' },
  alcohol: { label: 'Alcohol', zh: '酒水', icon: '◒' },
  other: { label: 'Other', zh: '其他', icon: '•' },
}

const inferDishCategory = (dish: Dish): DishCategory => {
  if (dish.category) return dish.category
  const haystack = `${dish.name} ${dish.zh} ${dish.tags.join(' ')}`.toLowerCase()
  if (/(featured|signature|chef.?s choice|推荐|招牌|特色)/.test(haystack)) return 'featured'
  if (/(set meal|combo|套餐|定食|组合)/.test(haystack)) return 'combo'
  if (/(beer|wine|sake|cocktail|spirit|liquor|啤酒|葡萄酒|清酒|鸡尾酒|白酒|威士忌)/.test(haystack)) return 'alcohol'
  if (/(drink|tea|coffee|juice|soda|milk tea|饮料|茶|咖啡|果汁|汽水|奶茶)/.test(haystack)) return 'drink'
  if (/(soup|broth|汤|汤底)/.test(haystack)) return 'soup'
  if (/(salad|sashimi|carpaccio|cold dish|刺身|沙拉|凉菜|冷盘)/.test(haystack)) return 'salad'
  if (/(rice|noodle|pasta|bread|pizza|dumpling|饺|面|饭|粉|意面|披萨|面包|馕)/.test(haystack)) return 'staple'
  if (/(dessert|cake|ice cream|甜|布丁|糕)/.test(haystack)) return 'dessert'
  if (/(mapo tofu|麻婆豆腐)/.test(haystack)) return 'appetizer'
  if (/(appetizer|starter|small plate|snack|lotus root|开胃|小食|前菜|莲藕)/.test(haystack)) return 'appetizer'
  if (/(fish.?fragrant eggplant|鱼香茄子)/.test(haystack)) return 'side'
  if (/(greens|vegetable|时蔬|青菜|蔬菜)/.test(haystack)) return 'side'
  if (/(chicken|tofu|pork|beef|eggplant|鸡丁|豆腐|猪肉|牛肉|茄子)/.test(haystack)) return 'main'
  return 'other'
}

type BillItem = {
  id: string
  label: string
  zh: string
  amount: number
  dish: Dish
}

type CartItem = {
  dish: Dish
  quantity: number
}

const languages: Array<{ code: Language; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ko', label: '한국어', native: '한국어' },
  { code: 'ja', label: '日本語', native: '日本語' },
  { code: 'ru', label: 'Русский', native: 'Русский' },
  { code: 'es', label: 'Español', native: 'Español' },
  { code: 'it', label: 'Italiano', native: 'Italiano' },
]

const copy = {
  en: {
    step: 'Step',
    hello: 'Hello, traveler',
    subtitle: 'Understand the dish. Know what fits you. Order with confidence.',
    scanMenu: 'Scan a Menu',
    scanSub: 'Understand any Chinese menu.',
    foodPassport: 'Food Passport',
    anything: 'Anything you cannot eat?',
    splitBill: 'Split the Bill',
    findFood: 'Find Food',
    recentSession: 'Current dining session',
    menuReady: 'Menu ready to explore',
    dishes: 'dishes',
    openSession: 'Open session',
    home: 'Home',
    profile: 'Profile',
    menu: 'Menu',
    scan: 'Scan',
    passport: 'Passport',
    next: 'Continue',
    save: 'Save and scan a menu',
    selectLanguage: 'Choose your language',
    languageSub: 'Your language controls the app and dish explanations. Staff messages stay in Chinese.',
    avoid: 'What should we watch for?',
    passportSub: 'We only use this to flag possible conflicts. You can change it anytime.',
    allergies: 'Allergens',
    diet: 'Dietary restrictions',
    preferences: 'Everyday preferences',
    severe: 'Severe',
    moderate: 'Moderate',
    mild: 'Mild',
    noAllergens: 'No allergens added yet',
    scanTitle: 'Fit the whole menu inside',
    scanSubTitle: 'Hold steady so dish names and\ningredient notes stay readable.',
    capture: 'Capture menu',
    upload: 'Upload a photo instead',
    sampleMenu: 'Use sample menu',
    avoidGlare: 'Avoid glare',
    keepFlat: 'Keep it flat',
    everyPage: 'Scan every page',
    analyzing: 'Reading your menu…',
    analysisSub: 'Pairing dish names, prices and Food Passport signals',
    menuResults: 'Menu results',
    checking: 'Checking your Food Passport against this menu',
    all: 'All',
    forMe: 'For Me',
    vegetarian: 'Vegetarian',
    notSpicy: 'Not Spicy',
    viewDetails: 'View dish details',
    mainIngredients: 'Main ingredients',
    taste: 'Taste',
    texture: 'Texture',
    cooking: 'Cooking',
    bestWith: 'Best with',
    culturalNote: 'Cultural note',
    illustrative: 'Illustrative only · photos are not used to determine allergens',
    askRestaurant: 'Ask the Restaurant',
    whySeeing: 'Why you are seeing this',
    noConflict: 'Matches your preferences',
    possibleConflict: 'Please check with the restaurant',
    confirmedConflict: 'Not suitable for your selected diet',
    unable: 'We could not identify this dish reliably',
    detailsUnknown: 'The menu does not provide enough evidence for a firm ingredient decision.',
    detailsConflict: 'This dish contains or may contain an ingredient that conflicts with your Food Passport.',
    detailsMatch: 'No conflict found in the available menu evidence. This is not an allergy safety guarantee.',
    askTitle: 'Show this to the restaurant',
    askWarning: 'For severe allergy',
    playChinese: 'Play Chinese',
    copyQuestion: 'Copy question',
    assistant: 'Dining Assistant',
    helpOrder: 'Help Me Order',
    planTitle: "Let's plan the table",
    planSub: 'I already know the restaurant, menu and your Food Passport. Just fill in what is missing for this meal.',
    people: 'How many people?',
    budget: 'Total budget',
    temporary: 'Temporary preferences',
    planMeal: 'Plan our meal',
    tablePlan: 'Your table plan',
    ruleChecked: 'Rule-checked before display. Every dish exists on this menu, and prices were verified.',
    total: 'Total',
    edit: 'Edit',
    regenerate: 'Regenerate',
    orderThese: 'Order These',
    orderSaved: 'Order saved to this table',
    showWaiter: 'Show This to the Waiter',
    specialRequest: 'Special request · 给餐厅',
    waiterText: 'Please make every dish vegetarian and do not add cilantro. Tell us first if any recipe cannot be confirmed.',
    waiterSub: 'Your Chinese request is shown first so staff can act quickly.',
    play: 'Play Chinese',
    atTable: 'At the table',
    currentOrder: 'currently on your table',
    questions: ['What is this?', 'How do I eat it?', 'What is the sauce?', 'Is it very spicy?'],
    askAbout: 'Ask about dishes on this table',
    answerFrom: 'Answering from this menu and your confirmed order',
    mustEscalate: 'The menu does not confirm every sauce brand or kitchen cross-contact. Ask the restaurant if that matters for an allergy.',
    billTitle: 'Split the bill',
    billSub: 'Make every amount add up to the original CNY total.',
    scanReceipt: 'Scan a receipt',
    useReceipt: 'Use sample receipt',
    equal: 'Equal Split',
    byItem: 'By Item',
    participants: 'Participants',
    billItems: 'Bill items',
    share: 'Share result',
    verified: 'Verified total',
    mismatch: 'We could not match the total. Please check the highlighted items.',
    findTitle: 'Find food that fits',
    findSub: 'Start with an intent, not a restaurant rating.',
    nearby: 'Near you',
    whyFits: 'Why it fits',
    profileTitle: 'Your Food Passport',
    profileSub: 'Hard constraints stay user-controlled. We never infer an allergy from history.',
    language: 'Language',
    crossContact: 'Avoid cross-contact',
    reset: 'Reset demo data',
    disclaimer: 'CanIEatThis provides decision support from menu evidence and user input. Always confirm with the restaurant for serious allergies.',
    matchLabel: 'No conflict',
    warningLabel: 'Needs confirmation',
    conflictLabel: 'Conflict',
    unknownLabel: 'Unknown',
  },
  ko: {
    step: '단계',
    hello: '여행자님, 안녕하세요', subtitle: '메뉴를 이해하고, 나에게 맞는 음식을 알고, 자신 있게 주문하세요.', scanMenu: '메뉴 스캔', scanSub: '중국어 메뉴를 이해해요.', foodPassport: '푸드 패스포트', anything: '먹을 수 없는 음식이 있나요?', splitBill: '계산서 나누기', findFood: '음식 찾기', recentSession: '현재 식사 세션', menuReady: '메뉴를 살펴볼 준비가 됐어요', dishes: '가지 메뉴', openSession: '세션 열기', home: '홈', profile: '프로필', menu: '메뉴', scan: '스캔', passport: '패스포트', next: '계속', save: '저장하고 메뉴 스캔', selectLanguage: '언어를 선택하세요', languageSub: '앱과 메뉴 설명에 사용할 언어입니다. 직원에게 보여주는 문장은 중국어로 유지됩니다.', avoid: '주의할 음식은 무엇인가요?', passportSub: '가능한 충돌을 알려드리는 데만 사용합니다. 언제든 바꿀 수 있어요.', allergies: '알레르기', diet: '식단 제한', preferences: '일상 선호', severe: '심각', moderate: '보통', mild: '가벼움', noAllergens: '아직 알레르기를 추가하지 않았어요', scanTitle: '메뉴 전체를 화면 안에 맞춰주세요', scanSubTitle: '메뉴 이름과 재료가 선명하게 보이도록 고정하세요.', capture: '메뉴 촬영', upload: '사진 업로드', sampleMenu: '샘플 메뉴 사용', avoidGlare: '빛 반사 피하기', keepFlat: '평평하게', everyPage: '모든 페이지', analyzing: '메뉴를 읽는 중…', analysisSub: '이름, 가격, 푸드 패스포트를 연결하고 있어요', menuResults: '메뉴 결과', checking: '푸드 패스포트와 메뉴를 확인하는 중', all: '전체', forMe: '나에게 맞는 메뉴', vegetarian: '채식', notSpicy: '맵지 않게', viewDetails: '상세 보기', mainIngredients: '주요 재료', taste: '맛', texture: '식감', cooking: '조리법', bestWith: '함께 먹기', culturalNote: '문화 메모', illustrative: '참고용 이미지 · 알레르기 판단에 사용하지 않습니다', askRestaurant: '식당에 확인하기', whySeeing: '이 상태인 이유', noConflict: '현재 선호와 충돌 없음', possibleConflict: '식당에 확인해 주세요', confirmedConflict: '선택한 식단과 맞지 않아요', unable: '이 메뉴를 확실히 인식하지 못했어요', detailsUnknown: '재료를 확정할 근거가 메뉴에 충분하지 않습니다.', detailsConflict: '푸드 패스포트와 충돌하는 재료가 포함되었거나 포함될 수 있습니다.', detailsMatch: '현재 메뉴 정보에서 충돌을 찾지 못했습니다. 알레르기 안전을 보장하지는 않습니다.', askTitle: '식당에 보여주세요', askWarning: '심각한 알레르기', playChinese: '중국어 재생', copyQuestion: '질문 복사', assistant: '다이닝 어시스턴트', helpOrder: '주문 도와줘', planTitle: '테이블을 계획해요', planSub: '식당, 메뉴, 푸드 패스포트를 알고 있어요. 이번 식사에 필요한 것만 알려주세요.', people: '몇 명인가요?', budget: '총 예산', temporary: '이번 식사 선호', planMeal: '식사 계획하기', tablePlan: '테이블 플랜', ruleChecked: '규칙 검증 완료. 모든 메뉴와 가격을 다시 확인했습니다.', total: '합계', edit: '편집', regenerate: '다시 추천', orderThese: '이대로 주문', orderSaved: '이 테이블에 주문을 저장했어요', showWaiter: '직원에게 보여주기', specialRequest: '특별 요청 · 给餐厅', waiterText: '모든 요리를 채식으로 만들고 고수를 넣지 말아 주세요. 확인할 수 없는 재료가 있다면 먼저 알려 주세요.', waiterSub: '직원이 바로 이해할 수 있도록 중국어 요청을 먼저 보여줍니다.', play: '중국어 재생', atTable: '테이블에서', currentOrder: '현재 테이블에 있어요', questions: ['이건 무엇인가요?', '어떻게 먹나요?', '소스는 무엇인가요?', '매운가요?'], askAbout: '이 테이블의 음식 질문하기', answerFrom: '현재 메뉴와 확정된 주문으로 답변합니다', mustEscalate: '모든 소스와 주방 교차 접촉을 메뉴만으로 확인할 수 없습니다. 알레르기가 중요하다면 식당에 물어보세요.', billTitle: '계산서 나누기', billSub: '모든 금액이 원래 CNY 합계와 일치해야 합니다.', scanReceipt: '영수증 스캔', useReceipt: '샘플 영수증 사용', equal: '균등 분할', byItem: '메뉴별', participants: '참여자', billItems: '계산서 항목', share: '결과 공유', verified: '검증된 합계', mismatch: '합계를 맞출 수 없습니다. 강조된 항목을 확인하세요.', findTitle: '나에게 맞는 음식 찾기', findSub: '식당 평점보다 의도에서 시작하세요.', nearby: '내 주변', whyFits: '맞는 이유', profileTitle: '푸드 패스포트', profileSub: '중요한 제한은 직접 관리합니다. 과거 기록으로 알레르기를 추측하지 않습니다.', language: '언어', crossContact: '교차 접촉 피하기', reset: '데모 데이터 초기화', disclaimer: 'CanIEatThis는 메뉴 정보와 사용자의 입력을 바탕으로 판단을 돕습니다. 심각한 알레르기는 식당에 반드시 확인하세요.', matchLabel: '충돌 없음', warningLabel: '확인 필요', conflictLabel: '충돌', unknownLabel: '알 수 없음',
  },
  ja: {
    step: 'ステップ',
    hello: 'こんにちは、旅人さん', subtitle: '料理を理解し、自分に合うか知って、自信を持って注文しましょう。', scanMenu: 'メニューをスキャン', scanSub: '中国語メニューを理解できます。', foodPassport: 'フードパスポート', anything: '食べられないものはありますか？', splitBill: '割り勘する', findFood: '料理を探す', recentSession: '現在の食事セッション', menuReady: 'メニューを見る準備ができました', dishes: '品', openSession: 'セッションを開く', home: 'ホーム', profile: 'プロフィール', menu: 'メニュー', scan: 'スキャン', passport: 'パスポート', next: '続ける', save: '保存してメニューをスキャン', selectLanguage: '言語を選択', languageSub: 'アプリと料理説明の言語です。スタッフへのメッセージは中国語のままです。', avoid: '避けたいものはありますか？', passportSub: '可能性のある衝突を示すためだけに使います。いつでも変更できます。', allergies: 'アレルギー', diet: '食事制限', preferences: '好み', severe: '重度', moderate: '中程度', mild: '軽度', noAllergens: 'アレルギーはまだありません', scanTitle: 'メニュー全体を画面に収めて', scanSubTitle: '料理名と食材が読めるようにしっかり構えてください。', capture: 'メニューを撮影', upload: '写真をアップロード', sampleMenu: 'サンプルメニューを使う', avoidGlare: '反射を避ける', keepFlat: '平らにする', everyPage: '全ページ', analyzing: 'メニューを読み取り中…', analysisSub: '料理名、価格、パスポート情報を結びつけています', menuResults: 'メニュー結果', checking: 'フードパスポートとメニューを確認中', all: 'すべて', forMe: '自分向け', vegetarian: 'ベジタリアン', notSpicy: '辛くない', viewDetails: '料理の詳細', mainIngredients: '主な食材', taste: '味', texture: '食感', cooking: '調理法', bestWith: 'おすすめの組み合わせ', culturalNote: '文化メモ', illustrative: '参考画像のみ · アレルギー判断には使いません', askRestaurant: 'お店に確認する', whySeeing: 'この状態の理由', noConflict: '好みとの衝突なし', possibleConflict: 'お店に確認してください', confirmedConflict: '選択した食事制限に合いません', unable: '料理を確実に認識できませんでした', detailsUnknown: '食材を確定する情報がメニューに足りません。', detailsConflict: 'フードパスポートと衝突する食材が含まれる、または可能性があります。', detailsMatch: '利用できるメニュー情報から衝突は見つかりませんでした。安全を保証するものではありません。', askTitle: 'お店に見せる', askWarning: '重度のアレルギー', playChinese: '中国語を再生', copyQuestion: '質問をコピー', assistant: 'ダイニングアシスタント', helpOrder: '注文を手伝って', planTitle: 'テーブルを計画しましょう', planSub: 'お店、メニュー、パスポートは把握しています。今回必要な情報だけ入力してください。', people: '何人ですか？', budget: '合計予算', temporary: '今回の好み', planMeal: '食事を計画', tablePlan: 'テーブルプラン', ruleChecked: 'ルール検証済み。メニューと価格を確認しました。', total: '合計', edit: '編集', regenerate: '再生成', orderThese: 'これを注文', orderSaved: 'テーブルに注文を保存しました', showWaiter: 'スタッフに見せる', specialRequest: '特別な要望 · 给餐厅', waiterText: 'すべての料理をベジタリアンにし、パクチーを入れないでください。確認できない場合は先に教えてください。', waiterSub: 'スタッフがすぐ行動できるよう、中国語の要望を先に表示します。', play: '中国語を再生', atTable: 'テーブルで', currentOrder: '現在テーブルにあります', questions: ['これは何ですか？', 'どう食べますか？', 'ソースは何ですか？', 'とても辛いですか？'], askAbout: 'テーブルの料理について質問', answerFrom: 'このメニューと確定した注文から回答します', mustEscalate: 'すべてのソースや厨房の交差接触はメニューだけでは確認できません。アレルギーに関わる場合はお店に確認してください。', billTitle: '割り勘', billSub: 'すべての金額を元のCNY合計に合わせます。', scanReceipt: 'レシートをスキャン', useReceipt: 'サンプルレシートを使う', equal: '均等割り', byItem: '品目ごと', participants: '参加者', billItems: '明細', share: '結果を共有', verified: '確認済み合計', mismatch: '合計が一致しません。強調された項目を確認してください。', findTitle: '自分に合う料理を探す', findSub: 'お店の評価ではなく、目的から始めましょう。', nearby: '近く', whyFits: '合う理由', profileTitle: 'フードパスポート', profileSub: '重要な制限は自分で管理します。履歴からアレルギーを推測しません。', language: '言語', crossContact: '交差接触を避ける', reset: 'デモデータをリセット', disclaimer: 'CanIEatThisはメニュー情報と入力内容から判断を支援します。重度のアレルギーは必ずお店に確認してください。', matchLabel: '衝突なし', warningLabel: '要確認', conflictLabel: '衝突', unknownLabel: '不明',
  },
  ru: {
    step: 'Шаг',
    hello: 'Здравствуйте, путешественник', subtitle: 'Поймите блюдо, узнайте, подходит ли оно вам, и заказывайте уверенно.', scanMenu: 'Сканировать меню', scanSub: 'Поймите любое китайское меню.', foodPassport: 'Пищевой паспорт', anything: 'Есть ли продукты, которые вы не едите?', splitBill: 'Разделить счёт', findFood: 'Найти еду', recentSession: 'Текущая сессия', menuReady: 'Меню готово к изучению', dishes: 'блюд', openSession: 'Открыть сессию', home: 'Главная', profile: 'Профиль', menu: 'Меню', scan: 'Скан', passport: 'Паспорт', next: 'Продолжить', save: 'Сохранить и сканировать', selectLanguage: 'Выберите язык', languageSub: 'Язык приложения и описаний блюд. Сообщения для персонала остаются на китайском.', avoid: 'Что нужно учитывать?', passportSub: 'Используем только для предупреждений о возможных конфликтах. Можно изменить в любое время.', allergies: 'Аллергены', diet: 'Ограничения питания', preferences: 'Предпочтения', severe: 'Сильная', moderate: 'Средняя', mild: 'Лёгкая', noAllergens: 'Аллергены пока не добавлены', scanTitle: 'Поместите всё меню в кадр', scanSubTitle: 'Держите телефон ровно, чтобы названия и ингредиенты были читаемы.', capture: 'Снять меню', upload: 'Загрузить фото', sampleMenu: 'Использовать пример', avoidGlare: 'Без бликов', keepFlat: 'Ровно', everyPage: 'Все страницы', analyzing: 'Читаем меню…', analysisSub: 'Связываем блюда, цены и ваш пищевой паспорт', menuResults: 'Результаты меню', checking: 'Проверяем меню по вашему пищевому паспорту', all: 'Все', forMe: 'Для меня', vegetarian: 'Вегетарианское', notSpicy: 'Не острое', viewDetails: 'Подробнее', mainIngredients: 'Основные ингредиенты', taste: 'Вкус', texture: 'Текстура', cooking: 'Приготовление', bestWith: 'Лучше с', culturalNote: 'Культурная заметка', illustrative: 'Только иллюстрация · фото не определяет аллергены', askRestaurant: 'Спросить ресторан', whySeeing: 'Почему вы это видите', noConflict: 'Конфликтов не найдено', possibleConflict: 'Уточните в ресторане', confirmedConflict: 'Не подходит выбранной диете', unable: 'Не удалось надёжно определить блюдо', detailsUnknown: 'В меню недостаточно данных для уверенного решения об ингредиентах.', detailsConflict: 'Блюдо содержит или может содержать ингредиент, конфликтующий с паспортом.', detailsMatch: 'В доступных данных меню конфликтов нет. Это не гарантия безопасности.', askTitle: 'Покажите это ресторану', askWarning: 'При сильной аллергии', playChinese: 'Воспроизвести на китайском', copyQuestion: 'Скопировать вопрос', assistant: 'Помощник по ужину', helpOrder: 'Помогите заказать', planTitle: 'Составим стол', planSub: 'Я знаю ресторан, меню и ваш паспорт. Укажите только то, чего не хватает для этого ужина.', people: 'Сколько человек?', budget: 'Общий бюджет', temporary: 'Предпочтения на этот раз', planMeal: 'Спланировать ужин', tablePlan: 'План стола', ruleChecked: 'Проверено правилами. Все блюда и цены есть в меню.', total: 'Итого', edit: 'Изменить', regenerate: 'Сгенерировать ещё', orderThese: 'Заказать это', orderSaved: 'Заказ сохранён для этого стола', showWaiter: 'Показать официанту', specialRequest: 'Особая просьба · 给餐厅', waiterText: 'Пожалуйста, приготовьте все блюда без мяса и морепродуктов и не добавляйте кинзу. Если состав нельзя подтвердить, сначала сообщите нам.', waiterSub: 'Сначала показываем китайскую просьбу, чтобы персонал понял её сразу.', play: 'Воспроизвести китайский', atTable: 'За столом', currentOrder: 'сейчас на вашем столе', questions: ['Что это?', 'Как это есть?', 'Что в соусе?', 'Очень остро?'], askAbout: 'Спросить о блюдах на столе', answerFrom: 'Ответ на основе меню и подтверждённого заказа', mustEscalate: 'Меню не подтверждает каждый соус и перекрёстный контакт на кухне. Для аллергии уточните это у ресторана.', billTitle: 'Разделить счёт', billSub: 'Все суммы должны совпасть с исходным счётом в CNY.', scanReceipt: 'Сканировать чек', useReceipt: 'Использовать пример чека', equal: 'Поровну', byItem: 'По блюдам', participants: 'Участники', billItems: 'Позиции счёта', share: 'Поделиться', verified: 'Проверенная сумма', mismatch: 'Не удалось сопоставить итог. Проверьте выделенные позиции.', findTitle: 'Найдите подходящую еду', findSub: 'Начните с намерения, а не с рейтинга ресторана.', nearby: 'Рядом', whyFits: 'Почему подходит', profileTitle: 'Ваш пищевой паспорт', profileSub: 'Важные ограничения задаёте вы. Мы не выводим аллергию из истории.', language: 'Язык', crossContact: 'Избегать перекрёстного контакта', reset: 'Сбросить демо-данные', disclaimer: 'CanIEatThis помогает принять решение на основе меню и ввода пользователя. При серьёзной аллергии всегда уточняйте у ресторана.', matchLabel: 'Без конфликта', warningLabel: 'Нужно уточнить', conflictLabel: 'Конфликт', unknownLabel: 'Неизвестно',
  },
  es: {
    step: 'Paso',
    hello: 'Hola, viajero', subtitle: 'Entiende el plato, descubre si encaja contigo y pide con confianza.', scanMenu: 'Escanear menú', scanSub: 'Entiende cualquier menú chino.', foodPassport: 'Pasaporte de comida', anything: '¿Hay algo que no puedas comer?', splitBill: 'Dividir la cuenta', findFood: 'Buscar comida', recentSession: 'Sesión actual', menuReady: 'Menú listo para explorar', dishes: 'platos', openSession: 'Abrir sesión', home: 'Inicio', profile: 'Perfil', menu: 'Menú', scan: 'Escanear', passport: 'Pasaporte', next: 'Continuar', save: 'Guardar y escanear menú', selectLanguage: 'Elige tu idioma', languageSub: 'Controla la app y las explicaciones. Los mensajes para el personal permanecen en chino.', avoid: '¿Qué debemos vigilar?', passportSub: 'Solo lo usamos para señalar posibles conflictos. Puedes cambiarlo cuando quieras.', allergies: 'Alérgenos', diet: 'Restricciones', preferences: 'Preferencias', severe: 'Grave', moderate: 'Moderada', mild: 'Leve', noAllergens: 'Aún no has añadido alérgenos', scanTitle: 'Encuadra todo el menú', scanSubTitle: 'Mantén el móvil estable para que nombres e ingredientes se lean bien.', capture: 'Capturar menú', upload: 'Subir una foto', sampleMenu: 'Usar menú de ejemplo', avoidGlare: 'Evita reflejos', keepFlat: 'Mantén plano', everyPage: 'Cada página', analyzing: 'Leyendo tu menú…', analysisSub: 'Relacionando platos, precios y tu pasaporte', menuResults: 'Resultados del menú', checking: 'Comprobando el menú con tu pasaporte', all: 'Todo', forMe: 'Para mí', vegetarian: 'Vegetariano', notSpicy: 'Sin picante', viewDetails: 'Ver detalles', mainIngredients: 'Ingredientes principales', taste: 'Sabor', texture: 'Textura', cooking: 'Cocción', bestWith: 'Combina con', culturalNote: 'Nota cultural', illustrative: 'Solo ilustrativo · las fotos no determinan alérgenos', askRestaurant: 'Preguntar al restaurante', whySeeing: 'Por qué aparece esto', noConflict: 'Sin conflicto encontrado', possibleConflict: 'Confirma con el restaurante', confirmedConflict: 'No encaja con tu dieta', unable: 'No pudimos identificar este plato con fiabilidad', detailsUnknown: 'El menú no aporta pruebas suficientes para decidir los ingredientes.', detailsConflict: 'Contiene o puede contener un ingrediente que entra en conflicto con tu pasaporte.', detailsMatch: 'No hay conflicto en la información disponible. No es una garantía de seguridad.', askTitle: 'Muéstralo al restaurante', askWarning: 'Para una alergia grave', playChinese: 'Reproducir en chino', copyQuestion: 'Copiar pregunta', assistant: 'Asistente de mesa', helpOrder: 'Ayúdame a pedir', planTitle: 'Planifiquemos la mesa', planSub: 'Ya conozco el restaurante, el menú y tu pasaporte. Completa solo lo que falta para esta comida.', people: '¿Cuántas personas?', budget: 'Presupuesto total', temporary: 'Preferencias temporales', planMeal: 'Planificar comida', tablePlan: 'Plan de mesa', ruleChecked: 'Verificado por reglas. Todos los platos y precios existen en este menú.', total: 'Total', edit: 'Editar', regenerate: 'Regenerar', orderThese: 'Pedir esto', orderSaved: 'Pedido guardado para esta mesa', showWaiter: 'Mostrar al camarero', specialRequest: 'Solicitud especial · 给餐厅', waiterText: 'Por favor, preparen todos los platos vegetarianos y no añadan cilantro. Avísennos primero si no pueden confirmar algún ingrediente.', waiterSub: 'Mostramos primero el mensaje en chino para que el personal actúe rápido.', play: 'Reproducir chino', atTable: 'En la mesa', currentOrder: 'ahora en tu mesa', questions: ['¿Qué es esto?', '¿Cómo se come?', '¿Qué lleva la salsa?', '¿Pica mucho?'], askAbout: 'Preguntar por los platos de esta mesa', answerFrom: 'Respuesta basada en este menú y tu pedido confirmado', mustEscalate: 'El menú no confirma todas las salsas ni el contacto cruzado en cocina. Pregunta al restaurante si es importante para una alergia.', billTitle: 'Dividir la cuenta', billSub: 'Cada importe debe coincidir con el total original en CNY.', scanReceipt: 'Escanear recibo', useReceipt: 'Usar recibo de ejemplo', equal: 'A partes iguales', byItem: 'Por plato', participants: 'Participantes', billItems: 'Elementos de la cuenta', share: 'Compartir resultado', verified: 'Total verificado', mismatch: 'No pudimos cuadrar el total. Revisa los elementos destacados.', findTitle: 'Encuentra comida que encaje', findSub: 'Empieza por tu intención, no por la valoración.', nearby: 'Cerca de ti', whyFits: 'Por qué encaja', profileTitle: 'Tu pasaporte de comida', profileSub: 'Tú controlas las restricciones importantes. Nunca inferimos alergias del historial.', language: 'Idioma', crossContact: 'Evitar contacto cruzado', reset: 'Restablecer demo', disclaimer: 'CanIEatThis ayuda a decidir con la información del menú y tus datos. Para alergias graves, confirma siempre con el restaurante.', matchLabel: 'Sin conflicto', warningLabel: 'Necesita confirmación', conflictLabel: 'Conflicto', unknownLabel: 'Desconocido',
  },
  it: {
    step: 'Passo',
    hello: 'Ciao, viaggiatore', subtitle: 'Capisci il piatto, scopri cosa fa per te e ordina con fiducia.', scanMenu: 'Scansiona il menu', scanSub: 'Capisci qualsiasi menu cinese.', foodPassport: 'Food Passport', anything: 'C’è qualcosa che non puoi mangiare?', splitBill: 'Dividi il conto', findFood: 'Trova cibo', recentSession: 'Sessione attuale', menuReady: 'Menu pronto da esplorare', dishes: 'piatti', openSession: 'Apri sessione', home: 'Home', profile: 'Profilo', menu: 'Menu', scan: 'Scansiona', passport: 'Passport', next: 'Continua', save: 'Salva e scansiona un menu', selectLanguage: 'Scegli la lingua', languageSub: 'Controlla app e spiegazioni dei piatti. I messaggi per il personale restano in cinese.', avoid: 'Cosa dobbiamo controllare?', passportSub: 'Lo usiamo solo per segnalare possibili conflitti. Puoi cambiarlo quando vuoi.', allergies: 'Allergeni', diet: 'Restrizioni alimentari', preferences: 'Preferenze', severe: 'Grave', moderate: 'Moderata', mild: 'Lieve', noAllergens: 'Nessun allergene aggiunto', scanTitle: 'Inquadra tutto il menu', scanSubTitle: 'Tieni fermo il telefono per mantenere leggibili nomi e ingredienti.', capture: 'Acquisisci menu', upload: 'Carica una foto', sampleMenu: 'Usa menu di esempio', avoidGlare: 'Evita riflessi', keepFlat: 'Tieni piatto', everyPage: 'Ogni pagina', analyzing: 'Leggiamo il menu…', analysisSub: 'Colleghiamo piatti, prezzi e Food Passport', menuResults: 'Risultati del menu', checking: 'Controlliamo il menu con il tuo passport', all: 'Tutti', forMe: 'Per me', vegetarian: 'Vegetariano', notSpicy: 'Non piccante', viewDetails: 'Vedi dettagli', mainIngredients: 'Ingredienti principali', taste: 'Gusto', texture: 'Consistenza', cooking: 'Cottura', bestWith: 'Da gustare con', culturalNote: 'Nota culturale', illustrative: 'Solo illustrativo · le foto non determinano gli allergeni', askRestaurant: 'Chiedi al ristorante', whySeeing: 'Perché lo vedi', noConflict: 'Nessun conflitto trovato', possibleConflict: 'Verifica al ristorante', confirmedConflict: 'Non adatto alla dieta scelta', unable: 'Non abbiamo identificato il piatto con certezza', detailsUnknown: 'Il menu non offre prove sufficienti per decidere gli ingredienti.', detailsConflict: 'Contiene o potrebbe contenere un ingrediente in conflitto con il tuo passport.', detailsMatch: 'Nessun conflitto nei dati disponibili. Non è una garanzia di sicurezza.', askTitle: 'Mostralo al ristorante', askWarning: 'Per allergia grave', playChinese: 'Riproduci in cinese', copyQuestion: 'Copia domanda', assistant: 'Assistente a tavola', helpOrder: 'Aiutami a ordinare', planTitle: 'Pianifichiamo il tavolo', planSub: 'Conosco ristorante, menu e passport. Inserisci solo ciò che manca per questo pasto.', people: 'Quante persone?', budget: 'Budget totale', temporary: 'Preferenze temporanee', planMeal: 'Pianifica il pasto', tablePlan: 'Piano del tavolo', ruleChecked: 'Verificato dalle regole. Piatti e prezzi sono presenti nel menu.', total: 'Totale', edit: 'Modifica', regenerate: 'Rigenera', orderThese: 'Ordina questi', orderSaved: 'Ordine salvato per questo tavolo', showWaiter: 'Mostra al cameriere', specialRequest: 'Richiesta speciale · 给餐厅', waiterText: 'Preparate tutti i piatti vegetariani e non aggiungete coriandolo. Avvisateci prima se qualche ingrediente non può essere confermato.', waiterSub: 'Mostriamo prima la richiesta in cinese per aiutare il personale.', play: 'Riproduci cinese', atTable: 'A tavola', currentOrder: 'ora sul tuo tavolo', questions: ['Cos’è questo?', 'Come si mangia?', 'Cosa c’è nella salsa?', 'È molto piccante?'], askAbout: 'Chiedi dei piatti sul tavolo', answerFrom: 'Risposta basata su questo menu e sull’ordine confermato', mustEscalate: 'Il menu non conferma ogni salsa né il contatto crociato in cucina. Chiedi al ristorante se è importante per un’allergia.', billTitle: 'Dividi il conto', billSub: 'Ogni importo deve corrispondere al totale originale in CNY.', scanReceipt: 'Scansiona ricevuta', useReceipt: 'Usa ricevuta di esempio', equal: 'In parti uguali', byItem: 'Per piatto', participants: 'Partecipanti', billItems: 'Voci del conto', share: 'Condividi risultato', verified: 'Totale verificato', mismatch: 'Non abbiamo potuto verificare il totale. Controlla le voci evidenziate.', findTitle: 'Trova cibo adatto a te', findSub: 'Parti dall’intento, non dalla valutazione.', nearby: 'Vicino a te', whyFits: 'Perché fa per te', profileTitle: 'Il tuo Food Passport', profileSub: 'Gestisci tu le restrizioni importanti. Non deduciamo allergie dalla cronologia.', language: 'Lingua', crossContact: 'Evita il contatto crociato', reset: 'Reimposta demo', disclaimer: 'CanIEatThis aiuta a decidere usando il menu e i dati inseriti. Per allergie gravi, verifica sempre con il ristorante.', matchLabel: 'Nessun conflitto', warningLabel: 'Da confermare', conflictLabel: 'Conflitto', unknownLabel: 'Sconosciuto',
  },
} as const

type OnboardingCopy = {
  welcomeEyebrow: string
  welcomeTitle: string
  welcomeSubtitle: string
  welcomeCta: string
  welcomeFootnote: string
  welcomeMenuNote: string
  welcomeFitNote: string
  languageEyebrow: string
  clarityNote: string
  passportEyebrow: string
  back: string
  assistantNote: string
  safetyFlags: string
  selectAllToAvoid: string
  selected: (count: number) => string
  addOne: string
  otherAllergen: string
  otherAllergenPlaceholder: string
  selectedAllergens: string
  setSeparately: string
  personalSettings: string
  severityQuestion: string
  severityHint: (label: string) => string
  crossContactHint: (label: string) => string
  profileBuilder: string
  dietaryProfile: string
  dietaryProfileHint: string
  saved: (count: number) => string
  howDoYouEat: string
  chooseEatingPattern: string
  faithRequirements: string
  faithHint: string
  faithOtherLabel: string
  faithOtherPlaceholder: string
  foodsToLeaveOut: string
  meatSeafoodHint: string
  otherDietRequirement: string
  otherDietHint: string
  otherRequirementLabel: string
  otherRequirementPlaceholder: string
  everydayKicker: string
  everydayTitle: string
  everydayHint: string
  spiceQuestion: string
  spiceHint: string
  spiceCannot: string
  spiceLow: string
  spiceMedium: string
  spiceAny: string
  otherPreferences: string
  preferenceHint: string
  saveChanges: string
}

const onboardingCopy: Record<Language, OnboardingCopy> = {
  en: {
    welcomeEyebrow: 'YOUR DINING COMPANION IN CHINA', welcomeTitle: 'Discover Chinese food with confidence.', welcomeSubtitle: 'Understand the menu, find dishes that fit you, and order with confidence—wherever the meal takes you.', welcomeCta: 'Get started', welcomeFootnote: 'Clear answers for a better meal.', welcomeMenuNote: 'Menu, understood', welcomeFitNote: 'Know what fits you', languageEyebrow: 'Welcome to your dining companion', clarityNote: 'Built around clarity, not false certainty.', passportEyebrow: 'Food Passport', back: 'Back', assistantNote: 'I’ll help spot ingredients that may need a closer look.', safetyFlags: 'SAFETY FLAGS', selectAllToAvoid: 'Select all ingredients you need to avoid.', selected: (count) => `${count} selected`, addOne: 'Add one', otherAllergen: 'Other allergen', otherAllergenPlaceholder: 'e.g. mustard', selectedAllergens: 'About each selected allergen', setSeparately: 'Set them separately', personalSettings: 'Personal settings for this allergen', severityQuestion: 'How severe is this allergy?', severityHint: (label) => `Set the risk level for ${label}.`, crossContactHint: (label) => `Only for ${label}; shared oil, wok or utensils.`, profileBuilder: 'PROFILE BUILDER', dietaryProfile: 'Dietary profile', dietaryProfileHint: 'Answer a few broad questions instead of repeating every ingredient.', saved: (count) => `${count} saved`, howDoYouEat: 'How do you eat?', chooseEatingPattern: 'Choose one eating pattern.', faithRequirements: 'Any faith-based requirements?', faithHint: 'We’ll keep this separate from allergies.', faithOtherLabel: 'Tell us what to follow', faithOtherPlaceholder: 'e.g. Jain, Buddhist vegetarian', foodsToLeaveOut: 'Which foods should we leave out?', meatSeafoodHint: 'Select any meat or seafood you avoid.', otherDietRequirement: 'Other dietary requirement', otherDietHint: 'Add anything we should know.', otherRequirementLabel: 'Other requirement', otherRequirementPlaceholder: 'e.g. no alcohol, gluten-free, low sodium', everydayKicker: 'EVERYDAY PREFERENCES', everydayTitle: 'Everyday preferences', everydayHint: 'Fine-tune recommendations without turning every preference into a hard rule.', spiceQuestion: 'How spicy can you handle?', spiceHint: 'Set your tolerance—from cannot handle spicy to any spicy level.', spiceCannot: 'Cannot handle spicy', spiceLow: 'Low spicy', spiceMedium: 'Medium spicy', spiceAny: 'Any spicy', otherPreferences: 'What else should we keep in mind?', preferenceHint: 'These help sort recommendations, not block every dish.', saveChanges: 'Save changes',
  },
  ko: {
    welcomeEyebrow: '중국에서의 당신의 다이닝 동반자', welcomeTitle: '중국 음식을 자신 있게 만나보세요.', welcomeSubtitle: '메뉴를 이해하고, 나에게 맞는 음식을 찾고, 어디서든 자신 있게 주문하세요.', welcomeCta: '시작하기', welcomeFootnote: '더 나은 식사를 위한 명확한 답변.', welcomeMenuNote: '메뉴를 이해해요', welcomeFitNote: '나에게 맞는 음식을 알아보세요', languageEyebrow: '당신의 다이닝 동반자와 함께하세요', clarityNote: '막연한 확신이 아닌 명확한 정보를 바탕으로 합니다.', passportEyebrow: '푸드 패스포트', back: '뒤로', assistantNote: '더 자세히 확인해야 할 재료를 찾아드릴게요.', safetyFlags: '안전 확인', selectAllToAvoid: '피해야 하는 재료를 모두 선택하세요.', selected: (count) => `${count}개 선택됨`, addOne: '추가하기', otherAllergen: '기타 알레르기', otherAllergenPlaceholder: '예: 겨자', selectedAllergens: '선택한 알레르기별 설정', setSeparately: '각각 설정', personalSettings: '이 알레르기에 대한 개인 설정', severityQuestion: '알레르기가 얼마나 심한가요?', severityHint: (label) => `${label}의 위험 수준을 설정하세요.`, crossContactHint: (label) => `${label}에만 적용 · 공용 기름, 웍 또는 조리도구`, profileBuilder: '프로필 만들기', dietaryProfile: '식단 프로필', dietaryProfileHint: '재료를 하나씩 반복해서 고르는 대신 큰 범위의 질문에 답해 주세요.', saved: (count) => `${count}개 저장됨`, howDoYouEat: '어떤 식단을 따르나요?', chooseEatingPattern: '하나의 식습관을 선택하세요.', faithRequirements: '종교적인 식단 기준이 있나요?', faithHint: '알레르기와는 별도로 관리합니다.', faithOtherLabel: '따를 기준을 알려주세요', faithOtherPlaceholder: '예: 자이나교, 불교 채식', foodsToLeaveOut: '어떤 음식을 제외할까요?', meatSeafoodHint: '피하는 육류나 해산물을 모두 선택하세요.', otherDietRequirement: '기타 식단 요구사항', otherDietHint: '알려주실 내용을 추가하세요.', otherRequirementLabel: '기타 요구사항', otherRequirementPlaceholder: '예: 술 제외, 글루텐 프리, 저염', everydayKicker: '일상 선호', everydayTitle: '일상 선호', everydayHint: '모든 선호를 엄격한 규칙으로 만들지 않고 추천을 세밀하게 조정합니다.', spiceQuestion: '얼마나 매운 음식을 먹을 수 있나요?', spiceHint: '매운 음식을 전혀 못 먹는 정도부터 모두 가능한 정도까지 선택하세요.', spiceCannot: '매운 음식 불가', spiceLow: '약간 매운맛', spiceMedium: '중간 매운맛', spiceAny: '모두 가능', otherPreferences: '그 밖에 고려할 점이 있나요?', preferenceHint: '추천 순서를 정하는 데 사용하며 모든 메뉴를 차단하지는 않습니다.', saveChanges: '변경사항 저장',
  },
  ja: {
    welcomeEyebrow: '中国でのあなたのダイニングコンパニオン', welcomeTitle: '中国料理を自信を持って楽しみましょう。', welcomeSubtitle: 'メニューを理解し、自分に合う料理を見つけ、どんな食事でも自信を持って注文しましょう。', welcomeCta: '始める', welcomeFootnote: 'より良い食事のための、わかりやすい答え。', welcomeMenuNote: 'メニューを理解', welcomeFitNote: '自分に合うものを知る', languageEyebrow: 'あなたのダイニングコンパニオンへようこそ', clarityNote: '曖昧な確信ではなく、わかりやすさを大切にしています。', passportEyebrow: 'フードパスポート', back: '戻る', assistantNote: '詳しく確認したい食材を見つけるお手伝いをします。', safetyFlags: '安全確認', selectAllToAvoid: '避けたい食材をすべて選択してください。', selected: (count) => `${count}件選択`, addOne: '追加する', otherAllergen: 'その他のアレルゲン', otherAllergenPlaceholder: '例：マスタード', selectedAllergens: '選択したアレルゲンの設定', setSeparately: '個別に設定', personalSettings: 'このアレルゲンの個人設定', severityQuestion: 'このアレルギーの重症度は？', severityHint: (label) => `${label}のリスクレベルを設定してください。`, crossContactHint: (label) => `${label}のみ · 共用の油、鍋、調理器具`, profileBuilder: 'プロフィール作成', dietaryProfile: '食事プロフィール', dietaryProfileHint: '食材を一つずつ繰り返し選ぶ代わりに、いくつかの質問に答えてください。', saved: (count) => `${count}件保存`, howDoYouEat: 'どのような食事をしていますか？', chooseEatingPattern: '食事スタイルを1つ選択してください。', faithRequirements: '宗教上の条件はありますか？', faithHint: 'アレルギーとは別に管理します。', faithOtherLabel: '従う条件を教えてください', faithOtherPlaceholder: '例：ジャイナ教、仏教徒向けベジタリアン', foodsToLeaveOut: 'どの食材を避けますか？', meatSeafoodHint: '避けたい肉や魚介類を選択してください。', otherDietRequirement: 'その他の食事条件', otherDietHint: '伝えておきたいことを追加してください。', otherRequirementLabel: 'その他の条件', otherRequirementPlaceholder: '例：アルコールなし、グルテンフリー、減塩', everydayKicker: '日常の好み', everydayTitle: '日常の好み', everydayHint: 'すべての好みを厳しい条件にせず、推薦を細かく調整します。', spiceQuestion: 'どのくらい辛いものを食べられますか？', spiceHint: '辛いものが苦手な状態から、どんな辛さでも大丈夫な状態まで選択してください。', spiceCannot: '辛いものは苦手', spiceLow: '辛さ控えめ', spiceMedium: '中辛', spiceAny: '辛さは何でも', otherPreferences: 'ほかに考慮することはありますか？', preferenceHint: '推薦の並び替えに使い、すべての料理を除外するものではありません。', saveChanges: '変更を保存',
  },
  ru: {
    welcomeEyebrow: 'ВАШ СПУТНИК ПО УЖИНУ В КИТАЕ', welcomeTitle: 'Открывайте китайскую кухню с уверенностью.', welcomeSubtitle: 'Понимайте меню, находите подходящие блюда и заказывайте уверенно — где бы вы ни обедали.', welcomeCta: 'Начать', welcomeFootnote: 'Понятные ответы для лучшего ужина.', welcomeMenuNote: 'Меню стало понятнее', welcomeFitNote: 'Узнайте, что вам подходит', languageEyebrow: 'Добро пожаловать к вашему помощнику за столом', clarityNote: 'Мы ставим ясность выше необоснованной уверенности.', passportEyebrow: 'Пищевой паспорт', back: 'Назад', assistantNote: 'Я помогу найти ингредиенты, которые стоит проверить внимательнее.', safetyFlags: 'ПРОВЕРКА БЕЗОПАСНОСТИ', selectAllToAvoid: 'Выберите все ингредиенты, которых нужно избегать.', selected: (count) => `Выбрано: ${count}`, addOne: 'Добавить', otherAllergen: 'Другой аллерген', otherAllergenPlaceholder: 'например, горчица', selectedAllergens: 'Настройки выбранных аллергенов', setSeparately: 'Настроить отдельно', personalSettings: 'Персональные настройки этого аллергена', severityQuestion: 'Насколько сильна эта аллергия?', severityHint: (label) => `Укажите уровень риска для: ${label}.`, crossContactHint: (label) => `Только для ${label} · общее масло, вок или посуда`, profileBuilder: 'НАСТРОЙКА ПРОФИЛЯ', dietaryProfile: 'Пищевой профиль', dietaryProfileHint: 'Ответьте на несколько общих вопросов вместо выбора каждого ингредиента по отдельности.', saved: (count) => `Сохранено: ${count}`, howDoYouEat: 'Какого питания вы придерживаетесь?', chooseEatingPattern: 'Выберите один тип питания.', faithRequirements: 'Есть религиозные требования?', faithHint: 'Мы будем хранить их отдельно от аллергий.', faithOtherLabel: 'Расскажите, что соблюдать', faithOtherPlaceholder: 'например, джайнизм, буддийское вегетарианство', foodsToLeaveOut: 'Какие продукты исключить?', meatSeafoodHint: 'Выберите мясо или морепродукты, которых вы избегаете.', otherDietRequirement: 'Другое требование к питанию', otherDietHint: 'Добавьте всё, что нам нужно знать.', otherRequirementLabel: 'Другое требование', otherRequirementPlaceholder: 'например, без алкоголя, без глютена, мало соли', everydayKicker: 'ПОВСЕДНЕВНЫЕ ПРЕДПОЧТЕНИЯ', everydayTitle: 'Повседневные предпочтения', everydayHint: 'Настройте рекомендации, не превращая каждое предпочтение в жёсткое правило.', spiceQuestion: 'Насколько острую еду вы переносите?', spiceHint: 'Выберите уровень — от полной непереносимости острого до любой остроты.', spiceCannot: 'Не могу есть острое', spiceLow: 'Слегка острое', spiceMedium: 'Средняя острота', spiceAny: 'Любая острота', otherPreferences: 'Что ещё нам учитывать?', preferenceHint: 'Это помогает сортировать рекомендации, но не блокирует все блюда.', saveChanges: 'Сохранить изменения',
  },
  es: {
    welcomeEyebrow: 'TU COMPAÑERO DE MESA EN CHINA', welcomeTitle: 'Descubre la cocina china con confianza.', welcomeSubtitle: 'Entiende el menú, encuentra platos que encajen contigo y pide con confianza, estés donde estés.', welcomeCta: 'Empezar', welcomeFootnote: 'Respuestas claras para disfrutar más.', welcomeMenuNote: 'Menú entendido', welcomeFitNote: 'Descubre qué encaja contigo', languageEyebrow: 'Te damos la bienvenida a tu compañero de mesa', clarityNote: 'Diseñado para ofrecer claridad, no una falsa certeza.', passportEyebrow: 'Pasaporte de comida', back: 'Atrás', assistantNote: 'Te ayudaré a detectar ingredientes que conviene revisar con más atención.', safetyFlags: 'COMPROBACIONES DE SEGURIDAD', selectAllToAvoid: 'Selecciona todos los ingredientes que debas evitar.', selected: (count) => `${count} seleccionados`, addOne: 'Añadir', otherAllergen: 'Otro alérgeno', otherAllergenPlaceholder: 'p. ej., mostaza', selectedAllergens: 'Configuración de cada alérgeno', setSeparately: 'Configúralos por separado', personalSettings: 'Configuración personal de este alérgeno', severityQuestion: '¿Qué gravedad tiene esta alergia?', severityHint: (label) => `Define el nivel de riesgo para ${label}.`, crossContactHint: (label) => `Solo para ${label}; aceite, wok o utensilios compartidos.`, profileBuilder: 'CREADOR DEL PERFIL', dietaryProfile: 'Perfil alimentario', dietaryProfileHint: 'Responde unas preguntas generales en lugar de repetir cada ingrediente.', saved: (count) => `${count} guardados`, howDoYouEat: '¿Cómo te alimentas?', chooseEatingPattern: 'Elige un patrón alimentario.', faithRequirements: '¿Tienes requisitos religiosos?', faithHint: 'Los mantendremos separados de las alergias.', faithOtherLabel: 'Cuéntanos qué debemos seguir', faithOtherPlaceholder: 'p. ej., jainismo, vegetarianismo budista', foodsToLeaveOut: '¿Qué alimentos debemos excluir?', meatSeafoodHint: 'Selecciona la carne o el marisco que evitas.', otherDietRequirement: 'Otro requisito alimentario', otherDietHint: 'Añade cualquier cosa que debamos saber.', otherRequirementLabel: 'Otro requisito', otherRequirementPlaceholder: 'p. ej., sin alcohol, sin gluten, bajo en sal', everydayKicker: 'PREFERENCIAS DIARIAS', everydayTitle: 'Preferencias diarias', everydayHint: 'Afina las recomendaciones sin convertir cada preferencia en una regla estricta.', spiceQuestion: '¿Cuánto picante toleras?', spiceHint: 'Define tu tolerancia: desde nada de picante hasta cualquier nivel.', spiceCannot: 'No tolero el picante', spiceLow: 'Poco picante', spiceMedium: 'Picante medio', spiceAny: 'Cualquier picante', otherPreferences: '¿Qué más deberíamos tener en cuenta?', preferenceHint: 'Ayuda a ordenar las recomendaciones, no a bloquear todos los platos.', saveChanges: 'Guardar cambios',
  },
  it: {
    welcomeEyebrow: 'IL TUO COMPAGNO DI TAVOLA IN CINA', welcomeTitle: 'Scopri la cucina cinese con fiducia.', welcomeSubtitle: 'Capisci il menu, trova piatti adatti a te e ordina con fiducia, ovunque ti porti il pasto.', welcomeCta: 'Inizia', welcomeFootnote: 'Risposte chiare per un pasto migliore.', welcomeMenuNote: 'Menu compreso', welcomeFitNote: 'Scopri cosa fa per te', languageEyebrow: 'Benvenuto nel tuo compagno di tavola', clarityNote: 'Puntiamo sulla chiarezza, non su false certezze.', passportEyebrow: 'Passaporto alimentare', back: 'Indietro', assistantNote: 'Ti aiuterò a individuare gli ingredienti che meritano un controllo più attento.', safetyFlags: 'CONTROLLI DI SICUREZZA', selectAllToAvoid: 'Seleziona tutti gli ingredienti da evitare.', selected: (count) => `${count} selezionati`, addOne: 'Aggiungi', otherAllergen: 'Altro allergene', otherAllergenPlaceholder: 'es. senape', selectedAllergens: 'Impostazioni per ogni allergene', setSeparately: 'Impostali separatamente', personalSettings: 'Impostazioni personali per questo allergene', severityQuestion: 'Quanto è grave questa allergia?', severityHint: (label) => `Imposta il livello di rischio per ${label}.`, crossContactHint: (label) => `Solo per ${label}; olio, wok o utensili condivisi.`, profileBuilder: 'CREAZIONE DEL PROFILO', dietaryProfile: 'Profilo alimentare', dietaryProfileHint: 'Rispondi a poche domande generali invece di ripetere ogni ingrediente.', saved: (count) => `${count} salvati`, howDoYouEat: 'Come mangi?', chooseEatingPattern: 'Scegli uno stile alimentare.', faithRequirements: 'Hai esigenze legate alla fede?', faithHint: 'Le terremo separate dalle allergie.', faithOtherLabel: 'Dicci cosa dobbiamo seguire', faithOtherPlaceholder: 'es. giainismo, vegetariano buddista', foodsToLeaveOut: 'Quali alimenti dobbiamo escludere?', meatSeafoodHint: 'Seleziona la carne o i frutti di mare che eviti.', otherDietRequirement: 'Altra esigenza alimentare', otherDietHint: 'Aggiungi ciò che dovremmo sapere.', otherRequirementLabel: 'Altra esigenza', otherRequirementPlaceholder: 'es. niente alcol, senza glutine, poco sale', everydayKicker: 'PREFERENZE QUOTIDIANE', everydayTitle: 'Preferenze quotidiane', everydayHint: 'Affina i suggerimenti senza trasformare ogni preferenza in una regola rigida.', spiceQuestion: 'Quanto piccante riesci a mangiare?', spiceHint: 'Imposta la tua tolleranza, da niente piccante a qualsiasi livello.', spiceCannot: 'Non tollero il piccante', spiceLow: 'Poco piccante', spiceMedium: 'Piccante medio', spiceAny: 'Qualsiasi livello', otherPreferences: 'Cos’altro dovremmo considerare?', preferenceHint: 'Aiutano a ordinare i suggerimenti, non a bloccare ogni piatto.', saveChanges: 'Salva modifiche',
  },
}

type CopyKey = { [Key in keyof typeof copy.en]: (typeof copy.en)[Key] extends string ? Key : never }[keyof typeof copy.en]
const completedCheckingCopy: Record<Language, string> = {
  en: 'Food Passport check complete',
  ko: '푸드 패스포트 확인 완료',
  ja: 'フードパスポートの確認が完了しました',
  ru: 'Проверка по пищевому паспорту завершена',
  es: 'Comprobación con tu pasaporte completada',
  it: 'Verifica con il tuo Food Passport completata',
}
const tFor = (language: Language, key: CopyKey): string => (key === 'checking' ? completedCheckingCopy[language] : (copy[language][key] as string)).replace(/CanIEatThis/g, 'Bitewise')

type AccountCopy = {
  registerEyebrow: string; registerTitle: string; registerSubtitle: string; usernameLabel: string; usernamePlaceholder: string; emailLabel: string; emailPlaceholder: string; continueLabel: string
  loginEyebrow: string; loginTitle: string; loginSubtitle: string; loginEmailPlaceholder: string; loginButton: string; loginError: string; registerNewUser: string
  profileEyebrow: string; profileTitle: string; basicInfo: string; foodPassportTitle: string; foodPassportDesc: string; otherSettings: string; languagePreference: string; languagePreferenceDesc: string; signOut: string; signOutDesc: string; resetDemo: string; resetDemoDesc: string; passportSummary: string
}

const accountCopy: Record<Language, AccountCopy> = {
  en: { registerEyebrow: 'CREATE YOUR PROFILE', registerTitle: 'Make the meal yours.', registerSubtitle: 'Save your name and email so your Food Passport stays with you.', usernameLabel: 'Username', usernamePlaceholder: 'e.g. Alex Chen', emailLabel: 'Email', emailPlaceholder: 'you@example.com', continueLabel: 'Continue', loginEyebrow: 'WELCOME BACK', loginTitle: 'Let’s get back to your table.', loginSubtitle: 'Enter your email to continue with your saved Food Passport.', loginEmailPlaceholder: 'you@example.com', loginButton: 'Log in', loginError: 'That email does not match this demo account.', registerNewUser: 'Register a new user', profileEyebrow: 'MY PROFILE', profileTitle: 'Make dining feel more like you.', basicInfo: 'Basic information', foodPassportTitle: 'Food Passport', foodPassportDesc: 'Allergies, dietary rules and everyday preferences', otherSettings: 'Other settings', languagePreference: 'Language preference', languagePreferenceDesc: 'Change the language used across Bitewise', signOut: 'Log out', signOutDesc: 'Return to the login screen', resetDemo: 'Reset demo', resetDemoDesc: 'Clear this demo and start from the welcome page', passportSummary: 'Your personal food safety settings' },
  ko: { registerEyebrow: '프로필 만들기', registerTitle: '나에게 맞는 식사를 시작하세요.', registerSubtitle: '이름과 이메일을 저장하면 푸드 패스포트를 계속 사용할 수 있어요.', usernameLabel: '사용자 이름', usernamePlaceholder: '예: Alex Chen', emailLabel: '이메일', emailPlaceholder: '이메일을 입력하세요', continueLabel: '계속', loginEyebrow: '다시 오셨군요', loginTitle: '테이블로 돌아가요.', loginSubtitle: '저장된 푸드 패스포트를 사용하려면 이메일을 입력하세요.', loginEmailPlaceholder: '이메일을 입력하세요', loginButton: '로그인', loginError: '이 데모 계정과 일치하지 않는 이메일입니다.', registerNewUser: '새 사용자 등록', profileEyebrow: '내 프로필', profileTitle: '더 나다운 식사를 만들어 보세요.', basicInfo: '기본 정보', foodPassportTitle: '푸드 패스포트', foodPassportDesc: '알레르기, 식단 규칙과 일상 선호', otherSettings: '기타 설정', languagePreference: '언어 설정', languagePreferenceDesc: 'Bitewise에서 사용할 언어 변경', signOut: '로그아웃', signOutDesc: '로그인 화면으로 돌아가기', resetDemo: '데모 초기화', resetDemoDesc: '데모를 지우고 환영 페이지부터 시작', passportSummary: '개인 음식 안전 설정' },
  ja: { registerEyebrow: 'プロフィールを作成', registerTitle: '自分らしい食事を始めましょう。', registerSubtitle: '名前とメールを保存すると、フードパスポートを使い続けられます。', usernameLabel: 'ユーザー名', usernamePlaceholder: '例：Alex Chen', emailLabel: 'メール', emailPlaceholder: 'you@example.com', continueLabel: '続ける', loginEyebrow: 'おかえりなさい', loginTitle: 'テーブルに戻りましょう。', loginSubtitle: '保存したフードパスポートを使うにはメールアドレスを入力してください。', loginEmailPlaceholder: 'メールアドレス', loginButton: 'ログイン', loginError: 'このデモアカウントと一致しません。', registerNewUser: '新しいユーザーを登録', profileEyebrow: 'マイプロフィール', profileTitle: 'もっと自分らしい食事に。', basicInfo: '基本情報', foodPassportTitle: 'フードパスポート', foodPassportDesc: 'アレルギー、食事ルール、日常の好み', otherSettings: 'その他の設定', languagePreference: '言語設定', languagePreferenceDesc: 'Bitewiseで使う言語を変更', signOut: 'ログアウト', signOutDesc: 'ログイン画面に戻る', resetDemo: 'デモをリセット', resetDemoDesc: 'デモを消去してウェルカムページから開始', passportSummary: 'あなたの食の安全設定' },
  ru: { registerEyebrow: 'СОЗДАЙТЕ ПРОФИЛЬ', registerTitle: 'Сделайте ужин своим.', registerSubtitle: 'Сохраните имя и почту, чтобы ваш пищевой паспорт был с вами.', usernameLabel: 'Имя пользователя', usernamePlaceholder: 'например, Alex Chen', emailLabel: 'Электронная почта', emailPlaceholder: 'you@example.com', continueLabel: 'Продолжить', loginEyebrow: 'С ВОЗВРАЩЕНИЕМ', loginTitle: 'Вернёмся к вашему столу.', loginSubtitle: 'Введите электронную почту, чтобы продолжить с сохранённым паспортом.', loginEmailPlaceholder: 'Ваша электронная почта', loginButton: 'Войти', loginError: 'Эта почта не совпадает с демо-аккаунтом.', registerNewUser: 'Зарегистрировать нового пользователя', profileEyebrow: 'МОЙ ПРОФИЛЬ', profileTitle: 'Сделайте питание своим.', basicInfo: 'Основная информация', foodPassportTitle: 'Пищевой паспорт', foodPassportDesc: 'Аллергии, правила питания и предпочтения', otherSettings: 'Другие настройки', languagePreference: 'Язык', languagePreferenceDesc: 'Изменить язык Bitewise', signOut: 'Выйти', signOutDesc: 'Вернуться к экрану входа', resetDemo: 'Сбросить демо', resetDemoDesc: 'Очистить демо и начать с приветствия', passportSummary: 'Ваши настройки пищевой безопасности' },
  es: { registerEyebrow: 'CREA TU PERFIL', registerTitle: 'Haz tuya la comida.', registerSubtitle: 'Guarda tu nombre y correo para conservar tu pasaporte de comida.', usernameLabel: 'Nombre de usuario', usernamePlaceholder: 'p. ej., Alex Chen', emailLabel: 'Correo electrónico', emailPlaceholder: 'tu@ejemplo.com', continueLabel: 'Continuar', loginEyebrow: 'TE DAMOS LA BIENVENIDA', loginTitle: 'Volvamos a la mesa.', loginSubtitle: 'Introduce tu correo para continuar con tu pasaporte guardado.', loginEmailPlaceholder: 'Tu correo electrónico', loginButton: 'Iniciar sesión', loginError: 'Ese correo no coincide con esta cuenta de demo.', registerNewUser: 'Registrar nuevo usuario', profileEyebrow: 'MI PERFIL', profileTitle: 'Haz que comer se sienta más tuyo.', basicInfo: 'Información básica', foodPassportTitle: 'Pasaporte de comida', foodPassportDesc: 'Alergias, reglas alimentarias y preferencias', otherSettings: 'Otros ajustes', languagePreference: 'Idioma', languagePreferenceDesc: 'Cambia el idioma de Bitewise', signOut: 'Cerrar sesión', signOutDesc: 'Volver a la pantalla de inicio de sesión', resetDemo: 'Restablecer demo', resetDemoDesc: 'Borrar la demo y empezar desde la bienvenida', passportSummary: 'Tus ajustes de seguridad alimentaria' },
  it: { registerEyebrow: 'CREA IL TUO PROFILO', registerTitle: 'Rendi il pasto più tuo.', registerSubtitle: 'Salva nome ed email per portare con te il passaporto alimentare.', usernameLabel: 'Nome utente', usernamePlaceholder: 'es. Alex Chen', emailLabel: 'Email', emailPlaceholder: 'tu@esempio.com', continueLabel: 'Continua', loginEyebrow: 'BENTORNATO', loginTitle: 'Torniamo al tuo tavolo.', loginSubtitle: 'Inserisci la tua email per usare il passaporto salvato.', loginEmailPlaceholder: 'La tua email', loginButton: 'Accedi', loginError: 'L’email non corrisponde a questo account demo.', registerNewUser: 'Registra un nuovo utente', profileEyebrow: 'IL MIO PROFILO', profileTitle: 'Rendi il pasto più personale.', basicInfo: 'Informazioni di base', foodPassportTitle: 'Passaporto alimentare', foodPassportDesc: 'Allergie, regole alimentari e preferenze', otherSettings: 'Altre impostazioni', languagePreference: 'Lingua', languagePreferenceDesc: 'Cambia la lingua di Bitewise', signOut: 'Esci', signOutDesc: 'Torna alla schermata di accesso', resetDemo: 'Reimposta demo', resetDemoDesc: 'Cancella la demo e ricomincia dal benvenuto', passportSummary: 'Le tue impostazioni di sicurezza alimentare' },
}

const subscriptionCopy: Record<Language, { entry: string; entryDesc: string; title: string; subtitle: string; free: string; freeDesc: string; features: string; bestValue: string; choose: string; close: string; selected: string }> = {
  en: { entry: 'Travel Pass', entryDesc: 'Unlock the full dining companion for your trip', title: 'Choose your Travel Pass', subtitle: 'Freemium for first steps, then a pass that matches your time in China.', free: 'Free', freeDesc: 'Limited scans, dish explanations and basic risk flags', features: 'Unlimited scans · AI dining assistant · Waiter Mode · Split Bill · personalized recommendations', bestValue: 'Core plan', choose: 'Choose', close: 'Close', selected: 'Selected for this demo' },
  ko: { entry: '트래블 패스', entryDesc: '여행 기간에 맞춰 전체 기능을 이용하세요', title: '트래블 패스를 선택하세요', subtitle: '기본 기능은 무료로 시작하고, 중국 체류 기간에 맞는 패스를 선택하세요.', free: '무료', freeDesc: '제한된 스캔, 메뉴 설명과 기본 위험 알림', features: '무제한 스캔 · AI 다이닝 어시스턴트 · 직원 소통 모드 · 더치페이 · 맞춤 추천', bestValue: '핵심 플랜', choose: '선택', close: '닫기', selected: '이 데모에서 선택됨' },
  ja: { entry: 'トラベルパス', entryDesc: '旅行中のダイニング機能をすべて使う', title: 'トラベルパスを選択', subtitle: '無料で始めて、中国での滞在期間に合うパスを選べます。', free: '無料', freeDesc: '回数限定のスキャン、料理説明、基本リスク表示', features: '無制限スキャン · AIアシスタント · スタッフとのコミュニケーション · 割り勘 · パーソナル推薦', bestValue: 'おすすめ', choose: '選択', close: '閉じる', selected: 'このデモで選択済み' },
  ru: { entry: 'Travel Pass', entryDesc: 'Все функции помощника на время поездки', title: 'Выберите Travel Pass', subtitle: 'Начните бесплатно, затем выберите срок, подходящий для поездки по Китаю.', free: 'Бесплатно', freeDesc: 'Ограниченные сканы, описания блюд и базовые предупреждения', features: 'Безлимитные сканы · AI-помощник · режим общения с персоналом · разделение счёта · персональные рекомендации', bestValue: 'Основной план', choose: 'Выбрать', close: 'Закрыть', selected: 'Выбрано в этом демо' },
  es: { entry: 'Travel Pass', entryDesc: 'Desbloquea el compañero completo durante tu viaje', title: 'Elige tu Travel Pass', subtitle: 'Empieza gratis y elige después el pase que encaje con tu estancia en China.', free: 'Gratis', freeDesc: 'Escaneos limitados, explicaciones y avisos básicos', features: 'Escaneos ilimitados · asistente IA · modo de comunicación con el personal · dividir cuenta · recomendaciones personalizadas', bestValue: 'Plan principal', choose: 'Elegir', close: 'Cerrar', selected: 'Seleccionado en esta demo' },
  it: { entry: 'Travel Pass', entryDesc: 'Sblocca il compagno completo per il tuo viaggio', title: 'Scegli il tuo Travel Pass', subtitle: 'Inizia gratis, poi scegli il pass adatto alla tua permanenza in Cina.', free: 'Gratis', freeDesc: 'Scansioni limitate, spiegazioni dei piatti e avvisi di base', features: 'Scansioni illimitate · assistente AI · modalità di comunicazione con il personale · conto diviso · suggerimenti personalizzati', bestValue: 'Piano principale', choose: 'Scegli', close: 'Chiudi', selected: 'Selezionato in questa demo' },
}

const subscriptionDisplayOverrides: Record<Language, { entry: string; entryDesc: string; title: string; subtitle: string; bestValue: string }> = {
  en: { entry: 'Subscription', entryDesc: 'Choose Free or Pro for your trip', title: 'Choose your subscription', subtitle: 'Start with Free or select a Pro duration for the full dining companion.', bestValue: 'Recommend' },
  ko: { entry: '구독', entryDesc: '여행에 맞는 Free 또는 Pro를 선택하세요', title: '구독을 선택하세요', subtitle: 'Free로 시작하거나 전체 다이닝 기능을 위한 Pro 기간을 선택하세요.', bestValue: '추천' },
  ja: { entry: 'サブスクリプション', entryDesc: '旅行に合うFreeまたはProを選択', title: 'サブスクリプションを選択', subtitle: 'Freeで始めるか、すべての機能を使えるPro期間を選べます。', bestValue: 'おすすめ' },
  ru: { entry: 'Подписка', entryDesc: 'Выберите Free или Pro для поездки', title: 'Выберите подписку', subtitle: 'Начните с Free или выберите срок Pro со всеми функциями помощника.', bestValue: 'Рекомендуем' },
  es: { entry: 'Suscripción', entryDesc: 'Elige Free o Pro para tu viaje', title: 'Elige tu suscripción', subtitle: 'Empieza con Free o elige una duración Pro con todas las funciones.', bestValue: 'Recomendado' },
  it: { entry: 'Abbonamento', entryDesc: 'Scegli Free o Pro per il tuo viaggio', title: 'Scegli il tuo abbonamento', subtitle: 'Inizia con Free oppure scegli una durata Pro con tutte le funzioni.', bestValue: 'Consigliato' },
}
const subscriptionTextFor = (language: Language) => ({ ...subscriptionCopy[language], ...subscriptionDisplayOverrides[language] })
const subscriptionTierCopy: Record<Language, { pro: string; proDesc: string; noExpiry: string; expires: string }> = {
  en: { pro: 'Pro', proDesc: 'Full dining companion for your selected duration', noExpiry: 'No expiry', expires: 'Expires' },
  ko: { pro: 'Pro', proDesc: '선택한 기간 동안 전체 다이닝 기능', noExpiry: '만료 없음', expires: '만료' },
  ja: { pro: 'Pro', proDesc: '選択した期間、すべてのダイニング機能', noExpiry: '期限なし', expires: '有効期限' },
  ru: { pro: 'Pro', proDesc: 'Все функции помощника на выбранный срок', noExpiry: 'Без срока', expires: 'Истекает' },
  es: { pro: 'Pro', proDesc: 'Todas las funciones durante el periodo elegido', noExpiry: 'Sin caducidad', expires: 'Caduca' },
  it: { pro: 'Pro', proDesc: 'Tutte le funzioni per la durata scelta', noExpiry: 'Senza scadenza', expires: 'Scade' },
}
const subscriptionExpiryLabel = (language: Language, expiresAt: number | null | undefined) => expiresAt
  ? `${subscriptionTierCopy[language].expires} ${new Intl.DateTimeFormat(language, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(expiresAt))}`
  : subscriptionTierCopy[language].noExpiry

const subscriptionPlans = [
  { days: 3, price: '¥12.9' },
  { days: 7, price: '¥19.9', featured: true },
  { days: 15, price: '¥29.9' },
  { days: 30, price: '¥39.9' },
]

type SubscriptionBenefit = { freeLabel: string; proLabel: string; free: boolean; pro: boolean }
const subscriptionBenefits: SubscriptionBenefit[] = [
  { freeLabel: 'Limited scans', proLabel: 'Unlimited scans', free: true, pro: true },
  { freeLabel: 'Dish explanations', proLabel: 'AI dining assistant', free: true, pro: true },
  { freeLabel: 'Basic risk flags', proLabel: 'Waiter Mode', free: true, pro: true },
  { freeLabel: '—', proLabel: 'Split Bill', free: false, pro: true },
  { freeLabel: '—', proLabel: 'Personalized recommendations', free: false, pro: true },
]

type OrderCopy = { nav: string; title: string; subtitle: string; current: string; past: string; inProgress: string; completed: string; openTable: string; items: string; total: string; splitBill: string; viewMenu: string; emptyCurrent: string; emptyPast: string }
const orderCopy: Record<Language, OrderCopy> = {
  en: { nav: 'Orders', title: 'Your orders', subtitle: 'Keep track of current and past restaurant orders.', current: 'Current order', past: 'Past orders', inProgress: 'In progress', completed: 'Completed', openTable: 'Table is open', items: 'items', total: 'Total', splitBill: 'Split the bill', viewMenu: 'View menu', emptyCurrent: 'No order yet. Scan the menu to start this dining session.', emptyPast: 'Past orders will appear here.' },
  ko: { nav: '주문', title: '주문 내역', subtitle: '현재 주문과 지난 식당 주문을 한곳에서 확인하세요.', current: '현재 주문', past: '지난 주문', inProgress: '진행 중', completed: '완료됨', openTable: '테이블이 열려 있어요', items: '개 메뉴', total: '합계', splitBill: '계산서 나누기', viewMenu: '메뉴 보기', emptyCurrent: '아직 주문이 없습니다. 메뉴를 스캔해 식사를 시작하세요.', emptyPast: '지난 주문이 여기에 표시됩니다.' },
  ja: { nav: '注文', title: '注文履歴', subtitle: '現在と過去のレストラン注文を確認できます。', current: '現在の注文', past: '過去の注文', inProgress: '進行中', completed: '完了', openTable: 'テーブルは開いています', items: '品', total: '合計', splitBill: '割り勘する', viewMenu: 'メニューを見る', emptyCurrent: 'まだ注文はありません。メニューをスキャンして食事を始めましょう。', emptyPast: '過去の注文はここに表示されます。' },
  ru: { nav: 'Заказы', title: 'Ваши заказы', subtitle: 'Следите за текущими и прошлыми заказами в ресторанах.', current: 'Текущий заказ', past: 'Прошлые заказы', inProgress: 'В процессе', completed: 'Завершён', openTable: 'Стол открыт', items: 'позиций', total: 'Итого', splitBill: 'Разделить счёт', viewMenu: 'Открыть меню', emptyCurrent: 'Заказов пока нет. Отсканируйте меню, чтобы начать.', emptyPast: 'Прошлые заказы появятся здесь.' },
  es: { nav: 'Pedidos', title: 'Tus pedidos', subtitle: 'Consulta tus pedidos actuales y anteriores.', current: 'Pedido actual', past: 'Pedidos anteriores', inProgress: 'En curso', completed: 'Completado', openTable: 'La mesa está abierta', items: 'platos', total: 'Total', splitBill: 'Dividir la cuenta', viewMenu: 'Ver menú', emptyCurrent: 'Aún no hay pedidos. Escanea el menú para empezar.', emptyPast: 'Tus pedidos anteriores aparecerán aquí.' },
  it: { nav: 'Ordini', title: 'I tuoi ordini', subtitle: 'Tieni sotto controllo gli ordini attuali e passati.', current: 'Ordine attuale', past: 'Ordini passati', inProgress: 'In corso', completed: 'Completato', openTable: 'Il tavolo è aperto', items: 'piatti', total: 'Totale', splitBill: 'Dividi il conto', viewMenu: 'Vedi menu', emptyCurrent: 'Non ci sono ancora ordini. Scansiona il menu per iniziare.', emptyPast: 'Gli ordini passati appariranno qui.' },
}

type PageCopy = Record<string, string>
const pageCopy: Record<Language, PageCopy> = {
  en: {
    step: 'Step',
    back: 'Back', homeEvidence: 'Evidence-aware dining in China', decisionFirst: 'Decision-first dining', scanConfidence: 'Scan, understand and choose with confidence.', evidenceAware: 'Evidence-aware', conflictFlagged: 'conflicts flagged', dishesReady: 'dishes ready', orderSaved: 'Order saved', tonight: 'Tonight · 7:42 PM', dishesOrdered: 'dishes ordered', menuDishes: 'menu dishes', vegetarian: 'Vegetarian', passportActive: 'Food Passport active', addMoreDishes: 'Add more dishes', viewOrder: 'View order', reviewFlags: 'Review flags', deleteSession: 'Delete session',
    whereEating: 'Where are you eating today?', restaurantPlaceholder: 'e.g. Chengdu Garden', restaurantHelper: "We'll use this name to record today's dining session.", uploadedPreview: 'Uploaded menu preview', chooseAnotherPhoto: 'Choose another photo', keepWholeMenu: 'Keep the whole menu in frame', ocrReady: 'OCR boundary detected · ready for the next page', moveCloser: 'Move closer until all four corners are visible', doneScanning: 'Done scanning', retake: 'Retake', usePhoto: 'Use photo', undo: 'Undo', capturePage: 'Capture menu page', showCapturedPages: 'Show captured pages', pages: 'Pages', capturedPages: 'Captured pages', keepScanning: 'keep scanning', addAnotherPage: 'Add another page',
    clearConflicts: 'Clear conflicts are excluded from the cart.', unknownVisible: 'Unknown information stays visible and uncertain.', chooseCompanions: 'Choose companions', matchTable: 'Match dishes for everyone at the table', manage: 'Manage', add: 'Add', matchingAgainst: 'Matching against your Food Passport and', menuCategories: 'Menu categories', browseSections: 'Browse menu sections', all: 'All', filterCategories: 'Filter menu categories', dish: 'dish', dishes: 'dishes', viewCart: 'View cart', cart: 'Cart', selected: 'selected', browseDishes: 'Choose dishes as you browse', excluded: 'Excluded', inCart: 'In cart', addToCart: 'Add to cart', mild: 'Mild', medium: 'Medium', spicy: 'Spicy', notSpicy: 'Not spicy', swipeExplore: 'Swipe to explore', helpfulContext: 'Helpful context', contextNote: 'This is a short cultural explanation to make the dish easier to decide on, not a promise that recipes are identical everywhere.',
    yourCart: 'Your cart', clear: 'Clear', cartEmpty: 'Your cart is empty', cartHint: 'Select dishes from your matched menu and they’ll appear here.', backToMenu: 'Back to menu', passportChecks: 'Passport checks stay visible', cartSafety: 'Only dishes without a clear conflict can be added. Warnings and unknowns stay attached to each dish.', removeDish: 'Remove dish', singleDish: 'Single dish', confirmSelections: 'Confirm selections', decrease: 'Decrease', increase: 'Increase',
    orderBrief: 'Order brief', orderStep: 'Step 04 · Order', bilingualOrder: 'Bilingual order page', showWaiter: 'Show this to your waiter.', orderDescription: 'Your selected dishes and Food Passport requirements are kept together in your language and Chinese.', forYou: 'For you', selectedDishes: 'Your selected dishes', dietaryNotes: 'Dietary notes', requirements: 'Your requirements', noRequirements: 'No additional dietary requirements.', forWaiter: 'For waiter', neededDishes: 'Dishes requested', waiterNotes: 'Dietary notes', noExtra: 'No extra dietary requirements. Please prepare according to the menu.', addMore: 'Add more dishes', splitBill: 'Split bill', backHome: 'Back to home', returnCart: 'Return to cart to edit', completeOrder: 'Complete order and return home', orderDisclaimer: 'This page translates your saved requirements for communication. The restaurant must still confirm ingredients and cross-contact.',
    askStep: 'Step 04 · Ask', chineseShowFirst: '中文 · Show first', askDisclaimer: 'If the restaurant cannot confirm, keep this dish excluded from recommendations. Menu evidence cannot determine kitchen cross-contact.',
    items: 'items', receiptUpdated: 'Receipt updated', fromOrder: 'From order', replaceReceipt: 'Replace receipt', uploadReceipt: 'Upload receipt to update', useOrderTotals: 'Use order totals', lineItemsUpdated: 'Line items and total updated from', uploadedReceipt: 'the uploaded receipt', usingOrderPrices: 'Using the prices captured when this order was placed. Upload a receipt if the final bill changed.', receiptTotal: 'Receipt total', orderTotal: 'Order total', namesEditable: 'Names are editable', tapAssign: 'Tap an item to assign', everyonePays: 'Everyone pays', exactCheck: 'Exact total check', shareReady: 'Share sheet ready', editParticipant: 'Edit participant', removeParticipant: 'Remove participant', everyone: 'Everyone', guest: 'Guest', you: 'You',
    exploreKicker: 'P1 · Explore', createFoodPost: 'Create a food post', findHeading: 'Find your next favorite bite.', findDescription: 'Real dish notes from people nearby. Save the restaurant when something makes you hungry.', foodCategories: 'Food categories', communityPicks: 'Community picks, passport-aware', communityHint: 'Save a place now and check the menu when you visit.', mustTry: 'MUST TRY', save: 'Save', saved: 'Saved', noNotes: 'No notes in this category yet.', keepExploring: 'Try another cuisine and keep exploring.', shareYourBite: 'Share your bite', createFoodNote: 'Create a food note', historyOnly: 'Only restaurants from your order history can be selected.', visitedRestaurant: 'Visited restaurant', pastVisit: 'Past visit', noHistory: 'No matching historical order found.', postTitle: 'Post title', titlePlaceholder: 'e.g. A quiet favorite near the metro', signatureDish: 'Signature dish', dishName: 'Dish name', dishDetails: 'Dish details', dishDetailsPlaceholder: 'Texture · flavor · ¥ price', cuisineCategory: 'Cuisine category', yourExperience: 'Your experience', experiencePlaceholder: 'What made this meal memorable?', cancel: 'Cancel', publishNote: 'Publish note', closeComposer: 'Close post composer', moreOptions: 'More options for', sharePost: 'Share',
    savedRestaurants: 'Saved restaurants', profileFindFood: 'Profile · Find food', openFindFood: 'Open Find food', findFood: 'Find food', placesWorthReturning: 'Places worth coming back to.', savedRestaurantsHint: 'Your saved restaurants stay here, ready for the next meal.', exploreFindFood: 'Explore Find food', saveFromFeed: 'Save a restaurant from the feed', noSavedRestaurants: 'No saved restaurants yet.', removeFromSaved: 'Remove from saved restaurants',
    companions: 'Companions', profileAtTable: 'Profile · At the table', atTheTable: 'At the table', makeMenuWork: 'Make the menu work for everyone.', connectPassport: 'Connect a friend’s Food Passport once, then use it whenever you share a table.', connected: 'connected', invitationsToReview: 'invitations to review', privateSettings: 'Private food settings stay with each person.', newInvitation: 'New invitation', wantsToDine: 'Someone wants to dine with you.', shareConnection: 'They want to share their Food Passport connection with you.', accept: 'Accept', decline: 'Decline', waitingForThem: 'Waiting for them', invitationsSent: 'Invitations you sent', pending: 'Pending', addCompanion: 'Add a companion', inviteRegistered: 'Invite someone who has registered with Bitewise', companionEmail: 'Companion email', invite: 'Invite', registeredOnly: 'Only registered accounts can receive an invitation. Their Food Passport stays private until they accept.', noCompanions: 'No companions yet.', buildTableProfile: 'Invite a registered user to build a shared table profile.', viewFoodPassport: 'View Food Passport', companionFlow: 'After scanning a menu, choose companions to filter dishes for the whole table.', companionReadOnly: 'Companion · Read only', sharedPassport: 'Shared Food Passport', tableProfile: 'table profile', useSettings: 'You can use these settings to filter a scanned menu, but only', canEdit: 'can edit them.', readOnly: 'Read only', allergens: 'Allergens', dietaryStyle: 'Dietary style', foodsToAvoid: 'Foods to avoid', everydayPreferences: 'Everyday preferences', spicePreference: 'Spicy', notSet: 'Not set', upToLevel: 'Up to level', kitchenSafety: 'Kitchen safety', noShared: 'None shared', noDietShared: 'No dietary style shared', noRulesShared: 'No food rules shared', noPreferencesShared: 'No everyday preferences shared', avoidCrossContact: 'Avoid cross-contact', notSpecified: 'Not specified', readonlyNote: 'This is a read-only view. The account owner remains in control of their Food Passport.', unlinkCompanion: 'Unlink companion',
    profileSubtitle: 'Keep your passport, saved places and table companions in one place.', yourFoodProfile: 'Your food profile', myCompanions: 'My companions', sharedPassports: 'Shared Food Passports for the table', new: 'new', tableToolkit: 'Your table toolkit', savedCountLabel: 'saved', placesTryNext: 'Places you want to try next', emailTaken: 'This email is already registered in this demo. Log in instead.',
    invalidEmail: 'Enter a valid email address.', loginBeforeInvite: 'Log in before inviting a companion.', cannotInviteSelf: 'You cannot invite yourself.', noRegisteredUser: 'No registered user uses this email yet.', alreadyConnected: 'This companion is already connected.', invitationWaiting: 'An invitation is already waiting for this user.', toastReceipt: 'Receipt values applied', toastRestaurantFirst: 'Enter the restaurant name before scanning', toastQuestionCopied: 'Question copied', toastConflict: 'This dish conflicts with your Food Passport', toastAdded: 'added to cart', toastDeleted: 'Dining session deleted', toastOrderSaved: 'Order saved to this dining session', toastUsingOrder: 'Using order totals again', toastCompanionConnected: 'Companion connected', toastInvitationDeclined: 'Invitation declined', toastCompanionUnlinked: 'Companion unlinked', toastInvitationSent: 'Invitation sent to', invitationAcceptHint: 'They can accept it from their Profile.',
  },
  ko: {
    step: '단계',
    back: '뒤로', homeEvidence: '중국에서 근거를 바탕으로 식사하기', decisionFirst: '결정부터 하는 식사', scanConfidence: '스캔하고, 이해하고, 자신 있게 선택하세요.', evidenceAware: '근거 기반', conflictFlagged: '개 충돌 표시', dishesReady: '가지 메뉴 준비됨', orderSaved: '주문 저장됨', tonight: '오늘 · 오후 7:42', dishesOrdered: '가지 주문', menuDishes: '가지 메뉴', vegetarian: '채식', passportActive: '푸드 패스포트 활성화', addMoreDishes: '메뉴 더 추가', viewOrder: '주문 보기', reviewFlags: '주의사항 확인', deleteSession: '세션 삭제',
    whereEating: '오늘 어디에서 식사하나요?', restaurantPlaceholder: '예: 청두 가든', restaurantHelper: '오늘의 식사 세션을 기록하는 데 사용합니다.', uploadedPreview: '업로드한 메뉴 미리보기', chooseAnotherPhoto: '다른 사진 선택', keepWholeMenu: '메뉴 전체를 화면 안에 담아 주세요', ocrReady: 'OCR 경계 인식됨 · 다음 페이지를 준비하세요', moveCloser: '네 모서리가 모두 보일 때까지 가까이 이동하세요', doneScanning: '스캔 완료', retake: '다시 촬영', usePhoto: '사진 사용', undo: '실행 취소', capturePage: '메뉴 페이지 촬영', showCapturedPages: '촬영한 페이지 보기', pages: '페이지', capturedPages: '촬영한 페이지', keepScanning: '계속 스캔', addAnotherPage: '다른 페이지 추가',
    clearConflicts: '충돌이 명확한 메뉴는 장바구니에서 제외됩니다.', unknownVisible: '정보가 부족한 메뉴는 불확실한 상태로 표시됩니다.', chooseCompanions: '동행자 선택', matchTable: '테이블의 모든 사람에게 맞는 메뉴 찾기', manage: '관리', add: '추가', matchingAgainst: '푸드 패스포트와', menuCategories: '메뉴 카테고리', browseSections: '메뉴 섹션 둘러보기', all: '전체', filterCategories: '메뉴 카테고리 필터', dish: '가지 메뉴', dishes: '가지 메뉴', viewCart: '장바구니 보기', cart: '장바구니', selected: '선택됨', browseDishes: '메뉴를 둘러보며 선택하세요', excluded: '제외됨', inCart: '담김', addToCart: '장바구니에 담기', mild: '순한맛', medium: '중간 매운맛', spicy: '매운맛', notSpicy: '맵지 않음', swipeExplore: '밀어서 살펴보기', helpfulContext: '참고 정보', contextNote: '요리를 이해하기 위한 짧은 문화 설명이며, 어디서나 조리법이 같다는 뜻은 아닙니다.',
    yourCart: '장바구니', clear: '비우기', cartEmpty: '장바구니가 비어 있어요', cartHint: '조건에 맞는 메뉴에서 음식을 선택하면 여기에 표시됩니다.', backToMenu: '메뉴로 돌아가기', passportChecks: '푸드 패스포트 확인 결과가 표시됩니다', cartSafety: '명확한 충돌이 없는 메뉴만 담을 수 있습니다. 주의와 불확실성은 각 메뉴에 계속 표시됩니다.', removeDish: '메뉴 삭제', singleDish: '단일 메뉴', confirmSelections: '선택 확인', decrease: '수량 줄이기', increase: '수량 늘리기',
    orderBrief: '주문 안내', orderStep: '4단계 · 주문', bilingualOrder: '이중 언어 주문 페이지', showWaiter: '직원에게 보여주세요.', orderDescription: '선택한 메뉴와 푸드 패스포트 요구사항을 내 언어와 중국어로 함께 정리했습니다.', forYou: '나를 위한 정보', selectedDishes: '선택한 메뉴', dietaryNotes: '식단 메모', requirements: '나의 요구사항', noRequirements: '추가 식단 요구사항이 없습니다.', forWaiter: '직원용', neededDishes: '주문할 메뉴', waiterNotes: '주의사항과 제외 음식', noExtra: '추가 요구사항이 없습니다. 메뉴에 따라 준비해 주세요.', addMore: '메뉴 더 추가', splitBill: '계산서 나누기', backHome: '홈으로', returnCart: '장바구니로 돌아가 수정', completeOrder: '주문 완료 후 홈으로', orderDisclaimer: '이 페이지는 저장된 요구사항을 전달하기 위한 번역을 제공합니다. 재료와 교차 접촉 여부는 식당에 다시 확인해야 합니다.',
    askStep: '4단계 · 문의', chineseShowFirst: '中文 · 먼저 보여주기', askDisclaimer: '식당에서 확인할 수 없다면 이 메뉴를 추천에서 제외하세요. 메뉴 정보만으로는 주방의 교차 접촉을 판단할 수 없습니다.',
    items: '개 항목', receiptUpdated: '영수증 반영됨', fromOrder: '주문 기준', replaceReceipt: '영수증 교체', uploadReceipt: '영수증을 업로드해 업데이트', useOrderTotals: '주문 합계 사용', lineItemsUpdated: '항목과 합계가 다음에서 업데이트됨:', uploadedReceipt: '업로드한 영수증', usingOrderPrices: '주문 시 저장된 가격을 사용 중입니다. 최종 금액이 다르면 영수증을 업로드하세요.', receiptTotal: '영수증 합계', orderTotal: '주문 합계', namesEditable: '이름을 수정할 수 있어요', tapAssign: '항목을 눌러 담당자를 지정하세요', everyonePays: '각자 결제 금액', exactCheck: '합계 확인', shareReady: '공유할 준비가 됐어요', editParticipant: '참여자 수정', removeParticipant: '참여자 삭제', everyone: '모두', guest: '손님', you: '나',
    exploreKicker: 'P1 · 둘러보기', createFoodPost: '음식 게시물 만들기', findHeading: '다음에 먹을 음식을 찾아보세요.', findDescription: '주변 사람들의 실제 메뉴 기록을 확인하고, 마음에 드는 식당을 저장하세요.', foodCategories: '음식 카테고리', communityPicks: '푸드 패스포트를 고려한 커뮤니티 추천', communityHint: '지금 장소를 저장하고 방문할 때 메뉴를 확인하세요.', mustTry: '추천 메뉴', save: '저장', saved: '저장됨', noNotes: '이 카테고리에는 아직 기록이 없어요.', keepExploring: '다른 요리를 선택해 계속 둘러보세요.', shareYourBite: '내 식사 공유', createFoodNote: '음식 기록 만들기', historyOnly: '주문 기록이 있는 식당만 선택할 수 있습니다.', visitedRestaurant: '방문한 식당', pastVisit: '지난 방문', noHistory: '일치하는 주문 기록이 없습니다.', postTitle: '게시물 제목', titlePlaceholder: '예: 지하철 근처의 조용한 단골집', signatureDish: '대표 메뉴', dishName: '메뉴 이름', dishDetails: '메뉴 정보', dishDetailsPlaceholder: '식감 · 맛 · ¥ 가격', cuisineCategory: '요리 카테고리', yourExperience: '나의 경험', experiencePlaceholder: '이 식사가 기억에 남은 이유는 무엇인가요?', cancel: '취소', publishNote: '기록 게시', closeComposer: '게시물 작성 닫기', moreOptions: '추가 옵션', sharePost: '공유',
    savedRestaurants: '저장한 식당', profileFindFood: '프로필 · 음식 찾기', openFindFood: '음식 찾기 열기', findFood: '음식 찾기', placesWorthReturning: '다시 가고 싶은 장소', savedRestaurantsHint: '저장한 식당을 여기에 모아 다음 식사를 준비하세요.', exploreFindFood: '음식 찾기 둘러보기', saveFromFeed: '피드에서 식당 저장', noSavedRestaurants: '저장한 식당이 아직 없습니다.', removeFromSaved: '저장한 식당에서 삭제',
    companions: '동행자', profileAtTable: '프로필 · 테이블', atTheTable: '테이블에서', makeMenuWork: '모두가 함께 먹을 수 있는 메뉴를 찾아보세요.', connectPassport: '친구의 푸드 패스포트를 한 번 연결하면 함께 식사할 때마다 사용할 수 있습니다.', connected: '명 연결됨', invitationsToReview: '개의 초대 확인 필요', privateSettings: '개인의 음식 설정은 각자의 계정에 보관됩니다.', newInvitation: '새 초대', wantsToDine: '함께 식사하자는 초대가 왔어요.', shareConnection: '상대방이 푸드 패스포트 연결을 공유하려고 합니다.', accept: '수락', decline: '거절', waitingForThem: '상대방의 응답 대기 중', invitationsSent: '보낸 초대', pending: '대기 중', addCompanion: '동행자 추가', inviteRegistered: 'Bitewise에 등록한 사람을 초대하세요', companionEmail: '동행자 이메일', invite: '초대', registeredOnly: '등록된 계정만 초대를 받을 수 있습니다. 수락하기 전까지 푸드 패스포트는 비공개로 유지됩니다.', noCompanions: '동행자가 아직 없습니다.', buildTableProfile: '등록된 사용자를 초대해 함께 사용할 테이블 프로필을 만들어 보세요.', viewFoodPassport: '푸드 패스포트 보기', companionFlow: '메뉴를 스캔한 뒤 동행자를 선택하면 테이블 전체에 맞게 메뉴를 필터링합니다.', companionReadOnly: '동행자 · 읽기 전용', sharedPassport: '공유된 푸드 패스포트', tableProfile: '테이블 프로필', useSettings: '이 설정으로 스캔한 메뉴를 필터링할 수 있지만, 수정할 수 있는 사람은', canEdit: '뿐입니다.', readOnly: '읽기 전용', allergens: '알레르기', dietaryStyle: '식단 유형', foodsToAvoid: '피하는 음식', everydayPreferences: '일상 선호', spicePreference: '매운맛 선호', notSet: '설정하지 않음', upToLevel: '최대', kitchenSafety: '주방 안전', noShared: '공유된 알레르기 없음', noDietShared: '공유된 식단 유형 없음', noRulesShared: '공유된 음식 규칙 없음', noPreferencesShared: '공유된 일상 선호 없음', avoidCrossContact: '교차 접촉 피하기', notSpecified: '지정되지 않음', readonlyNote: '읽기 전용 화면입니다. 푸드 패스포트의 소유자가 설정을 계속 관리합니다.', unlinkCompanion: '동행자 연결 해제',
    profileSubtitle: '패스포트, 저장한 장소와 테이블 동행자를 한곳에서 관리하세요.', yourFoodProfile: '나의 음식 프로필', myCompanions: '나의 동행자', sharedPassports: '테이블에서 공유하는 푸드 패스포트', new: '새 초대', tableToolkit: '테이블 도구', savedCountLabel: '저장됨', placesTryNext: '다음에 가고 싶은 장소', emailTaken: '이 데모에는 이미 등록된 이메일입니다. 대신 로그인해 주세요.',
    invalidEmail: '올바른 이메일 주소를 입력하세요.', loginBeforeInvite: '동행자를 초대하려면 먼저 로그인하세요.', cannotInviteSelf: '자기 자신을 초대할 수 없습니다.', noRegisteredUser: '이 이메일로 등록된 사용자가 없습니다.', alreadyConnected: '이미 연결된 동행자입니다.', invitationWaiting: '이 사용자에게 보낸 초대가 이미 대기 중입니다.', toastReceipt: '영수증 금액을 반영했습니다', toastRestaurantFirst: '스캔하기 전에 식당 이름을 입력하세요', toastQuestionCopied: '질문을 복사했습니다', toastConflict: '이 메뉴는 푸드 패스포트와 충돌합니다', toastAdded: '장바구니에 담았습니다', toastDeleted: '식사 세션을 삭제했습니다', toastOrderSaved: '이 식사 세션에 주문을 저장했습니다', toastUsingOrder: '주문 합계를 다시 사용합니다', toastCompanionConnected: '동행자를 연결했습니다', toastInvitationDeclined: '초대를 거절했습니다', toastCompanionUnlinked: '동행자 연결을 해제했습니다', toastInvitationSent: '초대를 보냈습니다:', invitationAcceptHint: '상대방은 프로필에서 수락할 수 있습니다.',
  },
  ja: {
    step: 'ステップ',
    back: '戻る', homeEvidence: '中国で根拠のある食事を', decisionFirst: '選ぶことから始める食事', scanConfidence: 'スキャンして理解し、自信を持って選びましょう。', evidenceAware: '根拠を確認', conflictFlagged: '件の衝突を確認', dishesReady: '品の料理を準備', orderSaved: '注文を保存しました', tonight: '今夜 · 19:42', dishesOrdered: '品を注文', menuDishes: '品のメニュー', vegetarian: 'ベジタリアン', passportActive: 'フードパスポート有効', addMoreDishes: '料理を追加', viewOrder: '注文を見る', reviewFlags: '注意点を確認', deleteSession: 'セッションを削除',
    whereEating: '今日はどこで食事しますか？', restaurantPlaceholder: '例：成都ガーデン', restaurantHelper: '今日の食事セッションの記録に使います。', uploadedPreview: 'アップロードしたメニューのプレビュー', chooseAnotherPhoto: '別の写真を選ぶ', keepWholeMenu: 'メニュー全体を画面に収めてください', ocrReady: 'OCRの境界を検出 · 次のページを撮影できます', moveCloser: '四隅がすべて見えるまで近づけてください', doneScanning: 'スキャン完了', retake: '撮り直す', usePhoto: '写真を使う', undo: '取り消す', capturePage: 'メニューページを撮影', showCapturedPages: '撮影したページを表示', pages: 'ページ', capturedPages: '撮影したページ', keepScanning: '続けてスキャン', addAnotherPage: '別のページを追加',
    clearConflicts: '明確な衝突がある料理はカートから除外されます。', unknownVisible: '情報が不足している料理は不確かなまま表示します。', chooseCompanions: '同席者を選ぶ', matchTable: 'テーブル全員に合う料理を探す', manage: '管理', add: '追加', matchingAgainst: 'あなたのフードパスポートと', menuCategories: 'メニューカテゴリー', browseSections: 'メニューのセクション', all: 'すべて', filterCategories: 'カテゴリーを絞り込む', dish: '品', dishes: '品', viewCart: 'カートを見る', cart: 'カート', selected: '選択中', browseDishes: 'メニューを見ながら選択', excluded: '除外', inCart: 'カート内', addToCart: 'カートに追加', mild: '控えめ', medium: '中辛', spicy: '辛い', notSpicy: '辛くない', swipeExplore: 'スワイプして見る', helpfulContext: '参考情報', contextNote: '料理を選びやすくするための短い文化的説明であり、どこでも同じレシピとは限りません。',
    yourCart: 'カート', clear: 'クリア', cartEmpty: 'カートは空です', cartHint: '条件に合うメニューから料理を選ぶと、ここに表示されます。', backToMenu: 'メニューに戻る', passportChecks: 'パスポートの確認結果を表示', cartSafety: '明確な衝突がない料理だけ追加できます。注意や不明点は料理ごとに表示されます。', removeDish: '料理を削除', singleDish: '1品', confirmSelections: '選択を確認', decrease: '数量を減らす', increase: '数量を増やす',
    orderBrief: '注文案内', orderStep: 'ステップ04 · 注文', bilingualOrder: '二言語の注文ページ', showWaiter: 'スタッフに見せてください。', orderDescription: '選択した料理とフードパスポートの条件を、あなたの言語と中国語でまとめています。', forYou: 'あなた向け', selectedDishes: '選択した料理', dietaryNotes: '食事メモ', requirements: 'あなたの条件', noRequirements: '追加の食事条件はありません。', forWaiter: 'スタッフ向け', neededDishes: '注文する料理', waiterNotes: '避けたいもの・注意点', noExtra: '追加の条件はありません。メニューどおりに調理してください。', addMore: '料理を追加', splitBill: '割り勘する', backHome: 'ホームに戻る', returnCart: 'カートに戻って編集', completeOrder: '注文を完了してホームへ', orderDisclaimer: 'このページは保存した条件を伝えるための翻訳です。食材と交差接触については、必ずお店に確認してください。',
    askStep: 'ステップ04 · 確認', chineseShowFirst: '中文 · 先に表示', askDisclaimer: 'お店で確認できない場合は、この料理をおすすめから除外してください。メニュー情報だけでは厨房での交差接触は判断できません。',
    items: '品', receiptUpdated: 'レシート反映済み', fromOrder: '注文から', replaceReceipt: 'レシートを差し替え', uploadReceipt: 'レシートをアップロードして更新', useOrderTotals: '注文の合計を使う', lineItemsUpdated: '明細と合計を更新：', uploadedReceipt: 'アップロードしたレシート', usingOrderPrices: '注文時に保存した価格を使用しています。最終金額が違う場合はレシートをアップロードしてください。', receiptTotal: 'レシート合計', orderTotal: '注文合計', namesEditable: '名前は編集できます', tapAssign: '料理をタップして担当者を選択', everyonePays: '支払額', exactCheck: '合計を確認', shareReady: '共有の準備ができました', editParticipant: '参加者を編集', removeParticipant: '参加者を削除', everyone: '全員', guest: 'ゲスト', you: '自分',
    exploreKicker: 'P1 · 探す', createFoodPost: '食の投稿を作成', findHeading: '次のお気に入りを見つけましょう。', findDescription: '近くの人の料理メモを見て、気になるお店を保存できます。', foodCategories: '料理カテゴリー', communityPicks: 'パスポートを考慮したコミュニティのおすすめ', communityHint: '場所を保存して、訪問時にメニューを確認しましょう。', mustTry: 'おすすめ', save: '保存', saved: '保存済み', noNotes: 'このカテゴリーにはまだメモがありません。', keepExploring: '別の料理を選んで探し続けましょう。', shareYourBite: '食事を共有', createFoodNote: '料理メモを作成', historyOnly: '注文履歴のあるお店だけ選択できます。', visitedRestaurant: '訪れたお店', pastVisit: '過去の訪問', noHistory: '一致する注文履歴がありません。', postTitle: '投稿タイトル', titlePlaceholder: '例：駅の近くの静かなお気に入り', signatureDish: 'おすすめ料理', dishName: '料理名', dishDetails: '料理の詳細', dishDetailsPlaceholder: '食感 · 味 · ¥価格', cuisineCategory: '料理カテゴリー', yourExperience: 'あなたの体験', experiencePlaceholder: 'この食事が印象に残った理由は？', cancel: 'キャンセル', publishNote: 'メモを投稿', closeComposer: '投稿画面を閉じる', moreOptions: 'その他の操作', sharePost: '共有',
    savedRestaurants: '保存したお店', profileFindFood: 'プロフィール · 料理を探す', openFindFood: '料理を探す', findFood: '料理を探す', placesWorthReturning: 'また訪れたい場所', savedRestaurantsHint: '保存したお店をここで確認して、次の食事に備えましょう。', exploreFindFood: '料理を探す', saveFromFeed: 'フィードからお店を保存', noSavedRestaurants: '保存したお店はまだありません。', removeFromSaved: '保存から削除',
    companions: '同席者', profileAtTable: 'プロフィール · テーブル', atTheTable: 'テーブルで', makeMenuWork: 'みんなで楽しめるメニューを選びましょう。', connectPassport: '友だちのフードパスポートを一度つなぐと、一緒に食事するときに使えます。', connected: '人が接続済み', invitationsToReview: '件の招待を確認', privateSettings: '食に関する設定はそれぞれのアカウントで管理します。', newInvitation: '新しい招待', wantsToDine: '一緒に食事をしたい人がいます。', shareConnection: '相手がフードパスポートの接続を共有しようとしています。', accept: '承認', decline: '辞退', waitingForThem: '相手の承認待ち', invitationsSent: '送信した招待', pending: '保留中', addCompanion: '同席者を追加', inviteRegistered: 'Bitewiseに登録している人を招待', companionEmail: '同席者のメール', invite: '招待', registeredOnly: '登録済みアカウントだけ招待できます。承認されるまでフードパスポートは非公開です。', noCompanions: '同席者はまだいません。', buildTableProfile: '登録ユーザーを招待して、共有テーブルプロフィールを作りましょう。', viewFoodPassport: 'フードパスポートを見る', companionFlow: 'メニューをスキャンした後に同席者を選ぶと、テーブル全体に合う料理に絞り込めます。', companionReadOnly: '同席者 · 閲覧のみ', sharedPassport: '共有フードパスポート', tableProfile: 'テーブルプロフィール', useSettings: 'この設定でスキャンしたメニューを絞り込めますが、編集できるのは', canEdit: 'だけです。', readOnly: '閲覧のみ', allergens: 'アレルゲン', dietaryStyle: '食事スタイル', foodsToAvoid: '避ける食品', everydayPreferences: '日常の好み', spicePreference: '辛さの好み', notSet: '未設定', upToLevel: 'レベルまで', kitchenSafety: '厨房の安全', noShared: '共有されたアレルゲンなし', noDietShared: '共有された食事スタイルなし', noRulesShared: '共有された食品ルールなし', noPreferencesShared: '共有された日常の好みなし', avoidCrossContact: '交差接触を避ける', notSpecified: '未指定', readonlyNote: '閲覧専用の画面です。フードパスポートの所有者が設定を管理します。', unlinkCompanion: '同席者の接続を解除',
    profileSubtitle: 'パスポート、保存した場所、テーブルの同席者を一か所で管理できます。', yourFoodProfile: '食事プロフィール', myCompanions: '同席者', sharedPassports: 'テーブルで共有するフードパスポート', new: '新着', tableToolkit: 'テーブルツール', savedCountLabel: '保存済み', placesTryNext: '次に行きたい場所', emailTaken: 'このデモにはすでに登録されたメールです。ログインしてください。',
    invalidEmail: '有効なメールアドレスを入力してください。', loginBeforeInvite: '同席者を招待するにはログインしてください。', cannotInviteSelf: '自分自身は招待できません。', noRegisteredUser: 'このメールアドレスの登録ユーザーが見つかりません。', alreadyConnected: 'この同席者はすでに接続されています。', invitationWaiting: 'このユーザーへの招待はすでに保留中です。', toastReceipt: 'レシートの金額を反映しました', toastRestaurantFirst: 'スキャンする前にお店の名前を入力してください', toastQuestionCopied: '質問をコピーしました', toastConflict: 'この料理はフードパスポートと衝突します', toastAdded: 'をカートに追加しました', toastDeleted: '食事セッションを削除しました', toastOrderSaved: 'この食事セッションに注文を保存しました', toastUsingOrder: '注文の合計を再び使用します', toastCompanionConnected: '同席者を接続しました', toastInvitationDeclined: '招待を辞退しました', toastCompanionUnlinked: '同席者の接続を解除しました', toastInvitationSent: '招待を送信しました：', invitationAcceptHint: '相手はプロフィールから承認できます。',
  },
  ru: {
    step: 'Шаг',
    back: 'Назад', homeEvidence: 'Осознанный ужин в Китае', decisionFirst: 'Сначала решение, потом заказ', scanConfidence: 'Сканируйте, разбирайтесь и выбирайте уверенно.', evidenceAware: 'На основе данных', conflictFlagged: 'конфликтов отмечено', dishesReady: 'блюд готово', orderSaved: 'Заказ сохранён', tonight: 'Сегодня · 19:42', dishesOrdered: 'заказанных блюд', menuDishes: 'блюд в меню', vegetarian: 'Вегетарианское', passportActive: 'Пищевой паспорт активен', addMoreDishes: 'Добавить блюда', viewOrder: 'Открыть заказ', reviewFlags: 'Проверить предупреждения', deleteSession: 'Удалить сессию',
    whereEating: 'Где вы сегодня едите?', restaurantPlaceholder: 'например, Chengdu Garden', restaurantHelper: 'Это имя будет использоваться для записи сегодняшней сессии.', uploadedPreview: 'Предпросмотр загруженного меню', chooseAnotherPhoto: 'Выбрать другое фото', keepWholeMenu: 'Поместите всё меню в кадр', ocrReady: 'Границы OCR найдены · готово к следующей странице', moveCloser: 'Приблизьте телефон, чтобы были видны все четыре угла', doneScanning: 'Завершить сканирование', retake: 'Переснять', usePhoto: 'Использовать фото', undo: 'Отменить', capturePage: 'Снять страницу меню', showCapturedPages: 'Показать снятые страницы', pages: 'Страницы', capturedPages: 'Снятые страницы', keepScanning: 'продолжайте сканирование', addAnotherPage: 'Добавить страницу',
    clearConflicts: 'Блюда с явным конфликтом исключаются из заказа.', unknownVisible: 'Недостаточно подтверждённые данные остаются помеченными как неизвестные.', chooseCompanions: 'Выбрать спутников', matchTable: 'Подобрать блюда для всех за столом', manage: 'Управлять', add: 'Добавить', matchingAgainst: 'Сверяем с вашим пищевым паспортом и', menuCategories: 'Категории меню', browseSections: 'Разделы меню', all: 'Все', filterCategories: 'Фильтр категорий меню', dish: 'блюдо', dishes: 'блюд', viewCart: 'Открыть корзину', cart: 'Корзина', selected: 'выбрано', browseDishes: 'Выбирайте блюда по мере просмотра', excluded: 'Исключено', inCart: 'В корзине', addToCart: 'Добавить в корзину', mild: 'Слабо острое', medium: 'Средняя острота', spicy: 'Острое', notSpicy: 'Не острое', swipeExplore: 'Листайте, чтобы изучить', helpfulContext: 'Полезный контекст', contextNote: 'Краткое культурное пояснение помогает выбрать блюдо, но не обещает одинаковый рецепт везде.',
    yourCart: 'Корзина', clear: 'Очистить', cartEmpty: 'Корзина пуста', cartHint: 'Выберите блюда из подходящего меню — они появятся здесь.', backToMenu: 'Вернуться к меню', passportChecks: 'Проверка паспорта остаётся видимой', cartSafety: 'Добавлять можно только блюда без явного конфликта. Предупреждения и неизвестные данные остаются у каждого блюда.', removeDish: 'Удалить блюдо', singleDish: 'Одно блюдо', confirmSelections: 'Подтвердить выбор', decrease: 'Уменьшить количество', increase: 'Увеличить количество',
    orderBrief: 'Информация для заказа', orderStep: 'Шаг 04 · Заказ', bilingualOrder: 'Двуязычная страница заказа', showWaiter: 'Покажите это официанту.', orderDescription: 'Выбранные блюда и требования пищевого паспорта собраны на вашем языке и на китайском.', forYou: 'Для вас', selectedDishes: 'Выбранные блюда', dietaryNotes: 'Пищевые заметки', requirements: 'Ваши требования', noRequirements: 'Дополнительных требований нет.', forWaiter: 'Для официанта', neededDishes: 'Нужные блюда', waiterNotes: 'Ограничения и предупреждения', noExtra: 'Дополнительных ограничений нет. Приготовьте по меню.', addMore: 'Добавить блюда', splitBill: 'Разделить счёт', backHome: 'На главную', returnCart: 'Вернуться в корзину и изменить', completeOrder: 'Завершить заказ и вернуться', orderDisclaimer: 'Эта страница переводит сохранённые требования для общения. Ингредиенты и перекрёстный контакт всё равно должен подтвердить ресторан.',
    askStep: 'Шаг 04 · Уточнить', chineseShowFirst: '中文 · Сначала показать', askDisclaimer: 'Если ресторан не может подтвердить состав, оставьте блюдо исключённым. Одно меню не позволяет определить перекрёстный контакт на кухне.',
    items: 'позиций', receiptUpdated: 'Чек обновлён', fromOrder: 'Из заказа', replaceReceipt: 'Заменить чек', uploadReceipt: 'Загрузить чек для обновления', useOrderTotals: 'Использовать сумму заказа', lineItemsUpdated: 'Позиции и сумма обновлены по данным', uploadedReceipt: 'загруженного чека', usingOrderPrices: 'Используются цены, сохранённые при заказе. Если итог изменился, загрузите чек.', receiptTotal: 'Итого по чеку', orderTotal: 'Итого по заказу', namesEditable: 'Имена можно менять', tapAssign: 'Нажмите на позицию, чтобы назначить её', everyonePays: 'Каждый платит', exactCheck: 'Проверка точной суммы', shareReady: 'Готово к отправке', editParticipant: 'Изменить участника', removeParticipant: 'Удалить участника', everyone: 'Все', guest: 'Гость', you: 'Вы',
    exploreKicker: 'P1 · Поиск', createFoodPost: 'Создать публикацию о еде', findHeading: 'Найдите следующий любимый вкус.', findDescription: 'Заметки о блюдах от людей рядом. Сохраняйте рестораны, которые хочется попробовать.', foodCategories: 'Категории еды', communityPicks: 'Выбор сообщества с учётом паспорта', communityHint: 'Сохраните место сейчас и проверьте меню при визите.', mustTry: 'СТОИТ ПОПРОБОВАТЬ', save: 'Сохранить', saved: 'Сохранено', noNotes: 'В этой категории пока нет заметок.', keepExploring: 'Выберите другую кухню и продолжайте поиск.', shareYourBite: 'Поделитесь впечатлением', createFoodNote: 'Создать заметку о блюде', historyOnly: 'Можно выбрать только ресторан из истории заказов.', visitedRestaurant: 'Посещённый ресторан', pastVisit: 'Прошлый визит', noHistory: 'Подходящая история заказов не найдена.', postTitle: 'Заголовок публикации', titlePlaceholder: 'например, тихое любимое место у метро', signatureDish: 'Главное блюдо', dishName: 'Название блюда', dishDetails: 'О блюде', dishDetailsPlaceholder: 'Текстура · вкус · цена ¥', cuisineCategory: 'Категория кухни', yourExperience: 'Ваше впечатление', experiencePlaceholder: 'Что запомнилось в этом блюде?', cancel: 'Отмена', publishNote: 'Опубликовать заметку', closeComposer: 'Закрыть редактор', moreOptions: 'Другие действия', sharePost: 'Поделиться',
    savedRestaurants: 'Сохранённые рестораны', profileFindFood: 'Профиль · Поиск еды', openFindFood: 'Открыть поиск еды', findFood: 'Поиск еды', placesWorthReturning: 'Места, куда хочется вернуться', savedRestaurantsHint: 'Здесь хранятся сохранённые рестораны для следующего ужина.', exploreFindFood: 'Открыть поиск еды', saveFromFeed: 'Сохранить ресторан из ленты', noSavedRestaurants: 'Сохранённых ресторанов пока нет.', removeFromSaved: 'Удалить из сохранённых',
    companions: 'Спутники', profileAtTable: 'Профиль · За столом', atTheTable: 'За столом', makeMenuWork: 'Подберите меню для всех.', connectPassport: 'Один раз подключите пищевой паспорт друга и используйте его за общим столом.', connected: 'подключено', invitationsToReview: 'приглашений на проверку', privateSettings: 'Личные пищевые настройки остаются у каждого человека.', newInvitation: 'Новое приглашение', wantsToDine: 'Кто-то хочет пообедать вместе с вами.', shareConnection: 'Пользователь хочет поделиться подключением пищевого паспорта.', accept: 'Принять', decline: 'Отклонить', waitingForThem: 'Ждём ответа', invitationsSent: 'Отправленные приглашения', pending: 'Ожидает ответа', addCompanion: 'Добавить спутника', inviteRegistered: 'Пригласите пользователя, зарегистрированного в Bitewise', companionEmail: 'Электронная почта спутника', invite: 'Пригласить', registeredOnly: 'Пригласить можно только зарегистрированные аккаунты. До принятия приглашения их паспорт остаётся закрытым.', noCompanions: 'Спутников пока нет.', buildTableProfile: 'Пригласите зарегистрированного пользователя, чтобы создать общий профиль стола.', viewFoodPassport: 'Открыть пищевой паспорт', companionFlow: 'После сканирования меню выберите спутников, чтобы отфильтровать блюда для всего стола.', companionReadOnly: 'Спутник · Только просмотр', sharedPassport: 'Общий пищевой паспорт', tableProfile: 'профиль стола', useSettings: 'Эти настройки можно использовать для фильтрации меню, но изменять их может только', canEdit: '.', readOnly: 'Только просмотр', allergens: 'Аллергены', dietaryStyle: 'Тип питания', foodsToAvoid: 'Исключаемые продукты', everydayPreferences: 'Повседневные предпочтения', spicePreference: 'Острота', notSet: 'Не задано', upToLevel: 'До уровня', kitchenSafety: 'Безопасность кухни', noShared: 'Аллергены не указаны', noDietShared: 'Тип питания не указан', noRulesShared: 'Правила питания не указаны', noPreferencesShared: 'Повседневные предпочтения не указаны', avoidCrossContact: 'Избегать перекрёстного контакта', notSpecified: 'Не указано', readonlyNote: 'Это режим только для просмотра. Владелец аккаунта управляет своим пищевым паспортом.', unlinkCompanion: 'Отключить спутника',
    profileSubtitle: 'Храните паспорт, сохранённые места и спутников за столом в одном месте.', yourFoodProfile: 'Ваш пищевой профиль', myCompanions: 'Мои спутники', sharedPassports: 'Общие пищевые паспорта для стола', new: 'новых', tableToolkit: 'Инструменты стола', savedCountLabel: 'сохранено', placesTryNext: 'Места для следующего визита', emailTaken: 'Этот адрес уже зарегистрирован в демо. Войдите вместо этого.',
    invalidEmail: 'Введите корректный адрес электронной почты.', loginBeforeInvite: 'Войдите, чтобы пригласить спутника.', cannotInviteSelf: 'Нельзя пригласить самого себя.', noRegisteredUser: 'Пользователь с таким адресом не зарегистрирован.', alreadyConnected: 'Этот спутник уже подключён.', invitationWaiting: 'Приглашение этому пользователю уже ожидает ответа.', toastReceipt: 'Данные чека применены', toastRestaurantFirst: 'Введите название ресторана перед сканированием', toastQuestionCopied: 'Вопрос скопирован', toastConflict: 'Блюдо конфликтует с вашим пищевым паспортом', toastAdded: 'добавлено в корзину', toastDeleted: 'Сессия удалена', toastOrderSaved: 'Заказ сохранён в этой сессии', toastUsingOrder: 'Снова используем сумму заказа', toastCompanionConnected: 'Спутник подключён', toastInvitationDeclined: 'Приглашение отклонено', toastCompanionUnlinked: 'Спутник отключён', toastInvitationSent: 'Приглашение отправлено:', invitationAcceptHint: 'Пользователь может принять его в профиле.',
  },
  es: {
    step: 'Paso',
    back: 'Atrás', homeEvidence: 'Comer en China con información clara', decisionFirst: 'Primero decide, luego pide', scanConfidence: 'Escanea, entiende y elige con confianza.', evidenceAware: 'Con información', conflictFlagged: 'conflictos marcados', dishesReady: 'platos listos', orderSaved: 'Pedido guardado', tonight: 'Esta noche · 19:42', dishesOrdered: 'platos pedidos', menuDishes: 'platos del menú', vegetarian: 'Vegetariano', passportActive: 'Pasaporte de comida activo', addMoreDishes: 'Añadir más platos', viewOrder: 'Ver pedido', reviewFlags: 'Revisar avisos', deleteSession: 'Eliminar sesión',
    whereEating: '¿Dónde vas a comer hoy?', restaurantPlaceholder: 'p. ej., Chengdu Garden', restaurantHelper: 'Usaremos este nombre para registrar la sesión de hoy.', uploadedPreview: 'Vista previa del menú subido', chooseAnotherPhoto: 'Elegir otra foto', keepWholeMenu: 'Mantén todo el menú dentro del encuadre', ocrReady: 'Límites OCR detectados · listo para la siguiente página', moveCloser: 'Acércate hasta que se vean las cuatro esquinas', doneScanning: 'Terminar escaneo', retake: 'Repetir foto', usePhoto: 'Usar foto', undo: 'Deshacer', capturePage: 'Fotografiar página del menú', showCapturedPages: 'Mostrar páginas capturadas', pages: 'Páginas', capturedPages: 'Páginas capturadas', keepScanning: 'sigue escaneando', addAnotherPage: 'Añadir otra página',
    clearConflicts: 'Los platos con conflictos claros se excluyen de la cesta.', unknownVisible: 'La información insuficiente se mantiene visible como incierta.', chooseCompanions: 'Elegir acompañantes', matchTable: 'Buscar platos adecuados para toda la mesa', manage: 'Gestionar', add: 'Añadir', matchingAgainst: 'Comparando con tu Pasaporte de comida y', menuCategories: 'Categorías del menú', browseSections: 'Explorar secciones del menú', all: 'Todo', filterCategories: 'Filtrar categorías del menú', dish: 'plato', dishes: 'platos', viewCart: 'Ver cesta', cart: 'Cesta', selected: 'seleccionados', browseDishes: 'Elige platos mientras exploras', excluded: 'Excluido', inCart: 'En la cesta', addToCart: 'Añadir a la cesta', mild: 'Suave', medium: 'Medio', spicy: 'Picante', notSpicy: 'Sin picante', swipeExplore: 'Desliza para explorar', helpfulContext: 'Contexto útil', contextNote: 'Es una breve explicación cultural para ayudarte a decidir, no una promesa de que todas las recetas sean iguales.',
    yourCart: 'Tu cesta', clear: 'Vaciar', cartEmpty: 'Tu cesta está vacía', cartHint: 'Elige platos del menú que encajan contigo y aparecerán aquí.', backToMenu: 'Volver al menú', passportChecks: 'Las comprobaciones del pasaporte siguen visibles', cartSafety: 'Solo se pueden añadir platos sin un conflicto claro. Los avisos y las dudas permanecen junto a cada plato.', removeDish: 'Quitar plato', singleDish: 'Un plato', confirmSelections: 'Confirmar selección', decrease: 'Reducir cantidad', increase: 'Aumentar cantidad',
    orderBrief: 'Resumen del pedido', orderStep: 'Paso 04 · Pedido', bilingualOrder: 'Página de pedido bilingüe', showWaiter: 'Enséñaselo al personal.', orderDescription: 'Tus platos y requisitos del Pasaporte de comida aparecen juntos en tu idioma y en chino.', forYou: 'Para ti', selectedDishes: 'Tus platos seleccionados', dietaryNotes: 'Notas alimentarias', requirements: 'Tus requisitos', noRequirements: 'No hay requisitos alimentarios adicionales.', forWaiter: 'Para el personal', neededDishes: 'Platos solicitados', waiterNotes: 'Alimentos que evitar y avisos', noExtra: 'No hay requisitos adicionales. Preparar según el menú.', addMore: 'Añadir más platos', splitBill: 'Dividir la cuenta', backHome: 'Volver al inicio', returnCart: 'Volver a la cesta para editar', completeOrder: 'Completar pedido y volver al inicio', orderDisclaimer: 'Esta página traduce tus requisitos guardados para comunicarlos. El restaurante debe confirmar los ingredientes y el contacto cruzado.',
    askStep: 'Paso 04 · Preguntar', chineseShowFirst: '中文 · Mostrar primero', askDisclaimer: 'Si el restaurante no puede confirmarlo, mantén este plato excluido de las recomendaciones. El menú no puede determinar el contacto cruzado en la cocina.',
    items: 'artículos', receiptUpdated: 'Recibo actualizado', fromOrder: 'Del pedido', replaceReceipt: 'Sustituir recibo', uploadReceipt: 'Subir recibo para actualizar', useOrderTotals: 'Usar total del pedido', lineItemsUpdated: 'Partidas y total actualizados desde', uploadedReceipt: 'el recibo subido', usingOrderPrices: 'Usamos los precios guardados al hacer el pedido. Sube el recibo si cambió el total final.', receiptTotal: 'Total del recibo', orderTotal: 'Total del pedido', namesEditable: 'Los nombres se pueden editar', tapAssign: 'Toca un artículo para asignarlo', everyonePays: 'Cada persona paga', exactCheck: 'Comprobación del total exacto', shareReady: 'Listo para compartir', editParticipant: 'Editar participante', removeParticipant: 'Quitar participante', everyone: 'Todos', guest: 'Invitado', you: 'Tú',
    exploreKicker: 'P1 · Explorar', createFoodPost: 'Crear publicación gastronómica', findHeading: 'Encuentra tu próximo bocado favorito.', findDescription: 'Notas reales de platos de gente cercana. Guarda el restaurante cuando te apetezca probarlo.', foodCategories: 'Categorías gastronómicas', communityPicks: 'Recomendaciones de la comunidad, adaptadas a tu pasaporte', communityHint: 'Guarda un lugar y consulta el menú cuando lo visites.', mustTry: 'NO TE LO PIERDAS', save: 'Guardar', saved: 'Guardado', noNotes: 'Todavía no hay notas en esta categoría.', keepExploring: 'Prueba otra cocina y sigue explorando.', shareYourBite: 'Comparte tu bocado', createFoodNote: 'Crear una nota gastronómica', historyOnly: 'Solo puedes elegir restaurantes de tu historial de pedidos.', visitedRestaurant: 'Restaurante visitado', pastVisit: 'Visita anterior', noHistory: 'No se encontró ningún pedido coincidente.', postTitle: 'Título de la publicación', titlePlaceholder: 'p. ej., un sitio tranquilo cerca del metro', signatureDish: 'Plato estrella', dishName: 'Nombre del plato', dishDetails: 'Detalles del plato', dishDetailsPlaceholder: 'Textura · sabor · precio ¥', cuisineCategory: 'Categoría de cocina', yourExperience: 'Tu experiencia', experiencePlaceholder: '¿Qué hizo memorable esta comida?', cancel: 'Cancelar', publishNote: 'Publicar nota', closeComposer: 'Cerrar editor', moreOptions: 'Más opciones', sharePost: 'Compartir',
    savedRestaurants: 'Restaurantes guardados', profileFindFood: 'Perfil · Buscar comida', openFindFood: 'Abrir Buscar comida', findFood: 'Buscar comida', placesWorthReturning: 'Lugares a los que quieres volver', savedRestaurantsHint: 'Tus restaurantes guardados estarán aquí para tu próxima comida.', exploreFindFood: 'Explorar Buscar comida', saveFromFeed: 'Guardar un restaurante desde el feed', noSavedRestaurants: 'Aún no hay restaurantes guardados.', removeFromSaved: 'Quitar de guardados',
    companions: 'Acompañantes', profileAtTable: 'Perfil · En la mesa', atTheTable: 'En la mesa', makeMenuWork: 'Haz que el menú funcione para todos.', connectPassport: 'Conecta una vez el Pasaporte de comida de un amigo y úsalo cada vez que compartáis mesa.', connected: 'conectados', invitationsToReview: 'invitaciones por revisar', privateSettings: 'La configuración alimentaria privada permanece con cada persona.', newInvitation: 'Nueva invitación', wantsToDine: 'Alguien quiere comer contigo.', shareConnection: 'Quiere compartir contigo la conexión de su Pasaporte de comida.', accept: 'Aceptar', decline: 'Rechazar', waitingForThem: 'Esperando su respuesta', invitationsSent: 'Invitaciones enviadas', pending: 'Pendiente', addCompanion: 'Añadir acompañante', inviteRegistered: 'Invita a alguien registrado en Bitewise', companionEmail: 'Correo del acompañante', invite: 'Invitar', registeredOnly: 'Solo las cuentas registradas pueden recibir invitaciones. Su Pasaporte de comida será privado hasta que acepten.', noCompanions: 'Aún no hay acompañantes.', buildTableProfile: 'Invita a un usuario registrado para crear un perfil compartido de mesa.', viewFoodPassport: 'Ver Pasaporte de comida', companionFlow: 'Después de escanear un menú, elige acompañantes para filtrar platos para toda la mesa.', companionReadOnly: 'Acompañante · Solo lectura', sharedPassport: 'Pasaporte de comida compartido', tableProfile: 'perfil de mesa', useSettings: 'Puedes usar estos ajustes para filtrar un menú escaneado, pero solo', canEdit: 'puede editarlos.', readOnly: 'Solo lectura', allergens: 'Alérgenos', dietaryStyle: 'Tipo de dieta', foodsToAvoid: 'Alimentos que evitar', everydayPreferences: 'Preferencias diarias', spicePreference: 'Preferencia de picante', notSet: 'Sin configurar', upToLevel: 'Hasta el nivel', kitchenSafety: 'Seguridad en cocina', noShared: 'No se han compartido alérgenos', noDietShared: 'No se ha compartido el tipo de dieta', noRulesShared: 'No se han compartido reglas alimentarias', noPreferencesShared: 'No se han compartido preferencias', avoidCrossContact: 'Evitar el contacto cruzado', notSpecified: 'No especificado', readonlyNote: 'Esta vista es de solo lectura. La persona propietaria controla su Pasaporte de comida.', unlinkCompanion: 'Desconectar acompañante',
    profileSubtitle: 'Guarda tu pasaporte, tus lugares y tus acompañantes de mesa en un solo sitio.', yourFoodProfile: 'Tu perfil alimentario', myCompanions: 'Mis acompañantes', sharedPassports: 'Pasaportes compartidos para la mesa', new: 'nuevas', tableToolkit: 'Herramientas de mesa', savedCountLabel: 'guardados', placesTryNext: 'Lugares que quieres probar', emailTaken: 'Ese correo ya está registrado en esta demo. Inicia sesión.',
    invalidEmail: 'Introduce un correo electrónico válido.', loginBeforeInvite: 'Inicia sesión para invitar a un acompañante.', cannotInviteSelf: 'No puedes invitarte a ti mismo.', noRegisteredUser: 'No hay ningún usuario registrado con ese correo.', alreadyConnected: 'Este acompañante ya está conectado.', invitationWaiting: 'Ya hay una invitación pendiente para esta persona.', toastReceipt: 'Se han aplicado los datos del recibo', toastRestaurantFirst: 'Escribe el nombre del restaurante antes de escanear', toastQuestionCopied: 'Pregunta copiada', toastConflict: 'Este plato entra en conflicto con tu Pasaporte de comida', toastAdded: 'añadido a la cesta', toastDeleted: 'Sesión eliminada', toastOrderSaved: 'Pedido guardado en esta sesión', toastUsingOrder: 'Volviendo a usar el total del pedido', toastCompanionConnected: 'Acompañante conectado', toastInvitationDeclined: 'Invitación rechazada', toastCompanionUnlinked: 'Acompañante desconectado', toastInvitationSent: 'Invitación enviada a', invitationAcceptHint: 'Puede aceptarla desde su Perfil.',
  },
  it: {
    step: 'Passo',
    back: 'Indietro', homeEvidence: 'Mangiare in Cina con informazioni chiare', decisionFirst: 'Prima scegli, poi ordina', scanConfidence: 'Scansiona, comprendi e scegli con fiducia.', evidenceAware: 'Basato sulle informazioni', conflictFlagged: 'conflitti segnalati', dishesReady: 'piatti pronti', orderSaved: 'Ordine salvato', tonight: 'Stasera · 19:42', dishesOrdered: 'piatti ordinati', menuDishes: 'piatti del menu', vegetarian: 'Vegetariano', passportActive: 'Passaporto alimentare attivo', addMoreDishes: 'Aggiungi altri piatti', viewOrder: 'Vedi ordine', reviewFlags: 'Controlla gli avvisi', deleteSession: 'Elimina sessione',
    whereEating: 'Dove mangi oggi?', restaurantPlaceholder: 'es. Chengdu Garden', restaurantHelper: 'Useremo questo nome per registrare la sessione di oggi.', uploadedPreview: 'Anteprima del menu caricato', chooseAnotherPhoto: 'Scegli un’altra foto', keepWholeMenu: 'Tieni tutto il menu nell’inquadratura', ocrReady: 'Limiti OCR rilevati · pronto per la pagina successiva', moveCloser: 'Avvicinati finché sono visibili tutti e quattro gli angoli', doneScanning: 'Termina scansione', retake: 'Scatta di nuovo', usePhoto: 'Usa foto', undo: 'Annulla', capturePage: 'Scatta la pagina del menu', showCapturedPages: 'Mostra le pagine catturate', pages: 'Pagine', capturedPages: 'Pagine catturate', keepScanning: 'continua a scansionare', addAnotherPage: 'Aggiungi un’altra pagina',
    clearConflicts: 'I piatti con conflitti chiari vengono esclusi dal carrello.', unknownVisible: 'Le informazioni insufficienti restano visibili come incerte.', chooseCompanions: 'Scegli i commensali', matchTable: 'Trova piatti adatti a tutti al tavolo', manage: 'Gestisci', add: 'Aggiungi', matchingAgainst: 'Confronto con il tuo Passaporto alimentare e', menuCategories: 'Categorie del menu', browseSections: 'Esplora le sezioni del menu', all: 'Tutto', filterCategories: 'Filtra le categorie del menu', dish: 'piatto', dishes: 'piatti', viewCart: 'Vedi carrello', cart: 'Carrello', selected: 'selezionati', browseDishes: 'Scegli i piatti mentre esplori', excluded: 'Escluso', inCart: 'Nel carrello', addToCart: 'Aggiungi al carrello', mild: 'Delicato', medium: 'Medio', spicy: 'Piccante', notSpicy: 'Non piccante', swipeExplore: 'Scorri per esplorare', helpfulContext: 'Contesto utile', contextNote: 'È una breve spiegazione culturale per aiutarti a decidere, non una promessa che le ricette siano identiche ovunque.',
    yourCart: 'Il tuo carrello', clear: 'Svuota', cartEmpty: 'Il carrello è vuoto', cartHint: 'Scegli i piatti adatti a te dal menu e appariranno qui.', backToMenu: 'Torna al menu', passportChecks: 'I controlli del passaporto restano visibili', cartSafety: 'Puoi aggiungere solo piatti senza conflitti chiari. Avvisi e informazioni mancanti restano associati a ogni piatto.', removeDish: 'Rimuovi piatto', singleDish: 'Un piatto', confirmSelections: 'Conferma selezioni', decrease: 'Riduci quantità', increase: 'Aumenta quantità',
    orderBrief: 'Riepilogo ordine', orderStep: 'Passo 04 · Ordine', bilingualOrder: 'Pagina ordine bilingue', showWaiter: 'Mostralo al personale.', orderDescription: 'I piatti scelti e i requisiti del Passaporto alimentare sono riuniti nella tua lingua e in cinese.', forYou: 'Per te', selectedDishes: 'I tuoi piatti scelti', dietaryNotes: 'Note alimentari', requirements: 'I tuoi requisiti', noRequirements: 'Nessun requisito alimentare aggiuntivo.', forWaiter: 'Per il personale', neededDishes: 'Piatti richiesti', waiterNotes: 'Cibi da evitare e avvisi', noExtra: 'Nessun requisito aggiuntivo. Preparare secondo il menu.', addMore: 'Aggiungi altri piatti', splitBill: 'Dividi il conto', backHome: 'Torna alla home', returnCart: 'Torna al carrello per modificare', completeOrder: 'Completa l’ordine e torna alla home', orderDisclaimer: 'Questa pagina traduce i requisiti salvati per comunicarli. Il ristorante deve comunque confermare ingredienti e contatto incrociato.',
    askStep: 'Passo 04 · Chiedi', chineseShowFirst: '中文 · Mostra prima', askDisclaimer: 'Se il ristorante non può confermare, mantieni questo piatto escluso dai suggerimenti. Il menu non può determinare il contatto incrociato in cucina.',
    items: 'elementi', receiptUpdated: 'Ricevuta aggiornata', fromOrder: 'Dall’ordine', replaceReceipt: 'Sostituisci ricevuta', uploadReceipt: 'Carica la ricevuta per aggiornare', useOrderTotals: 'Usa il totale dell’ordine', lineItemsUpdated: 'Voci e totale aggiornati da', uploadedReceipt: 'la ricevuta caricata', usingOrderPrices: 'Usiamo i prezzi salvati al momento dell’ordine. Carica una ricevuta se il totale finale è cambiato.', receiptTotal: 'Totale ricevuta', orderTotal: 'Totale ordine', namesEditable: 'I nomi sono modificabili', tapAssign: 'Tocca una voce per assegnarla', everyonePays: 'Ognuno paga', exactCheck: 'Controllo del totale esatto', shareReady: 'Pronto per la condivisione', editParticipant: 'Modifica partecipante', removeParticipant: 'Rimuovi partecipante', everyone: 'Tutti', guest: 'Ospite', you: 'Tu',
    exploreKicker: 'P1 · Esplora', createFoodPost: 'Crea un post sul cibo', findHeading: 'Trova il tuo prossimo piatto preferito.', findDescription: 'Note reali sui piatti da persone vicine. Salva il ristorante quando ti viene voglia di provarlo.', foodCategories: 'Categorie di cucina', communityPicks: 'Scelte della community, attente al passaporto', communityHint: 'Salva un posto e controlla il menu quando lo visiti.', mustTry: 'DA PROVARE', save: 'Salva', saved: 'Salvato', noNotes: 'Non ci sono ancora note in questa categoria.', keepExploring: 'Prova un’altra cucina e continua a esplorare.', shareYourBite: 'Condividi il tuo assaggio', createFoodNote: 'Crea una nota sul cibo', historyOnly: 'Puoi scegliere solo ristoranti presenti nella cronologia degli ordini.', visitedRestaurant: 'Ristorante visitato', pastVisit: 'Visita passata', noHistory: 'Nessun ordine storico corrispondente.', postTitle: 'Titolo del post', titlePlaceholder: 'es. Un posto tranquillo vicino alla metro', signatureDish: 'Piatto forte', dishName: 'Nome del piatto', dishDetails: 'Dettagli del piatto', dishDetailsPlaceholder: 'Consistenza · gusto · prezzo ¥', cuisineCategory: 'Categoria della cucina', yourExperience: 'La tua esperienza', experiencePlaceholder: 'Cosa ha reso memorabile questo pasto?', cancel: 'Annulla', publishNote: 'Pubblica nota', closeComposer: 'Chiudi editor', moreOptions: 'Altre opzioni', sharePost: 'Condividi',
    savedRestaurants: 'Ristoranti salvati', profileFindFood: 'Profilo · Cerca cibo', openFindFood: 'Apri Cerca cibo', findFood: 'Cerca cibo', placesWorthReturning: 'Posti in cui tornare', savedRestaurantsHint: 'I tuoi ristoranti salvati restano qui, pronti per il prossimo pasto.', exploreFindFood: 'Esplora Cerca cibo', saveFromFeed: 'Salva un ristorante dal feed', noSavedRestaurants: 'Nessun ristorante salvato.', removeFromSaved: 'Rimuovi dai salvati',
    companions: 'Commensali', profileAtTable: 'Profilo · A tavola', atTheTable: 'A tavola', makeMenuWork: 'Fai funzionare il menu per tutti.', connectPassport: 'Collega una volta il Passaporto alimentare di un amico e usalo ogni volta che condividete il tavolo.', connected: 'connessi', invitationsToReview: 'inviti da controllare', privateSettings: 'Le impostazioni alimentari private restano di ogni persona.', newInvitation: 'Nuovo invito', wantsToDine: 'Qualcuno vuole mangiare con te.', shareConnection: 'Vuole condividere con te il collegamento al proprio Passaporto alimentare.', accept: 'Accetta', decline: 'Rifiuta', waitingForThem: 'In attesa di risposta', invitationsSent: 'Inviti inviati', pending: 'In attesa', addCompanion: 'Aggiungi commensale', inviteRegistered: 'Invita qualcuno registrato su Bitewise', companionEmail: 'Email del commensale', invite: 'Invita', registeredOnly: 'Solo gli account registrati possono ricevere un invito. Il loro Passaporto alimentare resta privato finché non accettano.', noCompanions: 'Nessun commensale.', buildTableProfile: 'Invita un utente registrato per creare un profilo condiviso del tavolo.', viewFoodPassport: 'Vedi Passaporto alimentare', companionFlow: 'Dopo aver scansionato il menu, scegli i commensali per filtrare i piatti per tutto il tavolo.', companionReadOnly: 'Commensale · Sola lettura', sharedPassport: 'Passaporto alimentare condiviso', tableProfile: 'profilo del tavolo', useSettings: 'Puoi usare queste impostazioni per filtrare un menu scansionato, ma solo', canEdit: 'può modificarle.', readOnly: 'Sola lettura', allergens: 'Allergeni', dietaryStyle: 'Stile alimentare', foodsToAvoid: 'Cibi da evitare', everydayPreferences: 'Preferenze quotidiane', spicePreference: 'Preferenza per il piccante', notSet: 'Non impostato', upToLevel: 'Fino al livello', kitchenSafety: 'Sicurezza in cucina', noShared: 'Nessun allergene condiviso', noDietShared: 'Nessuno stile alimentare condiviso', noRulesShared: 'Nessuna regola alimentare condivisa', noPreferencesShared: 'Nessuna preferenza condivisa', avoidCrossContact: 'Evita il contatto incrociato', notSpecified: 'Non specificato', readonlyNote: 'Questa è una vista di sola lettura. Il proprietario dell’account controlla il proprio Passaporto alimentare.', unlinkCompanion: 'Scollega commensale',
    profileSubtitle: 'Tieni passaporto, luoghi salvati e commensali del tavolo in un unico posto.', yourFoodProfile: 'Il tuo profilo alimentare', myCompanions: 'I miei commensali', sharedPassports: 'Passaporti alimentari condivisi per il tavolo', new: 'nuovi', tableToolkit: 'Strumenti del tavolo', savedCountLabel: 'salvati', placesTryNext: 'Posti da provare', emailTaken: 'Questa email è già registrata nella demo. Accedi invece.',
    invalidEmail: 'Inserisci un indirizzo email valido.', loginBeforeInvite: 'Accedi per invitare un commensale.', cannotInviteSelf: 'Non puoi invitare te stesso.', noRegisteredUser: 'Non esiste un utente registrato con questa email.', alreadyConnected: 'Questo commensale è già collegato.', invitationWaiting: 'C’è già un invito in attesa per questa persona.', toastReceipt: 'Dati della ricevuta applicati', toastRestaurantFirst: 'Inserisci il nome del ristorante prima di scansionare', toastQuestionCopied: 'Domanda copiata', toastConflict: 'Questo piatto è in conflitto con il tuo Passaporto alimentare', toastAdded: 'aggiunto al carrello', toastDeleted: 'Sessione eliminata', toastOrderSaved: 'Ordine salvato in questa sessione', toastUsingOrder: 'Uso di nuovo il totale dell’ordine', toastCompanionConnected: 'Commensale collegato', toastInvitationDeclined: 'Invito rifiutato', toastCompanionUnlinked: 'Commensale scollegato', toastInvitationSent: 'Invito inviato a', invitationAcceptHint: 'Può accettarlo dal proprio Profilo.',
  },
}

const uploadSourceCopy: Record<Language, { title: string; subtitle: string; photos: string; files: string; cancel: string }> = {
  en: { title: 'Choose upload source', subtitle: 'Select a photo from your library or a file from your device.', photos: 'Choose from Photos', files: 'Choose from Files', cancel: 'Cancel' },
  ko: { title: '업로드 방식 선택', subtitle: '사진 앱 또는 기기 파일에서 메뉴 이미지를 선택하세요.', photos: '사진에서 선택', files: '파일에서 선택', cancel: '취소' },
  ja: { title: 'アップロード元を選択', subtitle: '写真または端末のファイルからメニュー画像を選択してください。', photos: '写真から選ぶ', files: 'ファイルから選ぶ', cancel: 'キャンセル' },
  ru: { title: 'Выберите источник', subtitle: 'Выберите фото из галереи или файл на устройстве.', photos: 'Из фотографий', files: 'Из файлов', cancel: 'Отмена' },
  es: { title: 'Elige el origen', subtitle: 'Selecciona una foto de tu galería o un archivo del dispositivo.', photos: 'Elegir de Fotos', files: 'Elegir de Archivos', cancel: 'Cancelar' },
  it: { title: 'Scegli la fonte', subtitle: 'Seleziona una foto dalla galleria o un file dal dispositivo.', photos: 'Scegli dalle foto', files: 'Scegli dai file', cancel: 'Annulla' },
}

const askEditorCopy: Record<Language, { chinese: string; english: string; translate: string; translating: string; pause: string; resume: string; editHint: string; translationHint: string }> = {
  en: { chinese: 'Chinese', english: 'English', translate: 'Translate', translating: 'Translating…', pause: 'Pause', resume: 'Resume', editHint: 'Edit the Chinese question before showing it to the restaurant.', translationHint: 'Tap Translate after editing to generate a new English version.' },
  ko: { chinese: '중국어', english: '영어', translate: '번역', translating: '번역 중…', pause: '일시정지', resume: '계속 재생', editHint: '식당에 보여줄 중국어 질문을 수정할 수 있어요.', translationHint: '수정 후 번역을 눌러 새 영어 문장을 만드세요.' },
  ja: { chinese: '中国語', english: '英語', translate: '翻訳', translating: '翻訳中…', pause: '一時停止', resume: '再開', editHint: 'お店に見せる中国語の質問を編集できます。', translationHint: '編集後に「翻訳」を押すと英語を更新します。' },
  ru: { chinese: 'Китайский', english: 'Английский', translate: 'Перевести', translating: 'Переводим…', pause: 'Пауза', resume: 'Продолжить', editHint: 'Отредактируйте вопрос на китайском перед показом ресторану.', translationHint: 'После правки нажмите «Перевести», чтобы создать новую английскую версию.' },
  es: { chinese: 'Chino', english: 'Inglés', translate: 'Traducir', translating: 'Traduciendo…', pause: 'Pausar', resume: 'Reanudar', editHint: 'Edita la pregunta en chino antes de enseñarla al restaurante.', translationHint: 'Después de editar, pulsa Traducir para generar una nueva versión en inglés.' },
  it: { chinese: 'Cinese', english: 'Inglese', translate: 'Traduci', translating: 'Traduzione…', pause: 'Pausa', resume: 'Riprendi', editHint: 'Modifica la domanda in cinese prima di mostrarla al ristorante.', translationHint: 'Dopo aver modificato il testo, premi Traduci per generare un nuovo inglese.' },
}

function translateRestaurantQuestion(question: string) {
  const text = question.trim()
  const allergyMatch = text.match(/^我对(.+?)严重过敏。请问这道菜是否含有花生、花生油或花生酱？制作时是否会接触花生？如果无法确认，请不要为我制作。$/)
  if (allergyMatch) return `I have a severe allergy to ${allergyMatch[1].replace(/花生/g, 'peanuts')}. Could you please confirm whether this dish contains peanuts, peanut oil, or peanut sauce? Could it come into contact with peanuts during preparation? If this cannot be confirmed, please do not prepare it for me.`
  const dishMatch = text.match(/^请问(.+?)是否含有未列出的过敏原？制作时会与其他食材共用锅具或炸油吗？$/)
  if (dishMatch) return `Could you please tell me whether ${dishMatch[1]} contains any unlisted allergens? Is it prepared using shared cookware or frying oil with other ingredients?`
  const replacements: Array<[RegExp, string]> = [
    [/如果无法确认，请不要为我制作。?/g, 'If this cannot be confirmed, please do not prepare it for me.'],
    [/制作时是否会接触花生/g, 'Could it come into contact with peanuts during preparation'],
    [/制作时会与其他食材共用锅具或炸油吗/g, 'Is it prepared using shared cookware or frying oil with other ingredients'],
    [/是否含有未列出的过敏原/g, 'whether it contains any unlisted allergens'],
    [/是否含有/g, 'whether it contains'],
    [/请问/g, 'Could you please tell me '],
    [/严重过敏/g, 'have a severe allergy to'],
    [/我对/g, 'I am allergic to '],
    [/花生油/g, 'peanut oil'],
    [/花生酱/g, 'peanut sauce'],
    [/花生/g, 'peanuts'],
    [/过敏原/g, 'allergens'],
    [/这道菜/g, 'this dish'],
    [/吗[？?]?/g, '?'],
    [/。/g, '.'],
  ]
  const translated = replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text)
  return translated === text ? `Please confirm this with the restaurant: “${text}”` : translated
}

const categoryLabels: Record<Language, Record<DishCategory, string>> = {
  en: { featured: 'Featured', appetizer: 'Appetizers & small plates', salad: 'Salads & cold dishes', soup: 'Soups & broths', main: 'Main dishes', side: 'Sides & vegetables', staple: 'Rice, noodles & bread', combo: 'Sets & combos', dessert: 'Desserts', drink: 'Non-alcoholic drinks', alcohol: 'Alcohol', other: 'Other' },
  ko: { featured: '추천 메뉴', appetizer: '전채 · 소식', salad: '샐러드 · 냉채', soup: '국물 · 수프', main: '주요리', side: '곁들임 · 채소', staple: '밥 · 면 · 빵', combo: '세트 · 콤보', dessert: '디저트', drink: '무알코올 음료', alcohol: '주류', other: '기타' },
  ja: { featured: 'おすすめ', appetizer: '前菜・小皿', salad: 'サラダ・冷菜', soup: 'スープ・汁物', main: '主菜', side: '副菜・野菜', staple: 'ご飯・麺・パン', combo: 'セット・コンボ', dessert: 'デザート', drink: 'ノンアルコール', alcohol: 'アルコール', other: 'その他' },
  ru: { featured: 'Рекомендуем', appetizer: 'Закуски и небольшие блюда', salad: 'Салаты и холодные блюда', soup: 'Супы и бульоны', main: 'Основные блюда', side: 'Гарниры и овощи', staple: 'Рис, лапша и хлеб', combo: 'Сеты и комбо', dessert: 'Десерты', drink: 'Безалкогольные напитки', alcohol: 'Алкоголь', other: 'Другое' },
  es: { featured: 'Destacados', appetizer: 'Entrantes y platos pequeños', salad: 'Ensaladas y platos fríos', soup: 'Sopas y caldos', main: 'Platos principales', side: 'Guarniciones y verduras', staple: 'Arroz, fideos y pan', combo: 'Menús y combos', dessert: 'Postres', drink: 'Bebidas sin alcohol', alcohol: 'Alcohol', other: 'Otros' },
  it: { featured: 'In evidenza', appetizer: 'Antipasti e piccoli piatti', salad: 'Insalate e piatti freddi', soup: 'Zuppe e brodi', main: 'Piatti principali', side: 'Contorni e verdure', staple: 'Riso, noodles e pane', combo: 'Set e combo', dessert: 'Dolci', drink: 'Bevande analcoliche', alcohol: 'Alcolici', other: 'Altro' },
}

const foodCategoryLabels: Record<Language, Record<string, string>> = {
  en: { all: 'All', local: 'Shanghai cuisine', hotpot: 'Hotpot', sichuan: 'Sichuan', snacks: 'Snacks', cantonese: 'Cantonese', vegetarian: 'Vegetarian', bbq: 'Barbecue' },
  ko: { all: '전체', local: '상하이 요리', hotpot: '훠궈', sichuan: '쓰촨 요리', snacks: '간식 · 딤섬', cantonese: '광둥 요리', vegetarian: '채식', bbq: '바비큐' },
  ja: { all: 'すべて', local: '上海料理', hotpot: '火鍋', sichuan: '四川料理', snacks: '軽食', cantonese: '広東料理', vegetarian: 'ベジタリアン', bbq: '焼き物' },
  ru: { all: 'Все', local: 'Шанхайская кухня', hotpot: 'Хого', sichuan: 'Сычуаньская кухня', snacks: 'Закуски', cantonese: 'Кантонская кухня', vegetarian: 'Вегетарианское', bbq: 'Барбекю' },
  es: { all: 'Todo', local: 'Cocina de Shanghái', hotpot: 'Hotpot', sichuan: 'Cocina de Sichuan', snacks: 'Aperitivos', cantonese: 'Cocina cantonesa', vegetarian: 'Vegetariana', bbq: 'Barbacoa' },
  it: { all: 'Tutto', local: 'Cucina di Shanghai', hotpot: 'Hotpot', sichuan: 'Cucina del Sichuan', snacks: 'Stuzzichini', cantonese: 'Cucina cantonese', vegetarian: 'Vegetariana', bbq: 'Barbecue' },
}

const countText = (language: Language, count: number, singular: string, plural: string) => {
  if (language === 'ko' || language === 'ja') return `${count}${singular}`
  return `${count} ${count === 1 ? singular : plural}`
}

const localizedPostMeta: Record<Language, { justNow: string; worthTrying: string }> = {
  en: { justNow: 'Just now', worthTrying: 'Worth a try' },
  ko: { justNow: '방금', worthTrying: '먹어볼 만해요' },
  ja: { justNow: 'たった今', worthTrying: '試す価値あり' },
  ru: { justNow: 'Только что', worthTrying: 'Стоит попробовать' },
  es: { justNow: 'Ahora mismo', worthTrying: 'Merece la pena probarlo' },
  it: { justNow: 'Proprio ora', worthTrying: 'Da provare' },
}

const baseDishes: Dish[] = [
  { id: 'kung-pao', name: 'Kung Pao Chicken', zh: '宫保鸡丁', localized: { en: 'Kung Pao Chicken', ko: '궁보계정', ja: '宮保鶏丁', ru: 'Курица гунбао', es: 'Pollo kung pao', it: 'Pollo kung pao' }, price: 38, imageSrc: '/dish-photos/kung-pao.png', className: 'visual-kungpao', ingredients: ['Chicken', 'Peanuts', 'Dried chilies', 'Scallions'], zhIngredients: ['鸡肉', '花生', '干辣椒', '葱'], allergens: ['peanut'], possibleAllergens: ['soy'], tags: ['Chicken', 'Peanut', 'Dried chili'], spicy: 2, vegetarian: false, vegan: false, hasPork: false, hasPoultry: true, hasScallion: true, hasCilantro: false, confidence: 0.98, taste: 'Sweet, savory, tangy and mildly numbing', texture: 'Tender chicken with crunchy peanuts', cooking: 'Quickly stir-fried over high heat', bestWith: 'Shared with rice and other dishes', culture: 'Kung Pao Chicken is a Sichuan stir-fry named after a historical official. Peanuts are normally part of the dish, not just a garnish.', reason: 'Peanuts are common in this dish, but this menu does not provide a complete ingredient list.' },
  { id: 'mapo-tofu', name: 'Mapo Tofu', zh: '麻婆豆腐', localized: { en: 'Mapo Tofu', ko: '마파두부', ja: '麻婆豆腐', ru: 'Мапо тофу', es: 'Tofu mapo', it: 'Tofu mapo' }, price: 28, imageSrc: '/dish-photos/mapo-tofu.png', className: 'visual-mapo', ingredients: ['Tofu', 'Chili bean paste', 'Minced pork', 'Sichuan pepper'], zhIngredients: ['豆腐', '豆瓣酱', '猪肉末', '花椒'], allergens: ['soy'], possibleAllergens: ['sesame'], possibleIngredients: ['Beef', 'Scallions'], possibleZhIngredients: ['牛肉', '葱花'], tags: ['Tofu', 'Chili bean paste', 'Minced pork'], spicy: 3, vegetarian: false, vegan: false, hasPork: true, hasCilantro: false, confidence: 0.91, taste: 'Spicy, savory and numbing', texture: 'Soft tofu with aromatic sauce', cooking: 'Simmered in a chili-bean sauce', bestWith: 'Steamed rice and greens', culture: '“Mapo” refers to the pockmarked grandmother credited with creating this beloved Sichuan dish.', reason: 'The base recipe commonly includes minced pork and the menu does not mark this version vegetarian.' },
  { id: 'eggplant', name: 'Fish-fragrant Eggplant', zh: '鱼香茄子', localized: { en: 'Fish-fragrant Eggplant', ko: '어향 가지', ja: '魚香茄子', ru: 'Баклажаны в стиле юйсян', es: 'Berenjena yuxiang', it: 'Melanzane yuxiang' }, price: 42, imageSrc: '/dish-photos/eggplant.png', className: 'visual-eggplant', ingredients: ['Eggplant', 'Garlic', 'Pickled chili', 'Vinegar'], zhIngredients: ['茄子', '蒜', '泡椒', '醋'], allergens: [], possibleAllergens: ['soy'], possibleIngredients: ['Scallions'], possibleZhIngredients: ['葱花'], tags: ['Vegetarian', 'Garlic', 'Sichuan'], spicy: 1, vegetarian: true, vegan: true, hasPork: false, hasGarlic: true, hasCilantro: false, confidence: 0.95, taste: 'Sweet-sour, garlicky and gently spicy', texture: 'Silky eggplant with a glossy sauce', cooking: 'Braised until tender', bestWith: 'Rice and a crisp green dish', culture: '“Fish-fragrant” describes a Sichuan seasoning style; it does not necessarily mean the dish contains fish.', reason: 'This menu labels the version vegetarian, but sauce and kitchen cross-contact still need confirmation for allergies.' },
  { id: 'greens', name: 'Garlic Seasonal Greens', zh: '蒜蓉时蔬', localized: { en: 'Garlic Seasonal Greens', ko: '마늘 제철 채소', ja: '季節野菜のにんにく炒め', ru: 'Сезонные овощи с чесноком', es: 'Verduras de temporada al ajo', it: 'Verdure stagionali all’aglio' }, price: 28, imageSrc: '/dish-photos/seasonal-greens.png', className: 'visual-greens', ingredients: ['Seasonal greens', 'Garlic', 'Cooking oil'], zhIngredients: ['时蔬', '蒜', '食用油'], allergens: [], possibleAllergens: ['soy', 'mollusk'], possibleIngredients: ['Soy sauce or oyster sauce'], possibleZhIngredients: ['生抽或蚝油'], tags: ['Vegetarian', 'Fresh', 'Mild'], spicy: 0, vegetarian: true, vegan: true, hasPork: false, hasGarlic: true, hasCilantro: false, confidence: 0.86, taste: 'Fresh, mild and garlicky', texture: 'Crisp-tender leaves', cooking: 'Flash-fried in a hot wok', bestWith: 'Balances spicy shared dishes', culture: 'A common Chinese table vegetable; the exact greens change with the season.', reason: 'No listed conflict, but the cooking oil and shared wok are not confirmed by this menu.' },
  { id: 'lotus', name: 'Sweet-sour Lotus Root', zh: '糖醋藕片', localized: { en: 'Sweet-sour Lotus Root', ko: '탕수 연근', ja: '甘酢れんこん', ru: 'Корень лотоса в кисло-сладком соусе', es: 'Raíz de loto agridulce', it: 'Radice di loto agrodolce' }, price: 34, imageSrc: '/dish-photos/lotus-root.png', className: 'visual-lotus', ingredients: ['Lotus root', 'Rice vinegar', 'Sugar', 'Sesame'], zhIngredients: ['莲藕', '米醋', '糖', '芝麻'], allergens: ['sesame'], possibleAllergens: ['wheat'], tags: ['Vegetarian', 'Crisp', 'Sweet-sour'], spicy: 0, vegetarian: true, vegan: true, hasPork: false, hasCilantro: false, confidence: 0.78, taste: 'Bright sweet-sour crunch', texture: 'Crisp and juicy', cooking: 'Quickly stir-fried with vinegar glaze', bestWith: 'A rich or spicy table', culture: 'Lotus root is loved for its connected slices, often associated with togetherness at the table.', reason: 'Sesame is listed; other sauce ingredients are not fully specified.' },
  { id: 'soup', name: 'Winter Melon Mushroom Soup', zh: '冬瓜菌菇汤', localized: { en: 'Winter Melon Mushroom Soup', ko: '동과 버섯 수프', ja: '冬瓜ときのこのスープ', ru: 'Суп из зимней дыни и грибов', es: 'Sopa de melón de invierno y setas', it: 'Zuppa di zucca invernale e funghi' }, price: 36, imageSrc: '/dish-photos/winter-melon-soup.png', className: 'visual-soup', ingredients: ['Winter melon', 'Mushrooms', 'Ginger', 'Stock'], zhIngredients: ['冬瓜', '菌菇', '姜', '高汤'], allergens: [], possibleAllergens: ['shellfish', 'soy'], tags: ['Vegetarian option', 'Warm', 'Mild'], spicy: 0, vegetarian: true, vegan: false, hasPork: false, hasCilantro: false, confidence: 0.59, taste: 'Light, savory and warming', texture: 'Soft melon with tender mushrooms', cooking: 'Slow-simmered broth', bestWith: 'Shared across the table', culture: 'A gentle soup often used to balance bolder dishes.', reason: 'The stock base is not specified, so the dish stays explicitly uncertain.' },
]

const demoKnowledge: Record<string, { id: string; nameEn: string; aliases: string[]; ingredients: string[]; allergens: { id: string; label?: string }[] }> = {
  '宫保鸡丁': { id: 'cn-0002', nameEn: 'Kung Pao Chicken', aliases: ['kung pao', 'gong bao ji ding'], ingredients: ['soy sauce', 'starch'], allergens: [{ id: 'soy', label: '大豆' }] },
  '麻婆豆腐': { id: 'cn-0001', nameEn: 'Mapo Tofu', aliases: ['mapo', 'mapo tofu'], ingredients: ['soy products'], allergens: [{ id: 'soy', label: '大豆' }] },
  '鱼香茄子': { id: 'cn-0038', nameEn: 'Fish-fragrant Eggplant', aliases: ['fish fragrant eggplant', 'yuxiang eggplant'], ingredients: ['soy sauce', 'sugar'], allergens: [{ id: 'soy', label: '大豆' }] },
  '蒜蓉时蔬': { id: 'cn-0479', nameEn: 'Garlic Seasonal Greens', aliases: ['garlic greens'], ingredients: ['shared wok or oil'], allergens: [] },
  '糖醋藕片': { id: 'cn-0480', nameEn: 'Sweet-and-sour Lotus Root', aliases: ['sweet sour lotus root'], ingredients: ['sesame or sesame oil'], allergens: [{ id: 'sesame', label: '芝麻' }] },
  '冬瓜菌菇汤': { id: 'cn-0481', nameEn: 'Winter Melon Mushroom Soup', aliases: ['winter melon mushroom soup'], ingredients: [], allergens: [{ id: 'soy', label: '大豆' }, { id: 'shellfish', label: '甲壳类' }] },
}
const dishes: Dish[] = baseDishes.map((dish) => {
  const knowledge = demoKnowledge[dish.zh]
  const ingredientEvidence = [...dish.ingredients.map((label) => ({ label, source: 'menu' as const })), ...(knowledge?.ingredients || []).map((label) => ({ label, source: 'knowledge' as const })), ...(dish.possibleIngredients || []).map((label, index) => ({ label, labelZh: dish.possibleZhIngredients?.[index], source: 'unknown' as const }))].filter((item, index, items) => items.findIndex((candidate) => candidate.label.toLowerCase() === item.label.toLowerCase()) === index)
  const allergenEvidence = [...dish.allergens.map((id) => ({ id, source: 'menu' as const })), ...(knowledge?.allergens || []).map(({ id, label }) => ({ id, label, source: 'knowledge' as const }))]
  return { ...dish, ingredientEvidence, allergenEvidence, ...(knowledge ? { knowledgeMatch: { id: knowledge.id, nameZh: dish.zh, nameEn: knowledge.nameEn, aliases: knowledge.aliases } } : {}) }
})

const emptyLocalized: Record<Language, string> = { en: '', ko: '', ja: '', ru: '', es: '', it: '' }
const mapBackendDish = (raw: BackendDish): Dish => {
  const local = dishes.find((dish) => dish.name.toLowerCase() === raw.name.toLowerCase() || dish.zh === raw.zh)
  const localized = { ...emptyLocalized, ...(local?.localized || {}), ...(raw.localized || {}), en: raw.localized?.en || raw.name }
  Object.keys(localized).forEach((key) => { if (!localized[key as Language]) localized[key as Language] = raw.name })
  return {
    ...(local || {
      imageSrc: '/bitewise-icon-192.png', className: 'visual-greens', taste: 'Not provided by the menu', texture: 'Not provided by the menu', cooking: 'Ask the restaurant', bestWith: 'Ask the restaurant', culture: 'No cultural context was returned.', reason: 'This dish was extracted from the uploaded menu and still needs restaurant confirmation.',
    }),
    id: raw.id,
    name: raw.name,
    zh: raw.zh,
    localized,
    price: raw.price ?? local?.price ?? 0,
    ingredients: raw.ingredients,
    zhIngredients: local?.zhIngredients || raw.ingredients,
    allergens: raw.allergens,
    possibleAllergens: raw.possibleAllergens,
    possibleIngredients: raw.possibleIngredients ?? local?.possibleIngredients,
    possibleZhIngredients: raw.possibleZhIngredients ?? local?.possibleZhIngredients,
    tags: raw.tags,
    spicy: raw.spicy ?? 0,
    vegetarian: raw.vegetarian ?? local?.vegetarian ?? false,
    vegan: raw.vegan ?? local?.vegan ?? false,
    hasPork: raw.hasPork ?? local?.hasPork,
    hasBeef: raw.hasBeef ?? local?.hasBeef,
    hasPoultry: raw.hasPoultry ?? local?.hasPoultry,
    hasSeafood: raw.hasSeafood ?? local?.hasSeafood,
    hasOffal: raw.hasOffal ?? local?.hasOffal,
    hasCilantro: raw.hasCilantro ?? local?.hasCilantro,
    hasScallion: raw.hasScallion ?? local?.hasScallion,
    hasGarlic: raw.hasGarlic ?? local?.hasGarlic,
    hasLard: raw.hasLard ?? local?.hasLard,
    confidence: raw.confidence,
    ingredientEvidence: raw.ingredientEvidence || [...raw.ingredients.map((label) => ({ label, source: 'menu' as const })), ...(raw.possibleIngredients || []).map((label, index) => ({ label, labelZh: raw.possibleZhIngredients?.[index], source: 'unknown' as const }))],
    allergenEvidence: raw.allergenEvidence || raw.allergens.map((id) => ({ id, source: 'menu' as const })),
    knowledgeMatch: raw.knowledgeMatch,
  }
}
const serializeDish = (dish: Dish): BackendDish => ({ id: dish.id, name: dish.name, zh: dish.zh, price: dish.price, ingredients: dish.ingredients, allergens: dish.allergens, possibleAllergens: dish.possibleAllergens || [], possibleIngredients: dish.possibleIngredients, possibleZhIngredients: dish.possibleZhIngredients, confidence: dish.confidence, spicy: dish.spicy, vegetarian: dish.vegetarian, vegan: dish.vegan, tags: dish.tags, hasPork: dish.hasPork, hasBeef: dish.hasBeef, hasPoultry: dish.hasPoultry, hasSeafood: dish.hasSeafood, hasOffal: dish.hasOffal, hasCilantro: dish.hasCilantro, hasScallion: dish.hasScallion, hasGarlic: dish.hasGarlic, hasLard: dish.hasLard, localized: dish.localized, ingredientEvidence: dish.ingredientEvidence, allergenEvidence: dish.allergenEvidence, knowledgeMatch: dish.knowledgeMatch })

const makeBillItem = (id: string, dishId: string, label: string, zh: string, amount: number): BillItem => ({ id, label, zh, amount, dish: dishes.find((dish) => dish.id === dishId)! })

type DiningOrder = { id: string; restaurant: string; initials: string; location: string; time: string; status: 'current' | 'completed'; itemCount: number; total: number; preview: string; tone: string; billItems: BillItem[]; receiptItems: BillItem[]; menuSnapshot?: Dish[]; cartSnapshot?: CartItem[]; passportSnapshot?: Passport; companionNames?: string[]; savedAt?: number }

const sichuanOrderBillItems = [
  makeBillItem('eggplant', 'eggplant', 'Fish-fragrant eggplant', '鱼香茄子', 42),
  makeBillItem('lotus', 'lotus', 'Sweet-sour lotus root', '糖醋藕片', 34),
  makeBillItem('greens', 'greens', 'Seasonal greens', '时蔬', 28),
  makeBillItem('soup', 'soup', 'Mushroom soup', '菌菇汤', 24),
]
const sichuanReceiptItems = [
  makeBillItem('eggplant', 'eggplant', 'Fish-fragrant eggplant', '鱼香茄子', 45),
  makeBillItem('lotus', 'lotus', 'Sweet-sour lotus root', '糖醋藕片', 34),
  makeBillItem('greens', 'greens', 'Seasonal greens', '时蔬', 28),
  makeBillItem('soup', 'soup', 'Mushroom soup', '菌菇汤', 24),
]
const bambooOrderBillItems = [
  makeBillItem('soup', 'soup', 'Mushroom soup', '菌菇汤', 36),
  makeBillItem('greens', 'greens', 'Seasonal greens', '时蔬', 28),
  makeBillItem('lotus', 'lotus', 'Sweet-sour lotus root', '糖醋藕片', 20),
]
const bambooReceiptItems = [
  makeBillItem('soup', 'soup', 'Mushroom soup', '菌菇汤', 38),
  makeBillItem('greens', 'greens', 'Seasonal greens', '时蔬', 28),
  makeBillItem('lotus', 'lotus', 'Sweet-sour lotus root', '糖醋藕片', 24),
]

const pastDiningOrders: DiningOrder[] = [
  { id: 'pepper-alley-past', restaurant: 'Pepper Alley', initials: 'PA', location: 'Shanghai · Jing’an', time: 'Sep 21 · 7:15 PM', status: 'completed', itemCount: 4, total: 128, preview: 'Dry-pot prawns · Skewers · Greens · Rice', tone: 'order-tone-green', billItems: sichuanOrderBillItems, receiptItems: sichuanReceiptItems },
  { id: 'green-bamboo-past', restaurant: 'Green Bamboo House', initials: 'GB', location: 'Shanghai · French Concession', time: 'Sep 18 · 12:40 PM', status: 'completed', itemCount: 3, total: 84, preview: 'Mushroom soup · Seasonal greens · Lotus root', tone: 'order-tone-gold', billItems: bambooOrderBillItems, receiptItems: bambooReceiptItems },
  { id: 'old-town-kitchen-past', restaurant: 'Old Town Kitchen', initials: 'OT', location: 'Shanghai · Jing’an', time: 'Sep 14 · 6:50 PM', status: 'completed', itemCount: 3, total: 116, preview: 'Soy-glazed pork ribs · Quail eggs · Rice', tone: 'order-tone-red', billItems: sichuanOrderBillItems, receiptItems: sichuanReceiptItems },
  { id: 'red-lantern-hotpot-past', restaurant: 'Red Lantern Hotpot', initials: 'RL', location: 'Shanghai · Xuhui', time: 'Sep 09 · 8:10 PM', status: 'completed', itemCount: 5, total: 176, preview: 'Mala butter prawns · Lotus seeds · Tea', tone: 'order-tone-gold', billItems: bambooOrderBillItems, receiptItems: bambooReceiptItems },
  { id: 'jade-soup-dumpling-past', restaurant: 'Jade Soup Dumpling', initials: 'JS', location: 'Shanghai · People’s Square', time: 'Sep 06 · 11:30 AM', status: 'completed', itemCount: 3, total: 72, preview: 'Pan-fried pork buns · Tea · Greens', tone: 'order-tone-green', billItems: bambooOrderBillItems, receiptItems: bambooReceiptItems },
  { id: 'lotus-table-past', restaurant: 'Lotus Table', initials: 'LT', location: 'Shanghai · Former French Concession', time: 'Sep 02 · 12:20 PM', status: 'completed', itemCount: 4, total: 142, preview: 'Crisp shrimp-taro rolls · Tea · Small plates', tone: 'order-tone-red', billItems: sichuanOrderBillItems, receiptItems: sichuanReceiptItems },
  { id: 'west-lake-tea-room-past', restaurant: 'West Lake Tea Room', initials: 'WL', location: 'Shanghai · Hongqiao', time: 'Aug 29 · 2:00 PM', status: 'completed', itemCount: 3, total: 108, preview: 'Longjing tea chicken · Pear · Tea', tone: 'order-tone-gold', billItems: bambooOrderBillItems, receiptItems: bambooReceiptItems },
  { id: 'charcoal-yard-past', restaurant: 'Charcoal Yard', initials: 'CY', location: 'Shanghai · Jing’an', time: 'Aug 25 · 9:40 PM', status: 'completed', itemCount: 4, total: 156, preview: 'Cumin lamb skewers · King oyster mushrooms', tone: 'order-tone-green', billItems: sichuanOrderBillItems, receiptItems: sichuanReceiptItems },
]

const allergyOptions = [
  { id: 'wheat', label: 'Cereals containing gluten', icon: '🌾', order: 1 },
  { id: 'crustacean', label: 'Crustaceans', icon: '🦀', order: 2 },
  { id: 'egg', label: 'Eggs', icon: '🥚', order: 3 },
  { id: 'soy', label: 'Soybeans', icon: '🌱', order: 4 },
  { id: 'milk', label: 'Milk', icon: '🥛', order: 5 },
  { id: 'tree-nut', label: 'Nuts', icon: '🌰', order: 6 },
  { id: 'celery', label: 'Celery', icon: '🥬', order: 7 },
  { id: 'fish', label: 'Fish', icon: '🐟', order: 8 },
  { id: 'peanut', label: 'Peanuts', icon: '🥜', order: 9 },
  { id: 'mustard', label: 'Mustard', icon: '🟡', order: 10 },
  { id: 'sesame', label: 'Sesame', icon: '⚪', order: 11 },
  { id: 'sulphites', label: 'Sulphur dioxide / sulphites', icon: '⚗️', order: 12 },
  { id: 'lupin', label: 'Lupin', icon: '🪻', order: 13 },
  { id: 'mollusk', label: 'Molluscs', icon: '🐚', order: 14 },
]
const allergenMatchKeys = (id: string) => (id === 'crustacean' || id === 'mollusk' ? [id, 'shellfish'] : [id])
const dietStyleOptions: Array<{ id: DietStyle; label: string; icon: string; hint: string }> = [
  { id: 'none', label: 'No restriction', icon: '—', hint: 'I eat everything' },
  { id: 'vegan', label: 'Vegan', icon: '🌿', hint: 'No animal products' },
  { id: 'lacto', label: 'Lacto-vegetarian', icon: '🥛', hint: 'Dairy is okay' },
  { id: 'ovo', label: 'Ovo-vegetarian', icon: '🥚', hint: 'Eggs are okay' },
  { id: 'lacto-ovo', label: 'Lacto-ovo vegetarian', icon: '🥬', hint: 'Dairy and eggs are okay' },
  { id: 'pescatarian', label: 'Pescatarian', icon: '🐟', hint: 'Fish and seafood are okay' },
  { id: 'flexitarian', label: 'Flexitarian', icon: '🌱', hint: 'Mostly plant-based' },
]
const faithDietOptions: Array<{ id: FaithDiet; label: string; icon: string; hint: string }> = [
  { id: 'none', label: 'None', icon: '—', hint: 'No faith-based rule' },
  { id: 'halal', label: 'Halal', icon: '☾', hint: 'Prepare accordingly' },
  { id: 'kosher', label: 'Kosher', icon: '✡', hint: 'Prepare accordingly' },
  { id: 'other', label: 'Other', icon: '＋', hint: 'Tell us more' },
]
const avoidFoodOptions = [
  { id: 'no-pork', label: 'No pork', icon: '🐖' },
  { id: 'no-beef', label: 'No beef', icon: '🐄' },
  { id: 'no-poultry', label: 'No poultry', icon: '🐔' },
  { id: 'no-seafood', label: 'No seafood', icon: '🦐' },
  { id: 'no-offal', label: 'No offal', icon: '🥩' },
]
const dietOptions = [{ id: 'vegetarian', label: 'Vegetarian' }, { id: 'vegan', label: 'Vegan' }, ...avoidFoodOptions.map(({ id, label }) => ({ id, label }))]
const preferenceOptions = [
  { id: 'less-oil', label: 'Less oil', icon: '💪' }, { id: 'less-salt', label: 'Less salt', icon: '🧂' }, { id: 'less-sugar', label: 'Less sugar', icon: '🍬' }, { id: 'no-cilantro', label: 'No cilantro', icon: '🌿' }, { id: 'no-scallion', label: 'No scallion', icon: '🧅' }, { id: 'no-garlic', label: 'No garlic', icon: '🧄' }, { id: 'no-raw', label: 'No raw food', icon: '🍣' }, { id: 'well-cooked', label: 'Well-cooked', icon: '🔥' }, { id: 'boneless', label: 'Prefer boneless', icon: '🍗' },
]
const passportOptionTranslations: Record<Language, {
  dietStyle: Record<DietStyle, { label: string; hint: string }>
  faithDiet: Record<FaithDiet, { label: string; hint: string }>
  avoidFood: Record<string, string>
  preference: Record<string, string>
}> = {
  en: {
    dietStyle: { none: { label: 'No restriction', hint: 'I eat everything' }, vegetarian: { label: 'Vegetarian', hint: 'No meat or seafood' }, vegan: { label: 'Vegan', hint: 'No animal products' }, lacto: { label: 'Lacto-vegetarian', hint: 'Dairy is okay' }, ovo: { label: 'Ovo-vegetarian', hint: 'Eggs are okay' }, 'lacto-ovo': { label: 'Lacto-ovo vegetarian', hint: 'Dairy and eggs are okay' }, pescatarian: { label: 'Pescatarian', hint: 'Fish and seafood are okay' }, flexitarian: { label: 'Flexitarian', hint: 'Mostly plant-based' } },
    faithDiet: { none: { label: 'None', hint: 'No faith-based rule' }, halal: { label: 'Halal', hint: 'Prepare accordingly' }, kosher: { label: 'Kosher', hint: 'Prepare accordingly' }, other: { label: 'Other', hint: 'Tell us more' } },
    avoidFood: { 'no-pork': 'No pork', 'no-beef': 'No beef', 'no-poultry': 'No poultry', 'no-seafood': 'No seafood', 'no-offal': 'No offal' },
    preference: { 'less-oil': 'Less oil', 'less-salt': 'Less salt', 'less-sugar': 'Less sugar', 'no-cilantro': 'No cilantro', 'no-scallion': 'No scallion', 'no-garlic': 'No garlic', 'no-raw': 'No raw food', 'well-cooked': 'Well-cooked', boneless: 'Prefer boneless' },
  },
  ko: {
    dietStyle: { none: { label: '제한 없음', hint: '모든 음식을 먹어요' }, vegetarian: { label: '채식', hint: '고기와 해산물 없음' }, vegan: { label: '비건', hint: '동물성 식품 없음' }, lacto: { label: '락토 채식', hint: '유제품은 가능' }, ovo: { label: '오보 채식', hint: '달걀은 가능' }, 'lacto-ovo': { label: '락토 오보 채식', hint: '유제품과 달걀 가능' }, pescatarian: { label: '페스코', hint: '생선과 해산물 가능' }, flexitarian: { label: '플렉시테리언', hint: '주로 식물성 식단' } },
    faithDiet: { none: { label: '없음', hint: '종교적 제한 없음' }, halal: { label: '할랄', hint: '기준에 맞게 준비' }, kosher: { label: '코셔', hint: '기준에 맞게 준비' }, other: { label: '기타', hint: '더 알려주세요' } },
    avoidFood: { 'no-pork': '돼지고기 없음', 'no-beef': '소고기 없음', 'no-poultry': '가금류 없음', 'no-seafood': '해산물 없음', 'no-offal': '내장 없음' },
    preference: { 'less-oil': '기름 적게', 'less-salt': '소금 적게', 'less-sugar': '설탕 적게', 'no-cilantro': '고수 없음', 'no-scallion': '파 없음', 'no-garlic': '마늘 없음', 'no-raw': '날것 제외', 'well-cooked': '충분히 익히기', boneless: '뼈 없는 음식' },
  },
  ja: {
    dietStyle: { none: { label: '制限なし', hint: '何でも食べます' }, vegetarian: { label: 'ベジタリアン', hint: '肉と魚介類なし' }, vegan: { label: 'ヴィーガン', hint: '動物性食品なし' }, lacto: { label: 'ラクト・ベジタリアン', hint: '乳製品は可' }, ovo: { label: 'オボ・ベジタリアン', hint: '卵は可' }, 'lacto-ovo': { label: 'ラクト・オボ・ベジタリアン', hint: '乳製品と卵は可' }, pescatarian: { label: 'ペスカタリアン', hint: '魚介類は可' }, flexitarian: { label: 'フレキシタリアン', hint: '主に植物性' } },
    faithDiet: { none: { label: 'なし', hint: '宗教上の条件なし' }, halal: { label: 'ハラール', hint: '基準に合わせて調理' }, kosher: { label: 'コーシャ', hint: '基準に合わせて調理' }, other: { label: 'その他', hint: '詳しく教えてください' } },
    avoidFood: { 'no-pork': '豚肉なし', 'no-beef': '牛肉なし', 'no-poultry': '鶏肉なし', 'no-seafood': '魚介類なし', 'no-offal': '内臓なし' },
    preference: { 'less-oil': '油少なめ', 'less-salt': '塩分少なめ', 'less-sugar': '砂糖少なめ', 'no-cilantro': 'パクチーなし', 'no-scallion': 'ねぎなし', 'no-garlic': 'にんにくなし', 'no-raw': '生ものなし', 'well-cooked': 'よく火を通す', boneless: '骨なし希望' },
  },
  ru: {
    dietStyle: { none: { label: 'Без ограничений', hint: 'Ем всё' }, vegetarian: { label: 'Вегетарианское', hint: 'Без мяса и морепродуктов' }, vegan: { label: 'Веганское', hint: 'Без продуктов животного происхождения' }, lacto: { label: 'Лакто-вегетарианское', hint: 'Молочные продукты разрешены' }, ovo: { label: 'Ово-вегетарианское', hint: 'Яйца разрешены' }, 'lacto-ovo': { label: 'Лакто-ово-вегетарианское', hint: 'Молочные продукты и яйца разрешены' }, pescatarian: { label: 'Пескетарианское', hint: 'Рыба и морепродукты разрешены' }, flexitarian: { label: 'Флекситарианское', hint: 'В основном растительная пища' } },
    faithDiet: { none: { label: 'Нет', hint: 'Нет религиозных правил' }, halal: { label: 'Халяль', hint: 'Готовить по правилам' }, kosher: { label: 'Кошерное', hint: 'Готовить по правилам' }, other: { label: 'Другое', hint: 'Расскажите подробнее' } },
    avoidFood: { 'no-pork': 'Без свинины', 'no-beef': 'Без говядины', 'no-poultry': 'Без птицы', 'no-seafood': 'Без морепродуктов', 'no-offal': 'Без субпродуктов' },
    preference: { 'less-oil': 'Меньше масла', 'less-salt': 'Меньше соли', 'less-sugar': 'Меньше сахара', 'no-cilantro': 'Без кинзы', 'no-scallion': 'Без зелёного лука', 'no-garlic': 'Без чеснока', 'no-raw': 'Без сырого', 'well-cooked': 'Хорошо прожарить', boneless: 'Лучше без костей' },
  },
  es: {
    dietStyle: { none: { label: 'Sin restricciones', hint: 'Como de todo' }, vegetarian: { label: 'Vegetariano', hint: 'Sin carne ni marisco' }, vegan: { label: 'Vegano', hint: 'Sin productos animales' }, lacto: { label: 'Lacto-vegetariano', hint: 'Los lácteos están permitidos' }, ovo: { label: 'Ovo-vegetariano', hint: 'Los huevos están permitidos' }, 'lacto-ovo': { label: 'Lacto-ovo vegetariano', hint: 'Lácteos y huevos permitidos' }, pescatarian: { label: 'Pescetariano', hint: 'Pescado y marisco permitidos' }, flexitarian: { label: 'Flexitariano', hint: 'Principalmente vegetal' } },
    faithDiet: { none: { label: 'Ninguno', hint: 'Sin requisito religioso' }, halal: { label: 'Halal', hint: 'Preparar según corresponda' }, kosher: { label: 'Kosher', hint: 'Preparar según corresponda' }, other: { label: 'Otro', hint: 'Cuéntanos más' } },
    avoidFood: { 'no-pork': 'Sin cerdo', 'no-beef': 'Sin ternera', 'no-poultry': 'Sin aves', 'no-seafood': 'Sin marisco', 'no-offal': 'Sin vísceras' },
    preference: { 'less-oil': 'Menos aceite', 'less-salt': 'Menos sal', 'less-sugar': 'Menos azúcar', 'no-cilantro': 'Sin cilantro', 'no-scallion': 'Sin cebolleta', 'no-garlic': 'Sin ajo', 'no-raw': 'Sin alimentos crudos', 'well-cooked': 'Bien cocinado', boneless: 'Preferible sin huesos' },
  },
  it: {
    dietStyle: { none: { label: 'Nessuna restrizione', hint: 'Mangio tutto' }, vegetarian: { label: 'Vegetariano', hint: 'Niente carne o frutti di mare' }, vegan: { label: 'Vegano', hint: 'Niente prodotti animali' }, lacto: { label: 'Latto-vegetariano', hint: 'I latticini sono ammessi' }, ovo: { label: 'Ovo-vegetariano', hint: 'Le uova sono ammesse' }, 'lacto-ovo': { label: 'Latto-ovo vegetariano', hint: 'Latticini e uova ammessi' }, pescatarian: { label: 'Pescetariano', hint: 'Pesce e frutti di mare ammessi' }, flexitarian: { label: 'Flexitariano', hint: 'Prevalentemente vegetale' } },
    faithDiet: { none: { label: 'Nessuna', hint: 'Nessuna regola religiosa' }, halal: { label: 'Halal', hint: 'Preparare di conseguenza' }, kosher: { label: 'Kosher', hint: 'Preparare di conseguenza' }, other: { label: 'Altro', hint: 'Dicci di più' } },
    avoidFood: { 'no-pork': 'Senza maiale', 'no-beef': 'Senza manzo', 'no-poultry': 'Senza pollame', 'no-seafood': 'Senza frutti di mare', 'no-offal': 'Senza frattaglie' },
    preference: { 'less-oil': 'Meno olio', 'less-salt': 'Meno sale', 'less-sugar': 'Meno zucchero', 'no-cilantro': 'Senza coriandolo', 'no-scallion': 'Senza cipollotto', 'no-garlic': 'Senza aglio', 'no-raw': 'Niente crudo', 'well-cooked': 'Ben cotto', boneless: 'Preferibilmente senza ossa' },
  },
}
const dietStyleIds: string[] = [...dietStyleOptions.map((item) => item.id).filter((id) => id !== 'none'), 'vegetarian']
const faithDietIds: string[] = faithDietOptions.map((item) => item.id).filter((id) => id !== 'none' && id !== 'other')
const avoidFoodIds = avoidFoodOptions.map((item) => item.id)

const choiceTranslations: Record<Language, Record<string, string>> = {
  en: { peanut: 'Peanut', 'tree-nut': 'Tree nuts', milk: 'Milk / dairy', egg: 'Egg', fish: 'Fish', shellfish: 'Shellfish', wheat: 'Wheat / gluten', soy: 'Soy', sesame: 'Sesame', vegetarian: 'Vegetarian', vegan: 'Vegan', 'no-pork': 'No pork', 'no-beef': 'No beef', mild: 'Keep it mild', 'no-offal': 'No offal', 'no-cilantro': 'No cilantro', 'no-raw': 'No raw food', boneless: 'Prefer boneless' },
  ko: { peanut: '땅콩', 'tree-nut': '견과류', milk: '우유 / 유제품', egg: '달걀', fish: '생선', shellfish: '갑각류', wheat: '밀 / 글루텐', soy: '대두', sesame: '참깨', vegetarian: '채식', vegan: '비건', 'no-pork': '돼지고기 없음', 'no-beef': '소고기 없음', mild: '맵지 않게', 'no-offal': '내장 없음', 'no-cilantro': '고수 없음', 'no-raw': '생식 없음', boneless: '뼈 없는 음식' },
  ja: { peanut: 'ピーナッツ', 'tree-nut': '木の実', milk: '乳製品', egg: '卵', fish: '魚', shellfish: '甲殻類', wheat: '小麦 / グルテン', soy: '大豆', sesame: 'ごま', vegetarian: 'ベジタリアン', vegan: 'ヴィーガン', 'no-pork': '豚肉なし', 'no-beef': '牛肉なし', mild: '辛さ控えめ', 'no-offal': '内臓なし', 'no-cilantro': 'パクチーなし', 'no-raw': '生ものなし', boneless: '骨なし希望' },
  ru: { peanut: 'Арахис', 'tree-nut': 'Орехи', milk: 'Молоко / молочные продукты', egg: 'Яйца', fish: 'Рыба', shellfish: 'Моллюски', wheat: 'Пшеница / глютен', soy: 'Соя', sesame: 'Кунжут', vegetarian: 'Вегетарианское', vegan: 'Веганское', 'no-pork': 'Без свинины', 'no-beef': 'Без говядины', mild: 'Не острое', 'no-offal': 'Без субпродуктов', 'no-cilantro': 'Без кинзы', 'no-raw': 'Без сырого', boneless: 'Лучше без костей' },
  es: { peanut: 'Cacahuete', 'tree-nut': 'Frutos secos', milk: 'Leche / lácteos', egg: 'Huevo', fish: 'Pescado', shellfish: 'Marisco', wheat: 'Trigo / gluten', soy: 'Soja', sesame: 'Sésamo', vegetarian: 'Vegetariano', vegan: 'Vegano', 'no-pork': 'Sin cerdo', 'no-beef': 'Sin ternera', mild: 'Suave', 'no-offal': 'Sin vísceras', 'no-cilantro': 'Sin cilantro', 'no-raw': 'Sin alimentos crudos', boneless: 'Preferible sin huesos' },
  it: { peanut: 'Arachidi', 'tree-nut': 'Frutta a guscio', milk: 'Latte / latticini', egg: 'Uovo', fish: 'Pesce', shellfish: 'Crostacei', wheat: 'Grano / glutine', soy: 'Soia', sesame: 'Sesamo', vegetarian: 'Vegetariano', vegan: 'Vegano', 'no-pork': 'Senza maiale', 'no-beef': 'Senza manzo', mild: 'Poco piccante', 'no-offal': 'Senza frattaglie', 'no-cilantro': 'Senza coriandolo', 'no-raw': 'Niente crudo', boneless: 'Preferibilmente senza ossa' },
}
const choiceLabel = (language: Language, id: string, fallback: string) => choiceTranslations[language][id] || fallback
const allergenTranslations: Record<Language, Record<string, string>> = {
  en: { wheat: 'Cereals containing gluten', crustacean: 'Crustaceans', egg: 'Eggs', soy: 'Soybeans', milk: 'Milk', 'tree-nut': 'Nuts', celery: 'Celery', fish: 'Fish', peanut: 'Peanuts', mustard: 'Mustard', sesame: 'Sesame', sulphites: 'Sulphur dioxide / sulphites', lupin: 'Lupin', mollusk: 'Molluscs', other: 'Other' },
  ko: { wheat: '글루텐 함유 곡물', crustacean: '갑각류', egg: '달걀', soy: '대두', milk: '우유', 'tree-nut': '견과류', celery: '셀러리', fish: '생선', peanut: '땅콩', mustard: '겨자', sesame: '참깨', sulphites: '이산화황 / 아황산염', lupin: '루핀', mollusk: '연체류', other: '기타' },
  ja: { wheat: 'グルテンを含む穀類', crustacean: '甲殻類', egg: '卵', soy: '大豆', milk: '乳', 'tree-nut': '木の実', celery: 'セロリ', fish: '魚', peanut: 'ピーナッツ', mustard: 'マスタード', sesame: 'ごま', sulphites: '二酸化硫黄 / 亜硫酸塩', lupin: 'ルピナス', mollusk: '軟体類', other: 'その他' },
  ru: { wheat: 'Злаки с глютеном', crustacean: 'Ракообразные', egg: 'Яйца', soy: 'Соя', milk: 'Молоко', 'tree-nut': 'Орехи', celery: 'Сельдерей', fish: 'Рыба', peanut: 'Арахис', mustard: 'Горчица', sesame: 'Кунжут', sulphites: 'Диоксид серы / сульфиты', lupin: 'Люпин', mollusk: 'Моллюски', other: 'Другое' },
  es: { wheat: 'Cereales con gluten', crustacean: 'Crustáceos', egg: 'Huevos', soy: 'Soja', milk: 'Leche', 'tree-nut': 'Frutos secos', celery: 'Apio', fish: 'Pescado', peanut: 'Cacahuetes', mustard: 'Mostaza', sesame: 'Sésamo', sulphites: 'Dióxido de azufre / sulfitos', lupin: 'Altramuces', mollusk: 'Moluscos', other: 'Otro' },
  it: { wheat: 'Cereali con glutine', crustacean: 'Crostacei', egg: 'Uova', soy: 'Soia', milk: 'Latte', 'tree-nut': 'Frutta a guscio', celery: 'Sedano', fish: 'Pesce', peanut: 'Arachidi', mustard: 'Senape', sesame: 'Sesamo', sulphites: 'Anidride solforosa / solfiti', lupin: 'Lupini', mollusk: 'Molluschi', other: 'Altro' },
}
const allergenLabel = (language: Language, id: string, fallback: string) => allergenTranslations[language][id] || choiceLabel(language, id, fallback)

const removeAllergenLabels: Record<Language, string> = {
  en: 'Remove allergen',
  ko: '알레르기 제거',
  ja: 'アレルゲンを削除',
  ru: 'Удалить аллерген',
  es: 'Eliminar alérgeno',
  it: 'Rimuovi allergene',
}

const defaultAllergyProfile: AllergyProfile = { severity: 'severe', crossContact: true }
const initialPassport: Passport = { allergies: [], otherAllergen: '', allergyProfiles: {}, diets: [], dietStyle: 'none', faithDiet: 'none', faithOther: '', avoidFoods: [], preferences: [], spiceLevel: null, severity: 'severe', crossContact: true }
type StoredAccount = { profile: UserProfile; passport: Passport }

const blankPassport = (): Passport => ({ ...initialPassport, allergies: [], allergyProfiles: {}, diets: [], avoidFoods: [], preferences: [] })
const hydratePassport = (saved?: Partial<Passport> | null): Passport => {
  if (!saved) return blankPassport()
  const legacyProfile = { severity: saved.severity || defaultAllergyProfile.severity, crossContact: saved.crossContact ?? defaultAllergyProfile.crossContact }
  const migratedProfiles = Object.fromEntries((saved.allergies || []).map((id) => [id, legacyProfile]))
  const storedDietStyle = saved.dietStyle === 'vegetarian' ? 'lacto-ovo' : saved.dietStyle
  const legacyDietStyle = storedDietStyle || (saved.diets?.includes('vegan') ? 'vegan' : saved.diets?.includes('vegetarian') ? 'lacto-ovo' : 'none')
  const legacyDiets = (saved.diets || []).map((id) => id === 'vegetarian' ? 'lacto-ovo' : id)
  const legacyAvoidFoods = saved.avoidFoods || (saved.diets || []).filter((id) => avoidFoodIds.includes(id))
  const legacySpiceLevel = saved.spiceLevel ?? (saved.preferences?.includes('mild') ? 1 : null)
  const stored = { ...saved } as Partial<Passport> & { otherAvoidFood?: string }
  delete stored.otherAvoidFood
  return { ...initialPassport, ...stored, diets: legacyDiets, dietStyle: legacyDietStyle, faithDiet: saved.faithDiet || 'none', faithOther: saved.faithOther || '', avoidFoods: legacyAvoidFoods, spiceLevel: legacySpiceLevel, allergyProfiles: { ...migratedProfiles, ...(saved.allergyProfiles || {}) } } as Passport
}
const normalizeStoredProfile = (profile?: Partial<UserProfile> | null): UserProfile | null => {
  if (!profile?.username || !profile.email) return null
  const expiresAt = typeof profile.subscriptionExpiresAt === 'number' ? profile.subscriptionExpiresAt : null
  const activePro = profile.subscriptionTier === 'pro' && (!expiresAt || expiresAt > Date.now())
  return {
    username: String(profile.username),
    email: String(profile.email),
    ...(typeof profile.avatarSrc === 'string' && profile.avatarSrc ? { avatarSrc: profile.avatarSrc } : {}),
    subscriptionTier: activePro ? 'pro' : 'free',
    subscriptionExpiresAt: activePro ? expiresAt : null,
    ...(typeof profile.subscriptionPlanDays === 'number' ? { subscriptionPlanDays: profile.subscriptionPlanDays } : {}),
  }
}
const readStoredAccounts = (): StoredAccount[] => {
  try {
    const saved = JSON.parse(localStorage.getItem('cit:accounts') || '') as Array<{ profile?: Partial<UserProfile>; passport?: Partial<Passport> }>
    if (Array.isArray(saved)) return saved.flatMap((record) => { const profile = normalizeStoredProfile(record.profile); return profile ? [{ profile, passport: hydratePassport(record.passport) }] : [] })
  } catch { /* Fall back to the original single-account storage below. */ }
  try {
    const profile = normalizeStoredProfile(JSON.parse(localStorage.getItem('cit:account') || 'null') as Partial<UserProfile>)
    if (!profile) return []
    return [{ profile, passport: hydratePassport(JSON.parse(localStorage.getItem('cit:passport') || 'null') as Partial<Passport>) }]
  } catch { return [] }
}
const getActiveStoredAccount = (): StoredAccount | null => {
  const accounts = readStoredAccounts()
  try {
    const active = JSON.parse(localStorage.getItem('cit:account') || 'null') as Partial<UserProfile>
    return accounts.find((record) => record.profile.email.trim().toLowerCase() === active.email?.trim().toLowerCase()) || accounts[0] || null
  } catch { return accounts[0] || null }
}
const normalizeEmail = (email: string) => email.trim().toLowerCase()
const readStoredInvites = (): CompanionInvite[] => {
  try {
    const saved = JSON.parse(localStorage.getItem('cit:companion-invites') || '') as CompanionInvite[]
    return Array.isArray(saved) ? saved.filter((invite) => invite && typeof invite.id === 'string' && typeof invite.fromEmail === 'string' && typeof invite.toEmail === 'string') : []
  } catch { return [] }
}
const initialsForProfile = (profile: UserProfile) => profile.username.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || profile.email.slice(0, 2).toUpperCase()
const initialsForRestaurant = (name: string) => name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'RS'
const passportSummary = (passport: Passport) => {
  const parts: string[] = []
  if (passport.allergies.length + (passport.otherAllergen ? 1 : 0)) parts.push(`${passport.allergies.length + (passport.otherAllergen ? 1 : 0)} allergen${passport.allergies.length + (passport.otherAllergen ? 1 : 0) === 1 ? '' : 's'}`)
  if (passport.dietStyle !== 'none') parts.push(passport.dietStyle)
  if (passport.avoidFoods.length) parts.push(`${passport.avoidFoods.length} food rule${passport.avoidFoods.length === 1 ? '' : 's'}`)
  if (passport.spiceLevel !== null) parts.push('spice preference')
  return parts.length ? parts.join(' · ') : 'No restrictions shared'
}
const companionViewsFor = (email: string, accounts: StoredAccount[], invites: CompanionInvite[]): Companion[] => {
  const normalizedEmail = normalizeEmail(email)
  return invites.filter((invite) => invite.status === 'accepted' && (normalizeEmail(invite.fromEmail) === normalizedEmail || normalizeEmail(invite.toEmail) === normalizedEmail)).flatMap((invite) => {
    const otherEmail = normalizeEmail(invite.fromEmail) === normalizedEmail ? normalizeEmail(invite.toEmail) : normalizeEmail(invite.fromEmail)
    const other = accounts.find((record) => normalizeEmail(record.profile.email) === otherEmail)
    if (!other) return []
    return [{ id: otherEmail, name: other.profile.username, email: otherEmail, initials: initialsForProfile(other.profile), passport: other.passport, note: passportSummary(other.passport), inviteId: invite.id }]
  })
}

const restaurantCatalog: SavedRestaurant[] = [
  { id: 'zuihuihuang-fudan-zhengli', name: '醉辉皇 · 复旦管院政立院区店', initials: '醉', emoji: '🦐', cuisine: '本帮 / 海鲜 · 商务聚餐', location: '政立院区内 · 约 0.1 km', why: 'Closest option; ask about seafood, stock and shared cookware', tone: 'photo-one', intents: ['not-spicy'], rating: 4.6, distanceKm: 0.1, address: '政立路558号复旦大学管理学院政立院区', source: '百度地图 / Fudan campus listing', photoSrc: '/restaurant-photos/seafood.svg' },
  { id: 'haerbin-snacks-zhengli', name: '哈尔滨风味小吃（政立路）', initials: '哈', emoji: '🥟', cuisine: '东北菜 · 饺子 / 面食 / 家常菜', location: '政立路499号 · 约 0.3 km', why: 'Dumplings and noodles are easy to inspect ingredient-by-ingredient', tone: 'photo-two', intents: ['dumplings', 'noodles'], rating: 4.3, distanceKm: 0.3, address: '政立路499号（近国定路）', source: '公开餐厅目录 / 大众点评线索', photoSrc: '/restaurant-photos/noodles.svg' },
  { id: 'he-sheng-hui-fei-dachu', name: '费大厨辣椒炒肉（合生汇店）', initials: '费', emoji: '🌶️', cuisine: '湘菜 · 小炒 / 下饭菜', location: '合生汇商圈 · 约 1.7 km', why: 'Clearly categorized; spice and pork are visible decision points', tone: 'photo-three', intents: ['not-spicy'], rating: 4.5, distanceKm: 1.7, address: '翔殷路1099号合生汇商场内', source: '五角场公开榜单 / 大众点评线索', photoSrc: '/restaurant-photos/hotpot.svg' },
  { id: 'he-xie-bang-cuisine', name: '蟹榭 · 本帮江浙菜（合生汇店）', initials: '蟹', emoji: '🦀', cuisine: '本帮 / 江浙菜 · 蟹粉 / 小笼', location: '合生汇商圈 · 约 1.7 km', why: 'Good test case for crustacean, egg and wheat warnings', tone: 'photo-one', intents: ['dumplings', 'not-spicy'], rating: 4.5, distanceKm: 1.7, address: '翔殷路1099号合生汇商场内', source: '五角场公开榜单 / 大众点评线索', photoSrc: '/restaurant-photos/seafood.svg' },
  { id: 'ruyi-chicken-abalone', name: '如一鸡鲍鱼 · 粤式煲汤（合生汇店）', initials: '如', emoji: '🍲', cuisine: '粤菜 · 汤 / 煲 / 海鲜', location: '合生汇商圈 · 约 1.7 km', why: 'Soup-base ingredients can be surfaced as confirmation points', tone: 'photo-two', intents: ['not-spicy'], rating: 4.7, distanceKm: 1.7, address: '翔殷路1099号合生汇商场内', source: '五角场公开榜单 / 大众点评线索', photoSrc: '/restaurant-photos/seafood.svg' },
  { id: 'haidilao-he-sheng-hui', name: '海底捞火锅（合生汇商圈）', initials: '海', emoji: '🥘', cuisine: '四川火锅 · 火锅 / 聚餐', location: '合生汇商圈 · 约 1.8 km', why: 'Broth, dipping sauce, sesame and cross-contact are easy to explain', tone: 'photo-one', intents: ['hot-pot'], rating: 4.6, distanceKm: 1.8, address: '合生汇商圈内（到店前请核对具体门店）', source: '公开地图餐饮列表 / 大众点评线索', photoSrc: '/restaurant-photos/hotpot.svg' },
  { id: 'kaijiang-grilled-fish', name: '烤匠川渝烤鱼（五角场）', initials: '烤', emoji: '🐟', cuisine: '川渝菜 · 烤鱼 / 辣味', location: '五角场商圈 · 约 2.0 km', why: 'Useful for fish, soy sauce, sesame and chili checks', tone: 'photo-three', intents: ['not-spicy'], rating: 4.4, distanceKm: 2.0, address: '五角场商圈门店（到店前请核对具体楼层）', source: '五角场公开榜单 / 大众点评线索', photoSrc: '/restaurant-photos/seafood.svg' },
  { id: 'zuoting-youyuan-hotpot', name: '左庭右院鲜牛肉火锅（五角场）', initials: '左', emoji: '🍲', cuisine: '潮汕火锅 · 牛肉 / 火锅', location: '五角场商圈 · 约 2.1 km', why: 'Hot-pot broth and shared utensils need explicit confirmation', tone: 'photo-one', intents: ['hot-pot', 'not-spicy'], rating: 4.5, distanceKm: 2.1, address: '五角场商圈门店（到店前请核对具体楼层）', source: '五角场夜宵公开榜单 / 大众点评线索', photoSrc: '/restaurant-photos/hotpot.svg' },
  { id: 'dongfang-yichuan', name: '东方一串（国定东路店）', initials: '东', emoji: '🍢', cuisine: '烧烤 / 烤鱼 · 夜宵', location: '国定东路 · 约 2.2 km', why: 'Grill oil, seafood and spice are the main confirmation points', tone: 'photo-two', intents: ['not-spicy'], rating: 4.2, distanceKm: 2.2, address: '国定东路附近（到店前请核对具体门牌）', source: '五角场夜宵公开榜单 / 大众点评线索', photoSrc: '/restaurant-photos/hotpot.svg' },
  { id: 'jiejiao-taiwanese', name: '捡角台湾食堂（五角场）', initials: '捡', emoji: '🍜', cuisine: '台湾小吃 · 卤味 / 面 / 小食', location: '五角场商圈 · 约 2.3 km', why: 'Rice, noodles and braised toppings make a clear demo path', tone: 'photo-three', intents: ['noodles', 'not-spicy'], rating: 4.4, distanceKm: 2.3, address: '五角场商圈门店（到店前请核对具体楼层）', source: '五角场公开榜单 / 大众点评线索', photoSrc: '/restaurant-photos/noodles.svg' },
  { id: 'old-town-kitchen', name: 'Old Town Kitchen', initials: 'OT', emoji: '🏮', cuisine: '本帮菜 · Shanghai home-style', location: 'Shanghai · 1.2 km', why: 'Clear dishes and mild options', tone: 'photo-one' },
  { id: 'green-bamboo-house', name: 'Green Bamboo House', initials: 'GB', emoji: '🍵', cuisine: '素食 · Tea house', location: 'Shanghai · 1.8 km', why: 'Lighter flavors for your passport', tone: 'photo-two' },
  { id: 'lotus-table', name: 'Lotus Table', initials: 'LT', emoji: '🥢', cuisine: '粤菜 · Seasonal small plates', location: 'Shanghai · 2.4 km', why: 'Vegetarian dishes are clearly marked', tone: 'photo-three' },
  { id: 'red-lantern-hotpot', name: 'Red Lantern Hotpot', initials: 'RL', emoji: '🔥', cuisine: '火锅 · Mushroom broth', location: 'Shanghai · 2.7 km', why: 'Broths and add-ons are easy to compare', tone: 'photo-four' },
  { id: 'pepper-alley', name: 'Pepper Alley', initials: 'PA', emoji: '🌶️', cuisine: '川菜 · Bold flavors', location: 'Shanghai · 3.1 km', why: 'Great menu notes for spice lovers', tone: 'photo-five' },
  { id: 'jade-soup-dumpling', name: 'Jade Soup Dumpling', initials: 'JS', emoji: '🥟', cuisine: '小吃 · Soup dumplings', location: 'Shanghai · 3.4 km', why: 'A quick local classic near the metro', tone: 'photo-six' },
  { id: 'west-lake-tea-room', name: 'West Lake Tea Room', initials: 'WL', emoji: '🫖', cuisine: '江浙菜 · Tea pairings', location: 'Shanghai · 3.8 km', why: 'Gentle flavors and a calm dining room', tone: 'photo-seven' },
  { id: 'charcoal-yard', name: 'Charcoal Yard', initials: 'CY', emoji: '🍢', cuisine: '烧烤 · Late-night bites', location: 'Shanghai · 4.2 km', why: 'Small portions make sharing simple', tone: 'photo-eight' },
]
const initialSavedRestaurants = restaurantCatalog.slice(0, 2)

const foodCategories = [
  { id: 'all', label: '全部' },
  { id: 'local', label: '本帮菜' },
  { id: 'hotpot', label: '火锅' },
  { id: 'sichuan', label: '川菜' },
  { id: 'snacks', label: '小吃' },
  { id: 'cantonese', label: '粤菜' },
  { id: 'vegetarian', label: '素食' },
  { id: 'bbq', label: '烧烤' },
]

const homeRestaurantImageSrc: Record<string, string> = {
  'zuihuihuang-fudan-zhengli': '/dish-photos/red-lantern-signature.png',
  'haerbin-snacks-zhengli': '/dish-photos/jade-soup-dumpling-signature.png',
  'he-sheng-hui-fei-dachu': '/dish-photos/pepper-alley-signature.png',
  'he-xie-bang-cuisine': '/dish-photos/jade-soup-dumpling-signature.png',
  'ruyi-chicken-abalone': '/dish-photos/winter-melon-soup.png',
  'haidilao-he-sheng-hui': '/dish-photos/red-lantern-signature.png',
  'kaijiang-grilled-fish': '/dish-photos/pepper-alley-signature.png',
  'zuoting-youyuan-hotpot': '/dish-photos/red-lantern-signature.png',
  'dongfang-yichuan': '/dish-photos/pepper-alley-signature.png',
  'jiejiao-taiwanese': '/dish-photos/kung-pao.png',
}
type HomeCopy = {
  scanKicker: string
  scanTitle: string
  scanDescription: string
  takePhoto: string
  uploadFromFile: string
  scanHint: string
  ongoingSession: string
  nearbyFood: string
  nearbyDescription: string
  location: string
  featured: string
  distance: string
  restaurantPhotoAlt: string
}
const homeCopy: Record<Language, HomeCopy> = {
  en: { scanKicker: 'SCAN YOUR MENU', scanTitle: 'Make every menu easier to read.', scanDescription: 'Take a photo or upload a menu to see dishes, ingredients and Food Passport checks in one place.', takePhoto: 'Take a photo', uploadFromFile: 'Upload from file', scanHint: 'Your menu stays attached to this dining session.', ongoingSession: 'Ongoing session', nearbyFood: 'Nearby food', nearbyDescription: 'Real dishes from restaurants around Fudan Zhengli campus.', location: 'Fudan · within 3 km', featured: 'Featured', distance: 'away', restaurantPhotoAlt: 'Featured dish at' },
  ko: { scanKicker: '메뉴 스캔', scanTitle: '모든 메뉴를 더 쉽게 읽어 보세요.', scanDescription: '메뉴를 촬영하거나 업로드하면 음식, 재료와 푸드 패스포트 확인 결과를 한곳에서 볼 수 있어요.', takePhoto: '사진 촬영', uploadFromFile: '파일에서 업로드', scanHint: '메뉴는 현재 식사 세션에 연결됩니다.', ongoingSession: '진행 중인 세션', nearbyFood: '주변 음식', nearbyDescription: '푸단 정리 캠퍼스 주변 식당의 실제 메뉴예요.', location: '푸단 · 3km 이내', featured: '대표 메뉴', distance: '거리', restaurantPhotoAlt: '대표 메뉴' },
  ja: { scanKicker: 'メニューをスキャン', scanTitle: 'どんなメニューも読みやすく。', scanDescription: '写真を撮るかアップロードすると、料理・食材・フードパスポートの確認結果をまとめて見られます。', takePhoto: '写真を撮る', uploadFromFile: 'ファイルからアップロード', scanHint: 'メニューは現在の食事セッションに保存されます。', ongoingSession: '進行中のセッション', nearbyFood: '近くの料理', nearbyDescription: '復旦・政立キャンパス周辺の実際の料理です。', location: '復旦 · 3km以内', featured: 'おすすめ', distance: '距離', restaurantPhotoAlt: 'おすすめ料理' },
  ru: { scanKicker: 'СКАНИРОВАТЬ МЕНЮ', scanTitle: 'Читайте любое меню проще.', scanDescription: 'Сфотографируйте или загрузите меню, чтобы увидеть блюда, ингредиенты и проверки пищевого паспорта.', takePhoto: 'Сфотографировать', uploadFromFile: 'Загрузить файл', scanHint: 'Меню сохранится в текущей сессии.', ongoingSession: 'Текущая сессия', nearbyFood: 'Еда рядом', nearbyDescription: 'Настоящие блюда из ресторанов у кампуса Фудань на Чжэнли.', location: 'Фудань · до 3 км', featured: 'Рекомендуем', distance: 'расстояние', restaurantPhotoAlt: 'Рекомендуемое блюдо' },
  es: { scanKicker: 'ESCANEA TU MENÚ', scanTitle: 'Lee cualquier menú con más claridad.', scanDescription: 'Haz una foto o sube un menú para ver platos, ingredientes y comprobaciones de tu pasaporte en un solo lugar.', takePhoto: 'Hacer una foto', uploadFromFile: 'Subir desde archivo', scanHint: 'El menú queda guardado en esta sesión.', ongoingSession: 'Sesión en curso', nearbyFood: 'Comida cercana', nearbyDescription: 'Platos reales de restaurantes alrededor del campus Fudan Zhengli.', location: 'Fudan · hasta 3 km', featured: 'Recomendado', distance: 'distancia', restaurantPhotoAlt: 'Plato recomendado en' },
  it: { scanKicker: 'SCANSIONA IL MENU', scanTitle: 'Leggi ogni menu più facilmente.', scanDescription: 'Scatta una foto o carica un menu per vedere piatti, ingredienti e controlli del Food Passport in un solo posto.', takePhoto: 'Scatta una foto', uploadFromFile: 'Carica da file', scanHint: 'Il menu resta collegato a questa sessione.', ongoingSession: 'Sessione in corso', nearbyFood: 'Cibo vicino', nearbyDescription: 'Piatti reali dai ristoranti intorno al campus Fudan Zhengli.', location: 'Fudan · entro 3 km', featured: 'In evidenza', distance: 'distanza', restaurantPhotoAlt: 'Piatto in evidenza da' },
}

const foodPosts: FoodPost[] = [
  { id: 'post-01', restaurantId: 'old-town-kitchen', category: 'local', categoryLabel: '本帮菜', author: 'Mia Chen', initials: 'MC', avatarTone: 'avatar-coral', time: '18 min ago', title: 'The kind of Shanghai comfort food you remember', body: 'Sticky ribs, sweet quail eggs and a bowl that smells like toasted soy. This is the place I would bring someone trying Shanghai flavors for the first time.', dish: 'Soy-glazed pork ribs', dishMeta: 'Caramelized · savory · ¥58', imageSrc: '/dish-photos/old-town-kitchen-signature.png', imageTone: 'feed-image-coral', likes: 128, comments: 12 },
  { id: 'post-02', restaurantId: 'red-lantern-hotpot', category: 'hotpot', categoryLabel: '火锅', author: 'Leo Huang', initials: 'LH', avatarTone: 'avatar-olive', time: '42 min ago', title: 'A hotpot signature that skips the usual soup base', body: 'The prawns arrive sizzling in mala butter with lotus seeds and peanuts. Rich, smoky and perfect for a group that wants something to share.', dish: 'Mala butter prawns', dishMeta: 'Smoky · numbing · ¥88', imageSrc: '/dish-photos/red-lantern-signature.png', imageTone: 'feed-image-olive', likes: 96, comments: 8 },
  { id: 'post-03', restaurantId: 'pepper-alley', category: 'sichuan', categoryLabel: '川菜', author: 'Jun Park', initials: 'JP', avatarTone: 'avatar-purple', time: '1 hr ago', title: 'The dry-pot prawn plate with real attitude', body: 'Crisp prawns, celery and peppercorns keep every bite lively. The heat builds slowly, so order rice before the pan lands on the table.', dish: 'Sichuan dry-pot prawns', dishMeta: 'Crisp · spicy · ¥72', imageSrc: '/dish-photos/pepper-alley-signature.png', imageTone: 'feed-image-red', likes: 214, comments: 21 },
  { id: 'post-04', restaurantId: 'jade-soup-dumpling', category: 'snacks', categoryLabel: '小吃', author: 'Sofia Rossi', initials: 'SR', avatarTone: 'avatar-yellow', time: '2 hrs ago', title: 'The breakfast order with the best crispy bottoms', body: 'These pan-fried buns are soft on top and deeply golden underneath. Add black vinegar and eat them while the skillet is still warm.', dish: 'Pan-fried pork buns', dishMeta: 'Crisp · juicy · ¥24 / skillet', imageSrc: '/dish-photos/jade-soup-dumpling-signature.png', imageTone: 'feed-image-gold', likes: 171, comments: 14 },
  { id: 'post-05', restaurantId: 'lotus-table', category: 'cantonese', categoryLabel: '粤菜', author: 'Nora Li', initials: 'NL', avatarTone: 'avatar-green', time: '3 hrs ago', title: 'A tea-house plate that is all about crunch', body: 'The shrimp-and-taro rolls have a delicate web of crisp wrapper and a bright citrus dip. A small plate, but very hard to share.', dish: 'Crisp shrimp-taro rolls', dishMeta: 'Lacy · citrusy · ¥46', imageSrc: '/dish-photos/lotus-table-signature.png', imageTone: 'feed-image-green', likes: 88, comments: 6 },
  { id: 'post-06', restaurantId: 'green-bamboo-house', category: 'vegetarian', categoryLabel: '素食', author: 'Alex Wu', initials: 'AW', avatarTone: 'avatar-blue', time: '5 hrs ago', title: 'A soft, floral finish with a pot of tea', body: 'The sticky rice cake is fragrant without being too sweet, with roasted chestnuts tucked through every slice. Best shared slowly with osmanthus tea.', dish: 'Osmanthus chestnut rice cake', dishMeta: 'Chewy · floral · ¥32', imageSrc: '/dish-photos/green-bamboo-signature.png', imageTone: 'feed-image-blue', likes: 143, comments: 17 },
  { id: 'post-07', restaurantId: 'west-lake-tea-room', category: 'local', categoryLabel: '江浙菜', author: 'Ethan Kim', initials: 'EK', avatarTone: 'avatar-sand', time: 'Yesterday', title: 'Longjing tea in the most savory form', body: 'The tea-smoked chicken is tender, fragrant and served with slices of pear. The window seats make this an easy afternoon escape.', dish: 'Longjing tea-smoked chicken', dishMeta: 'Tender · aromatic · ¥68', imageSrc: '/dish-photos/west-lake-signature.png', imageTone: 'feed-image-sand', likes: 67, comments: 4 },
  { id: 'post-08', restaurantId: 'charcoal-yard', category: 'bbq', categoryLabel: '烧烤', author: 'Rina Ito', initials: 'RI', avatarTone: 'avatar-night', time: 'Yesterday', title: 'Cumin lamb and ember smoke after dark', body: 'The lamb has a proper char and the king oyster mushrooms soak up all the grill flavor. A great late-night order for a table that likes to share.', dish: 'Cumin charcoal lamb skewers', dishMeta: 'Smoky · juicy · ¥48 / 6 skewers', imageSrc: '/dish-photos/charcoal-yard-signature.png', imageTone: 'feed-image-night', likes: 119, comments: 9 },
]

type RestaurantText = Pick<SavedRestaurant, 'cuisine' | 'location' | 'why'> & { name?: string }
const restaurantTextTranslations: Record<Language, Record<string, RestaurantText>> = {
  en: {
    'zuihuihuang-fudan-zhengli': { name: 'Zuihuihuang · Fudan School of Management', cuisine: 'Shanghai · seafood · business dining', location: 'Fudan Zhengli campus · about 0.1 km', why: 'Closest option; ask about seafood, stock and shared cookware' },
    'haerbin-snacks-zhengli': { name: 'Harbin-style Snacks · Zhengli Road', cuisine: 'Northeastern Chinese · dumplings / noodles / home-style', location: 'Zhengli Road · about 0.3 km', why: 'Dumplings and noodles are easy to inspect ingredient by ingredient' },
    'he-sheng-hui-fei-dachu': { name: 'Fei Dachu Chili Pork · Hopson One', cuisine: 'Hunan cuisine · stir-fries / rice-friendly dishes', location: 'Hopson One · about 1.7 km', why: 'Spice and pork are clear decision points' },
    'he-xie-bang-cuisine': { name: 'Xiexie · Shanghai & Jiangnan Cuisine', cuisine: 'Shanghai & Jiangnan · crab roe / soup dumplings', location: 'Hopson One · about 1.7 km', why: 'A useful check for crustacean, egg and wheat warnings' },
    'ruyi-chicken-abalone': { name: 'Ruyi Chicken & Abalone · Cantonese Soup', cuisine: 'Cantonese · soups / clay pots / seafood', location: 'Hopson One · about 1.7 km', why: 'Soup-base ingredients can be surfaced for confirmation' },
    'haidilao-he-sheng-hui': { name: 'Haidilao Hot Pot · Hopson One', cuisine: 'Sichuan hot pot · hot pot / group dining', location: 'Hopson One · about 1.8 km', why: 'Broth, dipping sauce, sesame and cross-contact need checking' },
    'kaijiang-grilled-fish': { name: 'Kaijiang Sichuan Grilled Fish · Wujiaochang', cuisine: 'Sichuan-Chongqing · grilled fish / spicy dishes', location: 'Wujiaochang · about 2.0 km', why: 'Useful for fish, soy sauce, sesame and chili checks' },
    'zuoting-youyuan-hotpot': { name: 'Zuoting Youyuan Fresh Beef Hot Pot', cuisine: 'Chaoshan beef hot pot · beef / hot pot', location: 'Wujiaochang · about 2.1 km', why: 'Hot-pot broth and shared utensils need confirmation' },
    'dongfang-yichuan': { name: 'Dongfang Yichuan · Guoding East Road', cuisine: 'Barbecue / grilled fish · late-night dining', location: 'Guoding East Road · about 2.2 km', why: 'Grill oil, seafood and spice are the main checks' },
    'jiejiao-taiwanese': { name: 'Jianjiao Taiwanese Kitchen · Wujiaochang', cuisine: 'Taiwanese snacks · braised dishes / noodles / small bites', location: 'Wujiaochang · about 2.3 km', why: 'Rice, noodles and braised toppings make a clear demo path' },
  },
  ko: {
    'zuihuihuang-fudan-zhengli': { name: '쭈이후이황 · 푸단 경영대학 정리 캠퍼스점', cuisine: '상하이 요리 · 해산물 · 비즈니스 식사', location: '푸단 정리 캠퍼스 · 약 0.1km', why: '가장 가까운 선택지예요. 해산물, 육수와 공용 조리도구를 확인하세요' },
    'haerbin-snacks-zhengli': { name: '하얼빈식 간식 · 정리루', cuisine: '동북 요리 · 만두 / 면 / 가정식', location: '정리루 · 약 0.3km', why: '만두와 면의 재료를 하나씩 확인하기 좋아요' },
    'he-sheng-hui-fei-dachu': { name: '페이다추 고추 돼지고기 · 허셩후이점', cuisine: '후난 요리 · 볶음 / 밥과 어울리는 요리', location: '허셩후이 · 약 1.7km', why: '매운맛과 돼지고기를 확인하기 좋은 곳이에요' },
    'he-xie-bang-cuisine': { name: '셰시에 · 상하이·장쑤·저장 요리', cuisine: '상하이·장쑤·저장 요리 · 게알 / 샤오롱바오', location: '허셩후이 · 약 1.7km', why: '갑각류, 달걀과 밀 알레르기를 확인하기 좋아요' },
    'ruyi-chicken-abalone': { name: '루이 치킨·전복 · 광둥식 탕', cuisine: '광둥 요리 · 탕 / 뚝배기 / 해산물', location: '허셩후이 · 약 1.7km', why: '탕 재료를 확인해야 하는 경우에 적합해요' },
    'haidilao-he-sheng-hui': { name: '하이디라오 훠궈 · 허셩후이', cuisine: '쓰촨 훠궈 · 훠궈 / 모임 식사', location: '허셩후이 · 약 1.8km', why: '육수, 소스, 참깨와 교차 접촉을 확인하세요' },
    'kaijiang-grilled-fish': { name: '카이장 쓰촨식 구운 생선 · 우자오창', cuisine: '쓰촨·충칭 요리 · 구운 생선 / 매운 요리', location: '우자오창 · 약 2.0km', why: '생선, 간장, 참깨와 고추를 확인하기 좋아요' },
    'zuoting-youyuan-hotpot': { name: '쭤팅여우위안 신선 소고기 훠궈', cuisine: '차오산 소고기 훠궈 · 소고기 / 훠궈', location: '우자오창 · 약 2.1km', why: '훠궈 육수와 공용 식기를 꼭 확인하세요' },
    'dongfang-yichuan': { name: '둥팡이촨 · 궈딩동루점', cuisine: '구이 / 구운 생선 · 야식', location: '궈딩동루 · 약 2.2km', why: '구이용 기름, 해산물과 매운맛이 주요 확인 항목이에요' },
    'jiejiao-taiwanese': { name: '지엔지아오 대만 식당 · 우자오창', cuisine: '대만 간식 · 루웨이 / 면 / 간단한 요리', location: '우자오창 · 약 2.3km', why: '밥, 면과 조림 토핑을 확인하기 좋아요' },
    'old-town-kitchen': { cuisine: '본방 요리 · 상하이 가정식', location: '상하이 · 1.2km', why: '메뉴가 명확하고 순한 메뉴가 있어요' },
    'green-bamboo-house': { cuisine: '채식 · 차 전문점', location: '상하이 · 1.8km', why: '푸드 패스포트에 맞는 담백한 맛' },
    'lotus-table': { cuisine: '광둥 요리 · 제철 소식', location: '상하이 · 2.4km', why: '채식 메뉴가 명확하게 표시돼요' },
    'red-lantern-hotpot': { cuisine: '훠궈 · 버섯 육수', location: '상하이 · 2.7km', why: '육수와 추가 메뉴를 비교하기 쉬워요' },
    'pepper-alley': { cuisine: '쓰촨 요리 · 강한 풍미', location: '상하이 · 3.1km', why: '매운맛을 좋아한다면 좋은 메뉴 기록' },
    'jade-soup-dumpling': { cuisine: '간식 · 샤오롱바오', location: '상하이 · 3.4km', why: '지하철 근처에서 빠르게 즐기는 현지 메뉴' },
    'west-lake-tea-room': { cuisine: '장쑤·저장 요리 · 차 페어링', location: '상하이 · 3.8km', why: '부드러운 맛과 차분한 식사 공간' },
    'charcoal-yard': { cuisine: '구이 · 야식', location: '상하이 · 4.2km', why: '작은 양이라 함께 나누기 좋아요' },
  },
  ja: {
    'zuihuihuang-fudan-zhengli': { name: '酔輝皇 · 復旦管理学院政立キャンパス店', cuisine: '上海料理 · シーフード · ビジネス向け', location: '復旦・政立キャンパス · 約0.1km', why: '最寄りの候補。魚介、スープ、共用調理器具を確認してください' },
    'haerbin-snacks-zhengli': { name: 'ハルビン風軽食 · 政立路', cuisine: '東北料理 · 餃子 / 麺 / 家庭料理', location: '政立路 · 約0.3km', why: '餃子と麺の食材を一つずつ確認しやすい店です' },
    'he-sheng-hui-fei-dachu': { name: 'フェイ・ダーチュー唐辛子炒め豚肉 · 合生匯店', cuisine: '湖南料理 · 炒め物 / ご飯に合う料理', location: '合生匯 · 約1.7km', why: '辛さと豚肉を確認しやすい候補です' },
    'he-xie-bang-cuisine': { name: 'シエシエ · 上海・江南料理', cuisine: '上海・江南料理 · 蟹粉 / 小籠包', location: '合生匯 · 約1.7km', why: '甲殻類、卵、小麦の確認に向いています' },
    'ruyi-chicken-abalone': { name: 'ルーイー鶏とアワビ · 広東スープ', cuisine: '広東料理 · スープ / 土鍋 / シーフード', location: '合生匯 · 約1.7km', why: 'スープの材料を確認したいときに便利です' },
    'haidilao-he-sheng-hui': { name: '海底撈火鍋 · 合生匯', cuisine: '四川火鍋 · 火鍋 / グループ向け', location: '合生匯 · 約1.8km', why: 'スープ、つけだれ、ごま、交差接触を確認してください' },
    'kaijiang-grilled-fish': { name: 'カイジャン四川風焼き魚 · 五角場', cuisine: '四川・重慶料理 · 焼き魚 / 辛い料理', location: '五角場 · 約2.0km', why: '魚、醤油、ごま、唐辛子の確認に便利です' },
    'zuoting-youyuan-hotpot': { name: 'ズォティンヨウユエン新鮮牛肉火鍋', cuisine: '潮汕牛肉火鍋 · 牛肉 / 火鍋', location: '五角場 · 約2.1km', why: '火鍋のスープと共用食器を確認してください' },
    'dongfang-yichuan': { name: '東方一串 · 国定東路店', cuisine: '焼き物 / 焼き魚 · 夜食', location: '国定東路 · 約2.2km', why: '焼き油、魚介、辛さが主な確認ポイントです' },
    'jiejiao-taiwanese': { name: 'ジエジャオ台湾食堂 · 五角場', cuisine: '台湾軽食 · 煮込み / 麺 / 小皿', location: '五角場 · 約2.3km', why: 'ご飯、麺、煮込みのトッピングを確認しやすい店です' },
    'old-town-kitchen': { cuisine: '上海料理 · 上海の家庭料理', location: '上海 · 1.2km', why: '料理の説明が明確で辛さも控えめ' },
    'green-bamboo-house': { cuisine: 'ベジタリアン · 茶館', location: '上海 · 1.8km', why: 'パスポートに合う軽やかな味' },
    'lotus-table': { cuisine: '広東料理 · 季節の小皿', location: '上海 · 2.4km', why: 'ベジタリアン料理の表示が明確' },
    'red-lantern-hotpot': { cuisine: '火鍋 · きのこだし', location: '上海 · 2.7km', why: 'だしと追加具材を比べやすい' },
    'pepper-alley': { cuisine: '四川料理 · しっかりした味', location: '上海 · 3.1km', why: '辛い料理が好きな人向けのメモが充実' },
    'jade-soup-dumpling': { cuisine: '軽食 · 小籠包', location: '上海 · 3.4km', why: '駅近で楽しめる定番料理' },
    'west-lake-tea-room': { cuisine: '江浙料理 · お茶のペアリング', location: '上海 · 3.8km', why: '穏やかな味と落ち着いた店内' },
    'charcoal-yard': { cuisine: '串焼き · 夜食', location: '上海 · 4.2km', why: '少量ずつシェアしやすい' },
  },
  ru: {
    'zuihuihuang-fudan-zhengli': { name: 'Цзуйхуэйхуан · кампус Фудань на Чжэнли', cuisine: 'Шанхайская кухня · морепродукты · деловой ужин', location: 'Кампус Фудань, Чжэнли · около 0,1 км', why: 'Ближайший вариант; уточните морепродукты, бульон и общую посуду' },
    'haerbin-snacks-zhengli': { name: 'Харбинские закуски · улица Чжэнли', cuisine: 'Северо-восточная кухня · пельмени / лапша / домашние блюда', location: 'Улица Чжэнли · около 0,3 км', why: 'Состав пельменей и лапши легко проверять по ингредиентам' },
    'he-sheng-hui-fei-dachu': { name: 'Фэй Дачу: свинина с перцем · Hopson One', cuisine: 'Хунаньская кухня · жареные блюда / к рису', location: 'Hopson One · около 1,7 км', why: 'Удобно отдельно проверить остроту и свинину' },
    'he-xie-bang-cuisine': { name: 'Сесяе · шанхайская и цзяннаньская кухня', cuisine: 'Шанхайская и цзяннаньская кухня · крабовая икра / сяолунбао', location: 'Hopson One · около 1,7 км', why: 'Хороший вариант для проверки ракообразных, яиц и пшеницы' },
    'ruyi-chicken-abalone': { name: 'Жуи: курица и абалон · кантонский суп', cuisine: 'Кантонская кухня · супы / горшочки / морепродукты', location: 'Hopson One · около 1,7 км', why: 'Ингредиенты основы супа нужно подтвердить' },
    'haidilao-he-sheng-hui': { name: 'Хайдилао хот-пот · Hopson One', cuisine: 'Сычуаньский хот-пот · хого / для компании', location: 'Hopson One · около 1,8 км', why: 'Проверьте бульон, соус, кунжут и перекрёстный контакт' },
    'kaijiang-grilled-fish': { name: 'Сычуаньская рыба на гриле Кайцзян · Уцзяочан', cuisine: 'Сычуаньско-чунцинская кухня · рыба на гриле / острые блюда', location: 'Уцзяочан · около 2,0 км', why: 'Удобно проверить рыбу, соевый соус, кунжут и чили' },
    'zuoting-youyuan-hotpot': { name: 'Чаошаньский хот-пот из свежей говядины Цзотин', cuisine: 'Чаошаньский хот-пот · говядина / хого', location: 'Уцзяочан · около 2,1 км', why: 'Уточните бульон и общую посуду' },
    'dongfang-yichuan': { name: 'Дунфан Ичуань · улица Годиндун', cuisine: 'Барбекю / рыба на гриле · поздний ужин', location: 'Улица Годиндун · около 2,2 км', why: 'Главные вопросы: масло для гриля, морепродукты и острота' },
    'jiejiao-taiwanese': { name: 'Тайваньская столовая Цзецзяо · Уцзяочан', cuisine: 'Тайваньские закуски · тушёные блюда / лапша / небольшие блюда', location: 'Уцзяочан · около 2,3 км', why: 'Понятный путь для проверки риса, лапши и тушёных добавок' },
    'old-town-kitchen': { cuisine: 'Шанхайская кухня · домашние блюда', location: 'Шанхай · 1,2 км', why: 'Понятное меню и неострые варианты' },
    'green-bamboo-house': { cuisine: 'Вегетарианское · чайный дом', location: 'Шанхай · 1,8 км', why: 'Лёгкие вкусы для вашего паспорта' },
    'lotus-table': { cuisine: 'Кантонская кухня · сезонные закуски', location: 'Шанхай · 2,4 км', why: 'Вегетарианские блюда отмечены понятно' },
    'red-lantern-hotpot': { cuisine: 'Хого · грибной бульон', location: 'Шанхай · 2,7 км', why: 'Бульоны и добавки легко сравнивать' },
    'pepper-alley': { cuisine: 'Сычуаньская кухня · яркие вкусы', location: 'Шанхай · 3,1 км', why: 'Подробные заметки для любителей острого' },
    'jade-soup-dumpling': { cuisine: 'Закуски · сяолунбао', location: 'Шанхай · 3,4 км', why: 'Быстрая местная классика рядом с метро' },
    'west-lake-tea-room': { cuisine: 'Цзянсу и Чжэцзян · чайные пары', location: 'Шанхай · 3,8 км', why: 'Мягкие вкусы и спокойный зал' },
    'charcoal-yard': { cuisine: 'Гриль · поздний ужин', location: 'Шанхай · 4,2 км', why: 'Небольшие порции удобно делить' },
  },
  es: {
    'zuihuihuang-fudan-zhengli': { name: 'Zuihuihuang · campus de Fudan en Zhengli', cuisine: 'Cocina shanghainesa · marisco · comidas de negocios', location: 'Campus Fudan Zhengli · aprox. 0,1 km', why: 'La opción más cercana; confirma marisco, caldo y utensilios compartidos' },
    'haerbin-snacks-zhengli': { name: 'Aperitivos al estilo de Harbin · Zhengli', cuisine: 'Cocina del noreste · dumplings / fideos / casera', location: 'Zhengli · aprox. 0,3 km', why: 'Es fácil revisar ingrediente por ingrediente en dumplings y fideos' },
    'he-sheng-hui-fei-dachu': { name: 'Cerdo con chile de Fei Dachu · Hopson One', cuisine: 'Cocina de Hunan · salteados / platos para acompañar con arroz', location: 'Hopson One · aprox. 1,7 km', why: 'Permite comprobar claramente el picante y el cerdo' },
    'he-xie-bang-cuisine': { name: 'Xiexie · cocina shanghainesa y de Jiangnan', cuisine: 'Cocina shanghainesa y de Jiangnan · huevas de cangrejo / xiaolongbao', location: 'Hopson One · aprox. 1,7 km', why: 'Buen caso para comprobar crustáceos, huevo y trigo' },
    'ruyi-chicken-abalone': { name: 'Ruyi, pollo y abalón · sopa cantonesa', cuisine: 'Cocina cantonesa · sopas / cazuelas / marisco', location: 'Hopson One · aprox. 1,7 km', why: 'Conviene confirmar los ingredientes de la base de la sopa' },
    'haidilao-he-sheng-hui': { name: 'Hotpot Haidilao · Hopson One', cuisine: 'Hotpot de Sichuan · hotpot / grupos', location: 'Hopson One · aprox. 1,8 km', why: 'Confirma caldo, salsa, sésamo y contacto cruzado' },
    'kaijiang-grilled-fish': { name: 'Pescado a la parrilla de Sichuan Kaijiang · Wujiaochang', cuisine: 'Cocina de Sichuan y Chongqing · pescado a la parrilla / picante', location: 'Wujiaochang · aprox. 2,0 km', why: 'Útil para comprobar pescado, soja, sésamo y chile' },
    'zuoting-youyuan-hotpot': { name: 'Hotpot de ternera fresca Zuoting Youyuan', cuisine: 'Hotpot de ternera de Chaoshan · ternera / hotpot', location: 'Wujiaochang · aprox. 2,1 km', why: 'Confirma el caldo y los utensilios compartidos' },
    'dongfang-yichuan': { name: 'Dongfang Yichuan · Guoding East Road', cuisine: 'Barbacoa / pescado a la parrilla · cena nocturna', location: 'Guoding East Road · aprox. 2,2 km', why: 'Los puntos clave son el aceite de parrilla, el marisco y el picante' },
    'jiejiao-taiwanese': { name: 'Comedor taiwanés Jianjiao · Wujiaochang', cuisine: 'Aperitivos taiwaneses · guisos / fideos / platos pequeños', location: 'Wujiaochang · aprox. 2,3 km', why: 'Un recorrido claro para revisar arroz, fideos y toppings guisados' },
    'old-town-kitchen': { cuisine: 'Cocina shanghainesa · casera', location: 'Shanghái · 1,2 km', why: 'Platos claros y opciones suaves' },
    'green-bamboo-house': { cuisine: 'Vegetariana · casa de té', location: 'Shanghái · 1,8 km', why: 'Sabores ligeros para tu pasaporte' },
    'lotus-table': { cuisine: 'Cocina cantonesa · platos de temporada', location: 'Shanghái · 2,4 km', why: 'Los platos vegetarianos están bien señalados' },
    'red-lantern-hotpot': { cuisine: 'Hotpot · caldo de setas', location: 'Shanghái · 2,7 km', why: 'Es fácil comparar caldos y extras' },
    'pepper-alley': { cuisine: 'Cocina de Sichuan · sabores intensos', location: 'Shanghái · 3,1 km', why: 'Buenas notas para quienes disfrutan del picante' },
    'jade-soup-dumpling': { cuisine: 'Aperitivos · xiaolongbao', location: 'Shanghái · 3,4 km', why: 'Un clásico local rápido cerca del metro' },
    'west-lake-tea-room': { cuisine: 'Cocina de Jiangsu y Zhejiang · maridajes de té', location: 'Shanghái · 3,8 km', why: 'Sabores suaves y comedor tranquilo' },
    'charcoal-yard': { cuisine: 'Barbacoa · bocados nocturnos', location: 'Shanghái · 4,2 km', why: 'Las porciones pequeñas facilitan compartir' },
  },
  it: {
    'zuihuihuang-fudan-zhengli': { name: 'Zuihuihuang · campus Fudan di Zhengli', cuisine: 'Cucina di Shanghai · frutti di mare · pranzo di lavoro', location: 'Campus Fudan Zhengli · circa 0,1 km', why: 'È l’opzione più vicina; verifica frutti di mare, brodo e utensili condivisi' },
    'haerbin-snacks-zhengli': { name: 'Snack in stile Harbin · Zhengli', cuisine: 'Cucina del Nord-est · ravioli / noodles / casalinga', location: 'Zhengli · circa 0,3 km', why: 'Ravioli e noodles sono facili da controllare ingrediente per ingrediente' },
    'he-sheng-hui-fei-dachu': { name: 'Maiale al peperoncino di Fei Dachu · Hopson One', cuisine: 'Cucina dell’Hunan · saltati / piatti da accompagnare al riso', location: 'Hopson One · circa 1,7 km', why: 'Piccante e maiale sono punti facili da verificare' },
    'he-xie-bang-cuisine': { name: 'Xiexie · cucina di Shanghai e Jiangnan', cuisine: 'Cucina di Shanghai e Jiangnan · uova di granchio / xiaolongbao', location: 'Hopson One · circa 1,7 km', why: 'Utile per controllare crostacei, uova e grano' },
    'ruyi-chicken-abalone': { name: 'Ruyi, pollo e abalone · zuppa cantonese', cuisine: 'Cucina cantonese · zuppe / tegami / frutti di mare', location: 'Hopson One · circa 1,7 km', why: 'Conviene confermare gli ingredienti della base della zuppa' },
    'haidilao-he-sheng-hui': { name: 'Hotpot Haidilao · Hopson One', cuisine: 'Hotpot del Sichuan · hotpot / gruppi', location: 'Hopson One · circa 1,8 km', why: 'Verifica brodo, salsa, sesamo e contatto crociato' },
    'kaijiang-grilled-fish': { name: 'Pesce alla griglia del Sichuan Kaijiang · Wujiaochang', cuisine: 'Cucina del Sichuan e Chongqing · pesce alla griglia / piccante', location: 'Wujiaochang · circa 2,0 km', why: 'Utile per controllare pesce, soia, sesamo e peperoncino' },
    'zuoting-youyuan-hotpot': { name: 'Hotpot di manzo fresco Zuoting Youyuan', cuisine: 'Hotpot di manzo Chaoshan · manzo / hotpot', location: 'Wujiaochang · circa 2,1 km', why: 'Conferma brodo e utensili condivisi' },
    'dongfang-yichuan': { name: 'Dongfang Yichuan · Guoding East Road', cuisine: 'Griglia / pesce alla griglia · cena notturna', location: 'Guoding East Road · circa 2,2 km', why: 'I controlli principali sono olio, frutti di mare e piccante' },
    'jiejiao-taiwanese': { name: 'Mensa taiwanese Jianjiao · Wujiaochang', cuisine: 'Snack taiwanesi · brasati / noodles / piccoli piatti', location: 'Wujiaochang · circa 2,3 km', why: 'Un percorso chiaro per controllare riso, noodles e condimenti brasati' },
    'old-town-kitchen': { cuisine: 'Cucina di Shanghai · casalinga', location: 'Shanghai · 1,2 km', why: 'Piatti chiari e opzioni delicate' },
    'green-bamboo-house': { cuisine: 'Vegetariana · casa da tè', location: 'Shanghai · 1,8 km', why: 'Sapori leggeri per il tuo passaporto' },
    'lotus-table': { cuisine: 'Cucina cantonese · piccoli piatti stagionali', location: 'Shanghai · 2,4 km', why: 'I piatti vegetariani sono indicati chiaramente' },
    'red-lantern-hotpot': { cuisine: 'Hotpot · brodo ai funghi', location: 'Shanghai · 2,7 km', why: 'Brodi e aggiunte sono facili da confrontare' },
    'pepper-alley': { cuisine: 'Cucina del Sichuan · sapori decisi', location: 'Shanghai · 3,1 km', why: 'Buone note per chi ama il piccante' },
    'jade-soup-dumpling': { cuisine: 'Stuzzichini · xiaolongbao', location: 'Shanghai · 3,4 km', why: 'Un classico locale veloce vicino alla metro' },
    'west-lake-tea-room': { cuisine: 'Cucina di Jiangsu e Zhejiang · abbinamenti al tè', location: 'Shanghai · 3,8 km', why: 'Sapori delicati e sala tranquilla' },
    'charcoal-yard': { cuisine: 'Griglia · assaggi notturni', location: 'Shanghai · 4,2 km', why: 'Le porzioni piccole sono facili da condividere' },
  },
}
const localizedRestaurant = (language: Language, restaurant: SavedRestaurant): RestaurantText => restaurantTextTranslations[language][restaurant.id] || { name: restaurant.name, cuisine: restaurant.cuisine, location: restaurant.location, why: restaurant.why }
const nearbyCopy: Record<Language, { area: string; title: string; description: string; source: string }> = {
  en: { area: 'Fudan · 3 km', title: 'Nearby restaurants', description: 'Public discovery leads for demo exploration; verify the store and menu before relying on them.', source: 'Source' },
  ko: { area: '푸단 · 3km', title: '주변 식당', description: '데모 탐색을 위한 공개 식당 정보입니다. 이용하기 전에 매장과 메뉴를 확인하세요.', source: '출처' },
  ja: { area: '復旦 · 3km', title: '近くのレストラン', description: 'デモ探索用の公開情報です。利用する前に店舗とメニューを確認してください。', source: '出典' },
  ru: { area: 'Фудань · 3 км', title: 'Рестораны рядом', description: 'Открытые данные для демонстрации. Перед визитом проверьте ресторан и меню.', source: 'Источник' },
  es: { area: 'Fudan · 3 km', title: 'Restaurantes cercanos', description: 'Datos públicos para explorar la demo. Confirma el local y el menú antes de confiar en ellos.', source: 'Fuente' },
  it: { area: 'Fudan · 3 km', title: 'Ristoranti vicini', description: 'Dati pubblici per esplorare la demo. Verifica locale e menu prima di farci affidamento.', source: 'Fonte' },
}
type PostText = Pick<FoodPost, 'title' | 'body' | 'dish' | 'dishMeta' | 'time'>
const postTextTranslations: Record<Language, Record<string, PostText>> = {
  en: {},
  ko: {
    'post-01': { time: '18분 전', title: '기억에 남는 상하이 가정식', body: '달콤한 갈비와 메추리알, 구운 간장 향이 나는 국물 한 그릇. 상하이 음식을 처음 맛보는 사람을 데려가고 싶은 곳이에요.', dish: '간장 갈비', dishMeta: '카라멜 풍미 · 짭짤함 · ¥58' },
    'post-02': { time: '42분 전', title: '평범한 육수 대신 시그니처 훠궈', body: '마라 버터에 지글지글 익힌 새우와 연밥, 땅콩이 나와요. 진하고 훈연 향이 나서 여럿이 나누기 좋아요.', dish: '마라 버터 새우', dishMeta: '훈연 향 · 얼얼함 · ¥88' },
    'post-03': { time: '1시간 전', title: '맛의 존재감이 확실한 건솥 새우', body: '바삭한 새우와 셀러리, 화자오가 한입마다 생기를 줘요. 천천히 매워지니 냄비가 오기 전에 밥을 주문하세요.', dish: '쓰촨 건솥 새우', dishMeta: '바삭함 · 매운맛 · ¥72' },
    'post-04': { time: '2시간 전', title: '바닥이 가장 바삭한 아침 메뉴', body: '위는 부드럽고 아래는 짙은 황금빛인 군만두예요. 흑식초를 곁들여 팬이 따뜻할 때 먹어 보세요.', dish: '군만두', dishMeta: '바삭함 · 육즙 · ¥24 / 팬' },
    'post-05': { time: '3시간 전', title: '바삭함이 주인공인 차집 요리', body: '새우와 토란 롤을 감싼 얇고 바삭한 반죽과 산뜻한 시트러스 딥이 좋아요. 작은 접시지만 나누기 어려울 만큼 맛있어요.', dish: '바삭한 새우·토란 롤', dishMeta: '섬세한 바삭함 · 시트러스 · ¥46' },
    'post-06': { time: '5시간 전', title: '차 한 주전자와 어울리는 부드러운 마무리', body: '찹쌀떡은 지나치게 달지 않고 향긋하며, 구운 밤이 속속 들어 있어요. 계화차와 천천히 나눠 먹기 좋아요.', dish: '계화 밤 찹쌀떡', dishMeta: '쫀득함 · 꽃 향 · ¥32' },
    'post-07': { time: '어제', title: '가장 감칠맛 있게 즐기는 용정차', body: '차 향을 입힌 닭고기는 부드럽고 향긋하며 배 조각과 함께 나와요. 창가 자리가 여유로운 오후를 보내기 좋아요.', dish: '용정차 훈연 닭고기', dishMeta: '부드러움 · 향긋함 · ¥68' },
    'post-08': { time: '어제', title: '해가 진 뒤 즐기는 큐민 양고기와 숯 향', body: '양고기는 제대로 구운 향이 나고 새송이버섯에는 숯불 풍미가 배어 있어요. 함께 나누기 좋은 늦은 밤 메뉴예요.', dish: '큐민 숯불 양꼬치', dishMeta: '훈연 향 · 육즙 · ¥48 / 6꼬치' },
  },
  ja: {
    'post-01': { time: '18分前', title: '記憶に残る上海の家庭料理', body: '甘いスペアリブとウズラの卵、香ばしい醤油の香りがするスープ。上海料理を初めて食べる人を連れて行きたい店です。', dish: '醤油風味のスペアリブ', dishMeta: 'カラメル風味 · うま味 · ¥58' },
    'post-02': { time: '42分前', title: 'いつものスープとは違う名物火鍋', body: 'マーラー風味のバターで焼いたエビに、蓮の実とピーナッツ。濃厚で香ばしく、グループで分けるのにぴったりです。', dish: 'マーラーバターのエビ', dishMeta: '香ばしい · しびれる辛さ · ¥88' },
    'post-03': { time: '1時間前', title: '存在感のある干鍋エビ', body: 'パリッとしたエビ、セロリ、花椒で一口ごとに楽しい味。後から辛さが増すので、鍋が来る前にご飯を頼むのがおすすめです。', dish: '四川風干鍋エビ', dishMeta: 'パリッと · 辛い · ¥72' },
    'post-04': { time: '2時間前', title: '底の焼き目が最高の朝食', body: '上はやわらかく、底は濃い黄金色の焼き小籠包。黒酢を添えて、鉄板が温かいうちにどうぞ。', dish: '焼き豚まん', dishMeta: 'パリッと · ジューシー · ¥24 / 鍋' },
    'post-05': { time: '3時間前', title: '食感を楽しむ茶館の一皿', body: 'エビとタロイモの春巻きは薄い皮がパリパリで、明るい柑橘のソースが合います。小皿ですが、分けるのが惜しい味です。', dish: 'エビとタロイモのロール', dishMeta: '繊細な食感 · 柑橘風味 · ¥46' },
    'post-06': { time: '5時間前', title: 'お茶と楽しむやさしい甘味', body: 'もち米のケーキは甘すぎず香りがあり、焼き栗がたっぷり。キンモクセイ茶とゆっくり分けるのがおすすめです。', dish: '桂花と栗のもち米ケーキ', dishMeta: 'もちもち · 花の香り · ¥32' },
    'post-07': { time: '昨日', title: 'いちばん香ばしい龍井茶の楽しみ方', body: '茶葉で燻した鶏肉はやわらかく香り高く、梨の薄切りと一緒に出ます。窓際で午後を過ごすのにぴったりです。', dish: '龍井茶の燻製チキン', dishMeta: 'やわらかい · 香り高い · ¥68' },
    'post-08': { time: '昨日', title: '夜のクミン羊肉と炭火の香り', body: '羊肉はしっかり焼き目がつき、エリンギが炭火の風味を吸っています。シェア好きなテーブルの夜食にぴったりです。', dish: 'クミン炭火ラム串', dishMeta: '香ばしい · ジューシー · ¥48 / 6本' },
  },
  ru: {
    'post-01': { time: '18 мин назад', title: 'Шанхайская домашняя еда, которую помнишь', body: 'Липкие рёбрышки, сладкие перепелиные яйца и суп с ароматом поджаренного соевого соуса. Отличное место для первого знакомства с кухней Шанхая.', dish: 'Рёбрышки в соевой глазури', dishMeta: 'Карамельные · насыщенные · ¥58' },
    'post-02': { time: '42 мин назад', title: 'Фирменное хого без привычного бульона', body: 'Креветки шипят в маля-масле вместе с семенами лотоса и арахисом. Насыщенно, дымно и удобно делить на компанию.', dish: 'Креветки в маля-масле', dishMeta: 'Дымные · онемляющие · ¥88' },
    'post-03': { time: '1 час назад', title: 'Сухой вок с креветками и характером', body: 'Хрустящие креветки, сельдерей и перец делают каждый кусочек ярким. Острота нарастает постепенно, поэтому рис лучше заказать заранее.', dish: 'Сычуаньские креветки в сухом воке', dishMeta: 'Хрустящие · острые · ¥72' },
    'post-04': { time: '2 ч назад', title: 'Завтрак с самой хрустящей корочкой', body: 'Сверху эти жареные булочки мягкие, а снизу — глубокого золотистого цвета. Добавьте чёрный уксус и ешьте горячими.', dish: 'Жареные свиные булочки', dishMeta: 'Хрустящие · сочные · ¥24 / сковорода' },
    'post-05': { time: '3 ч назад', title: 'Чайная закуска для любителей хруста', body: 'Роллы с креветками и таро покрыты тонкой хрустящей корочкой и подаются с ярким цитрусовым соусом. Маленькая порция, которую не хочется делить.', dish: 'Хрустящие роллы с креветками и таро', dishMeta: 'Ажурные · цитрусовые · ¥46' },
    'post-06': { time: '5 ч назад', title: 'Мягкий цветочный финал с чаем', body: 'Клейкий рисовый пирог ароматный, но не слишком сладкий, с кусочками жареного каштана. Лучше медленно делить его с чаем османтуса.', dish: 'Рисовый пирог с османтусом и каштаном', dishMeta: 'Тягучий · цветочный · ¥32' },
    'post-07': { time: 'Вчера', title: 'Лунцзин в самом насыщенном виде', body: 'Курица, копчёная на чае, нежная и ароматная, подаётся с ломтиками груши. Место у окна отлично подходит для спокойного дня.', dish: 'Курица, копчёная на чае лунцзин', dishMeta: 'Нежная · ароматная · ¥68' },
    'post-08': { time: 'Вчера', title: 'Баранина с кумином и угольным дымом', body: 'Баранина хорошо обжарена, а вешенки впитали весь аромат гриля. Отличный поздний заказ для стола, который любит делиться.', dish: 'Шашлычки из баранины с кумином', dishMeta: 'Дымные · сочные · ¥48 / 6 шпажек' },
  },
  es: {
    'post-01': { time: 'hace 18 min', title: 'La comida casera de Shanghái que recuerdas', body: 'Costillas pegajosas, huevos de codorniz dulces y un bol con aroma a soja tostada. Es el sitio al que llevaría a alguien que prueba Shanghái por primera vez.', dish: 'Costillas glaseadas con soja', dishMeta: 'Caramelizadas · sabrosas · ¥58' },
    'post-02': { time: 'hace 42 min', title: 'Un hotpot con un caldo fuera de lo común', body: 'Las gambas llegan chisporroteando en mantequilla mala con semillas de loto y cacahuetes. Intenso, ahumado y perfecto para compartir.', dish: 'Gambas con mantequilla mala', dishMeta: 'Ahumadas · adormecedoras · ¥88' },
    'post-03': { time: 'hace 1 h', title: 'El plato de gambas al wok seco con carácter', body: 'Las gambas crujientes, el apio y la pimienta mantienen cada bocado vivo. El picante crece poco a poco, así que pide arroz antes de que llegue la sartén.', dish: 'Gambas de Sichuan al wok seco', dishMeta: 'Crujientes · picantes · ¥72' },
    'post-04': { time: 'hace 2 h', title: 'El desayuno con la base más crujiente', body: 'Estos bollos son tiernos por arriba y dorados por debajo. Añade vinagre negro y cómelos mientras la sartén sigue caliente.', dish: 'Bollos de cerdo a la plancha', dishMeta: 'Crujientes · jugosos · ¥24 / sartén' },
    'post-05': { time: 'hace 3 h', title: 'Un plato de té dedicado al crujiente', body: 'Los rollitos de gambas y taro tienen una delicada red crujiente y una salsa cítrica brillante. Es pequeño, pero cuesta compartirlo.', dish: 'Rollitos crujientes de gamba y taro', dishMeta: 'Ligeros · cítricos · ¥46' },
    'post-06': { time: 'hace 5 h', title: 'Un final floral y suave con una tetera', body: 'El pastel de arroz glutinoso es aromático sin resultar demasiado dulce, con castañas tostadas en cada corte. Compártelo con té de osmanthus.', dish: 'Pastel de arroz con osmanthus y castaña', dishMeta: 'Masticable · floral · ¥32' },
    'post-07': { time: 'Ayer', title: 'El té longjing en su versión más sabrosa', body: 'El pollo ahumado con té es tierno y aromático, servido con pera. Las mesas junto a la ventana son perfectas para una tarde tranquila.', dish: 'Pollo ahumado con té longjing', dishMeta: 'Tierno · aromático · ¥68' },
    'post-08': { time: 'Ayer', title: 'Cordero al comino y humo de brasas', body: 'El cordero está bien marcado y las setas de cardo absorben todo el sabor de la parrilla. Un gran pedido nocturno para compartir.', dish: 'Brochetas de cordero al comino', dishMeta: 'Ahumadas · jugosas · ¥48 / 6 brochetas' },
  },
  it: {
    'post-01': { time: '18 min fa', title: 'Il comfort food di Shanghai che ricordi', body: 'Costine glassate, uova di quaglia dolci e una zuppa dal profumo di soia tostata. È il posto che sceglierei per chi assaggia Shanghai per la prima volta.', dish: 'Costine glassate alla soia', dishMeta: 'Caramellate · saporite · ¥58' },
    'post-02': { time: '42 min fa', title: 'Un hotpot speciale senza il solito brodo', body: 'I gamberi arrivano sfrigolanti nel burro mala con semi di loto e arachidi. Ricco, affumicato e perfetto da condividere.', dish: 'Gamberi al burro mala', dishMeta: 'Affumicati · anestetizzanti · ¥88' },
    'post-03': { time: '1 ora fa', title: 'Il wok secco di gamberi che ha carattere', body: 'Gamberi croccanti, sedano e pepe tengono ogni boccone vivace. Il piccante cresce piano, quindi ordina il riso prima che arrivi la padella.', dish: 'Gamberi del Sichuan al wok secco', dishMeta: 'Croccanti · piccanti · ¥72' },
    'post-04': { time: '2 ore fa', title: 'La colazione con il fondo più croccante', body: 'Questi panini sono morbidi sopra e dorati sotto. Aggiungi aceto nero e mangiali quando la padella è ancora calda.', dish: 'Panini di maiale alla piastra', dishMeta: 'Croccanti · succosi · ¥24 / padella' },
    'post-05': { time: '3 ore fa', title: 'Un piatto da casa da tè tutto croccante', body: 'I rotolini di gambero e taro hanno una sfoglia delicata e croccante con una salsa agli agrumi. Piccoli, ma difficili da condividere.', dish: 'Rotolini croccanti di gambero e taro', dishMeta: 'Leggeri · agrumati · ¥46' },
    'post-06': { time: '5 ore fa', title: 'Un finale morbido e floreale con il tè', body: 'La torta di riso glutinoso è profumata senza essere troppo dolce, con castagne tostate in ogni fetta. Da condividere con tè all’osmanto.', dish: 'Torta di riso, osmanto e castagne', dishMeta: 'Morbida · floreale · ¥32' },
    'post-07': { time: 'Ieri', title: 'Il tè longjing nella versione più saporita', body: 'Il pollo affumicato al tè è tenero e profumato, servito con fettine di pera. I tavoli vicino alla finestra sono perfetti per un pomeriggio tranquillo.', dish: 'Pollo affumicato al tè longjing', dishMeta: 'Tenero · aromatico · ¥68' },
    'post-08': { time: 'Ieri', title: 'Agnello al cumino e fumo di brace', body: 'L’agnello ha una bella crosticina e i funghi pleurotus assorbono tutto il sapore della griglia. Un ottimo ordine serale da condividere.', dish: 'Spiedini di agnello al cumino', dishMeta: 'Affumicati · succosi · ¥48 / 6 spiedini' },
  },
}
const localizedPost = (language: Language, post: FoodPost): PostText => postTextTranslations[language][post.id] || { title: post.title, body: post.body, dish: post.dish, dishMeta: post.dishMeta, time: post.time }

function Icon({ name, size = 20, stroke = 1.8 }: { name: string; size?: number; stroke?: number }) {
  const paths: Record<string, ReactNode> = {
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M8 8h8v8H8z"/></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z"/><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/></>,
    user: <><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.8-3 3.2-4.6 7-4.6s6.2 1.6 7 4.6"/></>,
    home: <><path d="m3 10 9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Z"/><path d="M9 20v-6h6v6"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></>,
    receipt: <><path d="M6 3h12v18l-2.3-1.7L13.5 21 11 19.3 8.5 21 6 19.3 3.8 21V3H6Z"/><path d="M7.5 8h9M7.5 12h9M7.5 16h5"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    back: <path d="m15 18-6-6 6-6"/>,
    chevron: <path d="m8 10 4 4 4-4"/>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    undo: <><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    check: <path d="m5 12 4.5 4.5L19 7"/>,
    crossContact: <><circle cx="7.5" cy="7.5" r="4"/><circle cx="16.5" cy="16.5" r="4"/><path d="m10.5 10.5 3 3"/><path d="m10.8 13.5 2.8-.2-.2-2.8"/></>,
    alert: <><path d="M12 3 2.7 19a1 1 0 0 0 .9 1.5h16.8a1 1 0 0 0 .9-1.5L12 3Z"/><path d="M12 8v5M12 16.5v.1"/></>,
    shield: <><path d="M12 3 19 6v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    upload: <><path d="M12 16V4M8 8l4-4 4 4M5 14v5h14v-5"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z"/><circle cx="12" cy="13" r="3.5"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 4.5-4 3.2 2.7 2.4-2.2L20 18"/></>,
    flash: <path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>,
    bookmark: <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-3.5L6 22V4Z"/>,
    volume: <><path d="M4 10v4h3l4 3V7L7 10H4Z"/><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10"/></>,
    copy: <><rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3"/></>,
    share: <><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.5-4.5M8 13l7.5 4.5"/></>,
    edit: <><path d="m4 20 4.2-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/><path d="m13.5 7.5 3 3"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.6-4L3 10M3 5v5h5M4 13a8 8 0 0 0 14.6 4L21 14m0 5v-5h-5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c.4-3.3 2.4-5 6-5s5.6 1.7 6 5M16 5.5a3 3 0 0 1 0 5.8M18 15c2.2.7 3.4 2.3 3.7 5"/></>,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6a2 2 0 0 1-2-2V6.5Z"/><path d="M4 7h16M16 13h4"/><circle cx="16" cy="13" r=".4" fill="currentColor"/></>,
    oil: <><path d="M8 5h8l1 3v12H7V8l1-3Z"/><path d="M8 8h8M10 12h4M10 16h4"/><path d="M10 3h4"/></>,
    cart: <><path d="M4 5h2l1.5 10.2a2 2 0 0 0 2 1.8h7.8a2 2 0 0 0 1.9-1.4L21 9H7"/><circle cx="10" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/></>,
    dots: <><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></>,
    heart: <path d="M20.8 8.8c0 5.4-8.8 10.3-8.8 10.3S3.2 14.2 3.2 8.8A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.6Z"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    leaf: <><path d="M20 4C10 4 5 8 5 14c0 3.3 2.3 6 5.5 6C17 20 20 12 20 4Z"/><path d="M4 21c2-4 5.3-6.7 10-8.5"/></>,
    chili: <><path d="M19.5 5.5c-1.3 4.8-4.4 9.7-9.2 11.5-2.9 1.1-5.3-.4-5.1-2.7.2-2.4 2.7-3.5 5.1-3.8 3.2-.4 5.8-2.3 7.7-5.7"/><path d="M17.8 5.2c.9-1.2 2.1-1.8 3.2-1.2-.2 1.4-1.1 2.2-2.5 2.5"/></>,
    tofuBowl: <><path d="M4 11.5c.8 5.2 3.6 7.8 8 7.8s7.2-2.6 8-7.8"/><path d="M3.5 11.5h17M6.5 8.8c1.1-2.3 2.9-3.5 5.5-3.5s4.4 1.2 5.5 3.5"/><path d="M8.5 8.8v-2M12 8.8v-2.8M15.5 8.8v-2"/></>,
    pot: <><path d="M5 9h14v8.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5V9Z"/><path d="M3.5 9h17M7 6.5h10M9 4.5h6M3.5 12h-1M21.5 12h-1"/></>,
    riceBowl: <><path d="M4 12h16c-.6 4.6-3.2 7-8 7s-7.4-2.4-8-7Z"/><path d="M6 12c.2-2.6 2.4-4.5 6-4.5s5.8 1.9 6 4.5M8 6.5c.8-1 1.7-1.5 2.7-1.5M12 5c.5-1 .9-1.5 1.8-1.8"/><path d="M9 21h6"/></>,
    book: <><path d="M3.5 5.5c2.8-1.5 5.7-1.2 8.5.8v13c-2.8-2-5.7-2.3-8.5-.8v-13Z"/><path d="M20.5 5.5c-2.8-1.5-5.7-1.2-8.5.8v13c2.8 2 5.7 2.3 8.5 .8v-13Z"/></>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>
}

function LogoMark({ small = false }: { small?: boolean }) { return <span className={`brand-mark-image ${small ? 'brand-mark-small' : ''}`} aria-hidden="true" /> }

function CrossContactIcon({ blocked, size }: { blocked: boolean; size: number }) {
  return <span className={`cross-contact-icon ${blocked ? 'blocked' : ''}`}>
    <Icon name="crossContact" size={size} />
    {blocked && <span className="cross-contact-x"><Icon name="close" size={8} stroke={2.5} /></span>}
  </span>
}

function Button({ children, onClick, variant = 'primary', icon, className = '', type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} disabled={disabled} className={`button button-${variant} ${className}`} onClick={onClick}>{icon && <Icon name={icon} size={18} />}{children}</button>
}

function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('cit:language') as Language) || 'en')
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => readStoredAccounts())
  const [account, setAccount] = useState<UserProfile | null>(() => getActiveStoredAccount()?.profile || null)
  const [passport, setPassport] = useState<Passport>(() => getActiveStoredAccount()?.passport || blankPassport())
  const [ready, setReady] = useState(() => localStorage.getItem('cit:ready') === 'true' && Boolean(localStorage.getItem('cit:account')))
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedDish, setSelectedDish] = useState<Dish>(dishes[0])
  const [askSheet, setAskSheet] = useState(false)
  const [scanImage, setScanImage] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [lastScanFile, setLastScanFile] = useState<File | null>(null)
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([])
  const [sessionRisks, setSessionRisks] = useState<Record<string, BackendRisk>>({})
  const [analysisPassportKey, setAnalysisPassportKey] = useState('')
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [sessionMenu, setSessionMenu] = useState<Dish[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cit:session-menu') || '') as Dish[]
      return Array.isArray(saved) ? saved.map((dish) => {
        const catalogDish = dishes.find((candidate) => candidate.id === dish.id)
        return catalogDish ? { ...dish, ingredientEvidence: catalogDish.ingredientEvidence, allergenEvidence: catalogDish.allergenEvidence, knowledgeMatch: catalogDish.knowledgeMatch } : dish
      }) : []
    } catch { return [] }
  })
  const [sessionRestaurant, setSessionRestaurant] = useState(() => localStorage.getItem('cit:session-restaurant') || '')
  const [sessionOrders, setSessionOrders] = useState<DiningOrder[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cit:session-orders') || '') as DiningOrder[]
      return Array.isArray(saved) ? saved : []
    } catch { return [] }
  })
  const [selectedSessionOrder, setSelectedSessionOrder] = useState<DiningOrder | null>(null)
  const [addOnOrder, setAddOnOrder] = useState<DiningOrder | null>(null)
  const [companionReturnScreen, setCompanionReturnScreen] = useState<Screen>('profile')
  const [billMode, setBillMode] = useState<BillMode>('equal')
  const [billReturnScreen, setBillReturnScreen] = useState<Screen>('home')
  const [activeBillOrder, setActiveBillOrder] = useState<DiningOrder | null>(null)
  const [billSource, setBillSource] = useState<'order' | 'receipt'>('order')
  const [billReceiptName, setBillReceiptName] = useState('')
  const [participants, setParticipants] = useState(['You'])
  const [splitItems, setSplitItems] = useState<Record<string, string>>({ chicken: 'You', tofu: 'Everyone', eggplant: 'Everyone', greens: 'Everyone', lotus: 'Everyone' })
  const [savedRestaurants, setSavedRestaurants] = useState<SavedRestaurant[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cit:saved-restaurants') || '') as SavedRestaurant[]
      return Array.isArray(saved) ? saved : initialSavedRestaurants
    } catch { return initialSavedRestaurants }
  })
  const [companionInvites, setCompanionInvites] = useState<CompanionInvite[]>(() => readStoredInvites())
  const [selectedCompanionEmail, setSelectedCompanionEmail] = useState<string | null>(null)
  const [activeCompanionIds, setActiveCompanionIds] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const cameraInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const homeCameraInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const homeUploadInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const billInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const t = (key: CopyKey) => tFor(language, key)
  const currentCompanions = account ? companionViewsFor(account.email, accounts, companionInvites) : []
  const incomingCompanionInvites = account ? companionInvites.filter((invite) => invite.status === 'pending' && normalizeEmail(invite.toEmail) === normalizeEmail(account.email) && accounts.some((record) => normalizeEmail(record.profile.email) === normalizeEmail(invite.fromEmail))) : []
  const outgoingCompanionInvites = account ? companionInvites.filter((invite) => invite.status === 'pending' && normalizeEmail(invite.fromEmail) === normalizeEmail(account.email) && accounts.some((record) => normalizeEmail(record.profile.email) === normalizeEmail(invite.toEmail))) : []
  const selectedCompanion = selectedCompanionEmail ? currentCompanions.find((companion) => companion.email === selectedCompanionEmail) || null : null
  const p = pageCopy[language]
  const passportKey = JSON.stringify(passport)

  useEffect(() => { localStorage.setItem('cit:language', language); document.documentElement.lang = language }, [language])
  useEffect(() => { if (account) localStorage.setItem('cit:account', JSON.stringify(account)) }, [account])
  useEffect(() => { localStorage.setItem('cit:passport', JSON.stringify(passport)) }, [passport])
  useEffect(() => {
    if (!account) return
    const email = account.email.trim().toLowerCase()
    setAccounts((current) => {
      const next = current.some((record) => record.profile.email.trim().toLowerCase() === email)
        ? current.map((record) => record.profile.email.trim().toLowerCase() === email ? { profile: account, passport } : record)
        : [...current, { profile: account, passport }]
      localStorage.setItem('cit:accounts', JSON.stringify(next))
      return next
    })
  }, [account, passport])
  useEffect(() => {
    // The previous prototype stored mock companions under this key. The real
    // account/invite model below is the only source of truth now.
    localStorage.removeItem('cit:companions')
    const syncSharedDemoState = (event: StorageEvent) => {
      if (event.key === 'cit:accounts') setAccounts(readStoredAccounts())
      if (event.key === 'cit:companion-invites') setCompanionInvites(readStoredInvites())
    }
    window.addEventListener('storage', syncSharedDemoState)
    return () => window.removeEventListener('storage', syncSharedDemoState)
  }, [])
  useEffect(() => { localStorage.setItem('cit:saved-restaurants', JSON.stringify(savedRestaurants)) }, [savedRestaurants])
  useEffect(() => { localStorage.setItem('cit:companion-invites', JSON.stringify(companionInvites)) }, [companionInvites])
  useEffect(() => { localStorage.setItem('cit:session-menu', JSON.stringify(sessionMenu)) }, [sessionMenu])
  useEffect(() => { localStorage.setItem('cit:session-restaurant', sessionRestaurant) }, [sessionRestaurant])
  useEffect(() => { localStorage.setItem('cit:session-orders', JSON.stringify(sessionOrders)) }, [sessionOrders])
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer) } }, [toast])
  useEffect(() => () => { if (scanImage) URL.revokeObjectURL(scanImage) }, [scanImage])
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    document.querySelector<HTMLElement>('.onboarding-root')?.scrollTo(0, 0)
  }, [ready, screen, onboardingStep])

  const track = (event: string) => { console.info(`[Bitewise] ${event}`, { language, session_id: 'demo-session-001' }) }
  const updatePassport = (key: keyof Passport | string, value: string | boolean | number | null) => setPassport((current) => {
    if (typeof key === 'string' && key.startsWith('allergyProfile:')) {
      const [, id, profileKey] = key.split(':') as ['', string, keyof AllergyProfile]
      return { ...current, allergyProfiles: { ...current.allergyProfiles, [id]: { ...(current.allergyProfiles[id] || defaultAllergyProfile), [profileKey]: value } } }
    }
    if (key === 'crossContact') return { ...current, crossContact: value as boolean }
    if (key === 'severity') return { ...current, severity: value as Passport['severity'] }
    if (key === 'otherAllergen') {
      const otherAllergen = value as string
      const allergyProfiles = { ...current.allergyProfiles }
      if (!otherAllergen.trim()) delete allergyProfiles.other
      return { ...current, otherAllergen, allergyProfiles }
    }
    if (key === 'dietStyle') {
      const dietStyle = value as DietStyle
      return { ...current, dietStyle, diets: [...current.diets.filter((id) => !dietStyleIds.includes(id)), ...(dietStyle === 'none' ? [] : [dietStyle])] }
    }
    if (key === 'faithDiet') {
      const faithDiet = value as FaithDiet
      return { ...current, faithDiet, diets: [...current.diets.filter((id) => !faithDietIds.includes(id)), ...(faithDiet === 'halal' || faithDiet === 'kosher' ? [faithDiet] : [])] }
    }
    if (key === 'faithOther') return { ...current, faithOther: value as string }
    if (key === 'avoidFoods') {
      const id = value as string
      const avoidFoods = current.avoidFoods.includes(id) ? current.avoidFoods.filter((item) => item !== id) : [...current.avoidFoods, id]
      return { ...current, avoidFoods, diets: [...current.diets.filter((item) => !avoidFoodIds.includes(item)), ...avoidFoods] }
    }
    if (key === 'spiceLevel') return { ...current, spiceLevel: value as number | null }
    if (key === 'allergies') {
      const selected = current.allergies.includes(value as string)
      const allergyProfiles = { ...current.allergyProfiles }
      if (selected) delete allergyProfiles[value as string]
      else allergyProfiles[value as string] = allergyProfiles[value as string] || { ...defaultAllergyProfile }
      return { ...current, allergies: selected ? current.allergies.filter((item) => item !== value) : [...current.allergies, value as string], allergyProfiles }
    }
    const values = current[key as keyof Passport] as string[]
    return { ...current, [key]: values.includes(value as string) ? values.filter((item) => item !== value) : [...values, value as string] }
  })
  const finishOnboarding = () => { localStorage.setItem('cit:ready', 'true'); setReady(true); setScreen('home'); track('food_profile_completed') }
  const completeRegistration = (profile: UserProfile) => {
    const newPassport = blankPassport()
    setAccounts((current) => {
      const email = profile.email.trim().toLowerCase()
      const next = [...current.filter((record) => record.profile.email.trim().toLowerCase() !== email), { profile, passport: newPassport }]
      localStorage.setItem('cit:accounts', JSON.stringify(next))
      return next
    })
    setAccount(profile)
    setPassport(newPassport)
    setOnboardingStep(3)
    track('profile_created')
  }
  const updateAvatar = (avatarSrc: string) => {
    setAccount((current) => current ? { ...current, avatarSrc } : current)
    track('profile_avatar_updated')
  }
  const updateSubscription = (days: number | null) => {
    setAccount((current) => {
      if (!current) return current
      if (days === null) return { ...current, subscriptionTier: 'free', subscriptionExpiresAt: null, subscriptionPlanDays: undefined }
      return { ...current, subscriptionTier: 'pro', subscriptionExpiresAt: Date.now() + days * 24 * 60 * 60 * 1000, subscriptionPlanDays: days }
    })
    track(days === null ? 'subscription_free_selected' : 'subscription_pro_selected')
  }
  const logIn = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const freshAccounts = readStoredAccounts()
    const matched = freshAccounts.find((record) => record.profile.email.trim().toLowerCase() === normalizedEmail)
    if (!matched) return false
    setAccounts(freshAccounts)
    setCompanionInvites(readStoredInvites())
    setAccount(matched.profile)
    setPassport(matched.passport)
    localStorage.setItem('cit:ready', 'true')
    setReady(true)
    setScreen('home')
    track('login_success')
    return true
  }
  const logOut = () => {
    localStorage.removeItem('cit:ready')
    setReady(false)
    setOnboardingStep(0)
    setScreen('home')
    track('logout')
  }
  const openScreen = (next: Screen) => {
    if (next === 'scan') {
      setScanImage(null)
      setScanning(false)
      setScanError('')
      setLastScanFile(null)
      setCapturedPages([])
      setSessionRisks({})
      setAnalysisPassportKey('')
    }
    setScreen(next)
    track(`${next}_open`)
  }
  const toggleSavedRestaurant = (restaurant: SavedRestaurant) => {
    setSavedRestaurants((current) => current.some((item) => item.id === restaurant.id) ? current.filter((item) => item.id !== restaurant.id) : [...current, restaurant])
    setToast(savedRestaurants.some((item) => item.id === restaurant.id) ? `${restaurant.name} ${p.removeFromSaved}` : `${restaurant.name} ${p.saved}`)
    track('restaurant_save_toggled')
  }
  const addCompanion = (email: string): CompanionAddResult => {
    const normalizedEmail = normalizeEmail(email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { ok: false, message: p.invalidEmail }
    if (!account) return { ok: false, message: p.loginBeforeInvite }
    if (normalizeEmail(account.email) === normalizedEmail) return { ok: false, message: p.cannotInviteSelf }
    const target = accounts.find((record) => normalizeEmail(record.profile.email) === normalizedEmail)
    if (!target) return { ok: false, message: p.noRegisteredUser }
    if (currentCompanions.some((companion) => companion.email === normalizedEmail)) return { ok: false, message: p.alreadyConnected }
    if (companionInvites.some((invite) => invite.status === 'pending' && ((normalizeEmail(invite.fromEmail) === normalizeEmail(account.email) && normalizeEmail(invite.toEmail) === normalizedEmail) || (normalizeEmail(invite.fromEmail) === normalizedEmail && normalizeEmail(invite.toEmail) === normalizeEmail(account.email))))) return { ok: false, message: p.invitationWaiting }
    const invite: CompanionInvite = { id: `invite-${Date.now()}-${normalizedEmail}`, fromEmail: normalizeEmail(account.email), toEmail: normalizedEmail, status: 'pending', createdAt: Date.now() }
    setCompanionInvites((current) => [...current, invite])
    setToast(`${p.toastInvitationSent} ${target.profile.username}`)
    track('companion_invited')
    return { ok: true, message: `${p.toastInvitationSent} ${target.profile.username}. ${p.invitationAcceptHint}` }
  }
  const updateInviteStatus = (inviteId: string, status: CompanionInvite['status']) => {
    setCompanionInvites((current) => current.map((invite) => invite.id === inviteId ? { ...invite, status } : invite))
    if (status === 'accepted') setToast(p.toastCompanionConnected)
    if (status === 'declined') setToast(p.toastInvitationDeclined)
    if (status === 'revoked') setToast(p.toastCompanionUnlinked)
    track(`companion_${status}`)
  }
  const removeCompanion = (inviteId: string) => {
    setActiveCompanionIds((current) => current.filter((companionId) => currentCompanions.find((companion) => companion.id === companionId)?.inviteId !== inviteId))
    updateInviteStatus(inviteId, 'revoked')
  }
  const toggleCompanion = (id: string) => setActiveCompanionIds((current) => current.includes(id) ? current.filter((companionId) => companionId !== id) : [...current, id])
  const openCompanions = (returnScreen: Screen) => { setCompanionReturnScreen(returnScreen); openScreen('companions') }
  const currentSessionOrder = sessionOrders.find((order) => order.status === 'current') || null
  const pastSessionOrders = [...sessionOrders.filter((order) => order.status === 'completed'), ...pastDiningOrders]
  const openBill = (order: DiningOrder, returnTo: Screen) => {
    setActiveBillOrder(order)
    setBillSource('order')
    setBillReceiptName('')
    setBillMode('equal')
    const tableParticipants = ['You', ...currentCompanions.map((companion) => companion.name)]
    setParticipants(tableParticipants)
    setSplitItems(Object.fromEntries(order.billItems.map((item, index) => [item.id, index % 3 === 0 ? 'You' : 'Everyone'])))
    setBillReturnScreen(returnTo)
    openScreen('bill')
  }
  const handleBillFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBillSource('receipt')
    setBillReceiptName(file.name)
    setToast(p.toastReceipt)
    track('bill_scan_success')
    event.target.value = ''
  }
  const openCamera = () => {
    if (!sessionRestaurant.trim()) {
      setToast(p.toastRestaurantFirst)
      return
    }
    cameraInputRef.current?.click()
    track('camera_open')
  }
  const requestHomeScan = (mode: 'camera' | 'upload') => {
    if (!sessionRestaurant.trim()) {
      openScreen('scan')
      setToast(p.toastRestaurantFirst)
      return
    }
    if (mode === 'camera') homeCameraInputRef.current?.click()
    else homeUploadInputRef.current?.click()
    track(`home_${mode}_clicked`)
  }
  const addCapturedPage = () => {
    setCapturedPages((current) => {
      const nextNumber = current.length ? Math.max(...current.map((page) => Number(page.title.replace(/\D/g, '')) || 0)) + 1 : 1
      return [...current, { id: Date.now(), title: `${p.pages} ${String(nextNumber).padStart(2, '0')}`, variant: current.length % 3 }]
    })
    track('camera_page_captured')
  }
  const undoCapturedPage = () => {
    setCapturedPages((current) => current.slice(0, -1))
    track('camera_page_undone')
  }
  const removeCapturedPage = (id: number) => setCapturedPages((current) => current.filter((page) => page.id !== id))
  const finishMenuScan = () => {
    const name = sessionRestaurant.trim()
    if (!name) {
      setToast(p.toastRestaurantFirst)
      openScreen('scan')
      return
    }
    setSessionRestaurant(name)
    setSessionMenu(dishes)
    setScanning(false)
    openScreen('menu')
    track('menu_scan_success')
  }
  const startScan = async (file?: File) => {
    if (!sessionRestaurant.trim()) {
      setToast(p.toastRestaurantFirst)
      return
    }
    setScanError('')
    if (!file) {
      setSessionRestaurant(sessionRestaurant.trim())
      setSessionMenu(dishes)
      setSessionRisks({})
      setAnalysisPassportKey('')
      setScanning(false)
      setScreen('menu')
      track('sample_menu_loaded')
      return
    }
    const validationError = validateMenuImage(file)
    if (validationError) {
      setScanError(validationError)
      setToast(validationError)
      return
    }
    setLastScanFile(file)
    setScanImage(URL.createObjectURL(file))
    setScanning(true)
    track('menu_scan_start')
    try {
      const result = await analyzeMenuImage(file, { restaurantName: sessionRestaurant.trim(), language, foodPassport: passport })
      setSessionRestaurant(result.restaurantName || sessionRestaurant.trim())
      setSessionMenu(result.dishes.map(mapBackendDish))
      setSessionRisks(result.risks || {})
      setAnalysisPassportKey(passportKey)
      setScanning(false)
      setScreen('menu')
      track('menu_scan_success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Menu analysis failed. Please retry or use Sample Menu.'
      setScanning(false)
      setScanError(message)
      setToast(message)
      track('menu_scan_failed')
    }
  }
  const handleCameraFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const validationError = validateMenuImage(file)
    if (validationError) {
      setScanError(validationError)
      setToast(validationError)
      return
    }
    setScanError('')
    setLastScanFile(null)
    setScanImage(URL.createObjectURL(file))
    setSessionRestaurant(sessionRestaurant.trim())
    setSessionMenu(dishes)
    setSessionRisks({})
    setAnalysisPassportKey('')
    setScanning(false)
    setScreen('menu')
    track('camera_demo_loaded')
  }
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void startScan(file) }
  const getStatusForPassport = (dish: Dish, profile: Passport): Status => {
    const activeAllergyProfiles = [...profile.allergies.map((id) => profile.allergyProfiles[id] || defaultAllergyProfile), ...(profile.otherAllergen ? [profile.allergyProfiles.other || defaultAllergyProfile] : [])]
    const hasSevereAllergy = activeAllergyProfiles.some((profile) => profile.severity === 'severe')
    const avoidsCrossContact = activeAllergyProfiles.some((profile) => profile.crossContact)
    const avoidFoods = new Set([...profile.avoidFoods, ...profile.diets.filter((id) => avoidFoodIds.includes(id))])
    if (profile.allergies.some((allergen) => allergenMatchKeys(allergen).some((key) => dish.allergens.includes(key)))) return 'CONFLICT'
    const isVegetarianProfile = ['vegetarian', 'lacto', 'ovo', 'lacto-ovo'].includes(profile.dietStyle) || profile.diets.includes('vegetarian')
    if (isVegetarianProfile && !dish.vegetarian) return 'CONFLICT'
    if ((profile.dietStyle === 'vegan' || profile.diets.includes('vegan')) && !dish.vegan) return 'CONFLICT'
    if (profile.dietStyle === 'lacto' && dish.allergens.includes('egg')) return 'CONFLICT'
    if (profile.dietStyle === 'ovo' && dish.allergens.includes('milk')) return 'CONFLICT'
    if (profile.dietStyle === 'pescatarian' && (dish.hasPork || dish.hasBeef || dish.hasPoultry)) return 'CONFLICT'
    if (avoidFoods.has('no-pork') && dish.hasPork) return 'CONFLICT'
    if (avoidFoods.has('no-beef') && dish.hasBeef) return 'CONFLICT'
    if (avoidFoods.has('no-poultry') && dish.hasPoultry) return 'CONFLICT'
    if (avoidFoods.has('no-seafood') && dish.hasSeafood) return 'CONFLICT'
    if (avoidFoods.has('no-offal') && dish.hasOffal) return 'CONFLICT'
    if ((isVegetarianProfile || profile.dietStyle === 'vegan' || profile.diets.includes('vegan') || avoidFoods.has('no-pork') || profile.faithDiet === 'halal' || profile.faithDiet === 'kosher') && dish.hasLard) return 'CONFLICT'
    if ((profile.faithDiet === 'halal' || profile.faithDiet === 'kosher') && dish.hasPork) return 'CONFLICT'
    if (profile.faithDiet === 'kosher' && dish.hasSeafood) return 'CONFLICT'
    const possibleRecipeConflict = (dish.possibleIngredients || []).some((ingredient) => {
      const lower = ingredient.toLowerCase()
      return (avoidFoods.has('no-beef') && /beef|牛肉/.test(lower)) || (profile.preferences.includes('no-scallion') && /scallion|green onion|spring onion|葱/.test(lower)) || (profile.preferences.includes('no-garlic') && /garlic|蒜/.test(lower))
    })
    if (possibleRecipeConflict) return 'WARNING'
    if (hasSevereAllergy && dish.possibleAllergens?.some((allergen) => profile.allergies.some((selected) => allergenMatchKeys(selected).includes(allergen)))) return 'WARNING'
    const cookingOilWarning = profile.allergies.some((allergen) => ['peanut', 'soy', 'sesame'].includes(allergen)) && dish.ingredients.some((ingredient) => /oil|fryer|fat|油/i.test(ingredient))
    if (cookingOilWarning) return 'WARNING'
    if (avoidsCrossContact && (dish.possibleAllergens?.length || dish.confidence < 0.9)) return 'WARNING'
    if (profile.preferences.includes('no-cilantro') && dish.hasCilantro) return 'WARNING'
    if (profile.preferences.includes('no-scallion') && dish.hasScallion) return 'WARNING'
    if (profile.preferences.includes('no-garlic') && dish.hasGarlic) return 'WARNING'
    if (profile.spiceLevel !== null && dish.spicy > profile.spiceLevel) return 'WARNING'
    if (dish.confidence < 0.7) return 'UNKNOWN'
    return 'MATCH'
  }
  const getStatus = (dish: Dish): Status => analysisPassportKey === passportKey ? sessionRisks[dish.id]?.status || getStatusForPassport(dish, passport) : getStatusForPassport(dish, passport)
  const getDiningStatus = (dish: Dish): Status => {
    const selectedPassports = [passport, ...currentCompanions.filter((companion) => activeCompanionIds.includes(companion.id)).map((companion) => companion.passport)]
    const statuses = selectedPassports.map((profile) => getStatusForPassport(dish, profile))
    if (statuses.includes('CONFLICT')) return 'CONFLICT'
    if (statuses.includes('WARNING')) return 'WARNING'
    if (statuses.includes('UNKNOWN')) return 'UNKNOWN'
    return 'MATCH'
  }
  const statusInfo = (status: Status) => ({
    MATCH: { label: t('matchLabel'), detail: t('detailsMatch'), color: 'match', icon: 'check' },
    WARNING: { label: t('warningLabel'), detail: t('possibleConflict'), color: 'warning', icon: 'alert' },
    CONFLICT: { label: t('conflictLabel'), detail: t('detailsConflict'), color: 'conflict', icon: 'close' },
    UNKNOWN: { label: t('unknownLabel'), detail: t('detailsUnknown'), color: 'unknown', icon: 'alert' },
  }[status])
  const dishName = (dish: Dish) => dish.localized[language]
  useEffect(() => {
    if (!askSheet || !selectedDish || !sessionMenu.length) return
    let active = true
    setAssistantAnswer('')
    setAssistantLoading(true)
    askDiningAssistant({ question: `What should I ask the restaurant about ${selectedDish.name}?`, language, dishes: sessionMenu.map(serializeDish), foodPassport: passport })
      .then((result) => { if (active) setAssistantAnswer(result.waiterChinese) })
      .catch(() => { if (active) setAssistantAnswer('') })
      .finally(() => { if (active) setAssistantLoading(false) })
    return () => { active = false }
  }, [askSheet, selectedDish, sessionMenu, passport, language])
  const questionFor = (dish: Dish) => assistantAnswer || (passport.allergies.includes('peanut') || dish.allergens.includes('peanut')
    ? '我对花生严重过敏。请问这道菜是否含有花生、花生油或花生酱？制作时是否会接触花生？如果无法确认，请不要为我制作。'
    : `请问${dish.zh}是否含有未列出的过敏原？制作时会与其他食材共用锅具或炸油吗？`)
  const copyQuestion = async (text = questionFor(selectedDish)) => { await navigator.clipboard?.writeText(text); setToast(p.toastQuestionCopied); track('ask_restaurant_clicked') }
  const speak = (text: string, eventName = 'question_voice_play', onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) { onEnd?.(); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    const voices = window.speechSynthesis.getVoices()
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === 'zh-cn') || voices.find((voice) => voice.lang.toLowerCase().startsWith('zh')) || null
    utterance.onend = onEnd ? () => onEnd() : null
    utterance.onerror = onEnd ? () => onEnd() : null
    window.speechSynthesis.speak(utterance)
    track(eventName)
  }
  const addToCart = (dish: Dish) => {
    if (getDiningStatus(dish) === 'CONFLICT') {
      setToast(p.toastConflict)
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.dish.id === dish.id)
      return existing
        ? current.map((item) => item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { dish, quantity: 1 }]
    })
    setSelectedSessionOrder(null)
    setToast(`${dish.localized[language]} ${p.toastAdded}`)
    track('dish_added_to_cart')
  }
  const updateCartQuantity = (dishId: string, quantity: number) => setCart((current) => quantity <= 0
    ? current.filter((item) => item.dish.id !== dishId)
    : current.map((item) => item.dish.id === dishId ? { ...item, quantity } : item))
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  const openSavedOrder = (order: DiningOrder) => {
    setAddOnOrder(null)
    setSelectedSessionOrder(order)
    setCart(order.cartSnapshot || [])
    setSessionMenu(order.menuSnapshot?.length ? order.menuSnapshot : dishes)
    openScreen('order')
    track('saved_order_open')
  }
  const startAddingToOrder = (order: DiningOrder) => {
    setAddOnOrder(order)
    setSelectedSessionOrder(null)
    setCart([])
    setSessionMenu(order.menuSnapshot?.length ? order.menuSnapshot : sessionMenu)
    openScreen('menu')
    track('add_more_dishes_started')
  }
  const deleteCurrentSession = () => {
    setSessionOrders((current) => current.filter((order) => order.status !== 'current'))
    setSessionMenu([])
    setSessionRestaurant('')
    setCart([])
    setSelectedSessionOrder(null)
    setAddOnOrder(null)
    setActiveCompanionIds([])
    setToast(p.toastDeleted)
    track('session_deleted')
  }
  const completeCartOrder = () => {
    const savedAt = Date.now()
    const savedRestaurantName = sessionRestaurant.trim() || 'Chengdu Garden'
    const orderItems = cart.map(({ dish, quantity }) => ({ id: `session-${savedAt}-${dish.id}`, label: dish.localized[language], zh: dish.zh, amount: dish.price * quantity, dish }))
    const baseOrder = addOnOrder
    const combinedCart = baseOrder ? [...(baseOrder.cartSnapshot || []), ...cart] : cart
    const combinedItems = baseOrder ? [...baseOrder.billItems, ...orderItems] : orderItems
    const completedOrder: DiningOrder = {
      id: baseOrder?.id || `session-${savedAt}`,
      restaurant: baseOrder?.restaurant || savedRestaurantName,
      initials: baseOrder?.initials || initialsForRestaurant(savedRestaurantName),
      location: baseOrder?.location || 'Shanghai · 1.2 km',
      time: localizedPostMeta[language].justNow,
      status: 'current',
      itemCount: baseOrder ? baseOrder.itemCount + cartItemCount : cartItemCount,
      total: baseOrder ? baseOrder.total + cartTotal : cartTotal,
      preview: combinedCart.map(({ dish, quantity }) => `${dish.localized[language]} ×${quantity}`).join(' · '),
      tone: baseOrder?.tone || 'order-tone-red',
      billItems: combinedItems,
      receiptItems: baseOrder ? [...baseOrder.receiptItems, ...orderItems] : orderItems,
      menuSnapshot: sessionMenu,
      cartSnapshot: combinedCart,
      passportSnapshot: baseOrder?.passportSnapshot || passport,
      companionNames: baseOrder?.companionNames || currentCompanions.filter((companion) => activeCompanionIds.includes(companion.id)).map((companion) => companion.name),
      savedAt,
    }
    setSessionOrders((current) => baseOrder
      ? current.map((order) => order.id === baseOrder.id ? completedOrder : order)
      : [{ ...completedOrder }, ...current.map((order) => ({ ...order, status: 'completed' as const }))])
    setSessionMenu(sessionMenu)
    setSelectedSessionOrder(completedOrder)
    setAddOnOrder(null)
    setCart([])
    setToast(p.toastOrderSaved)
    track('order_completed')
    openScreen('home')
  }
  const billItems = activeBillOrder ? (billSource === 'receipt' ? activeBillOrder.receiptItems : activeBillOrder.billItems) : []
  const billTotal = billItems.reduce((sum, item) => sum + item.amount, 0)
  const equalAmount = (billTotal / participants.length).toFixed(2)
  const itemTotals = participants.reduce<Record<string, number>>((acc, person) => { acc[person] = 0; return acc }, {})
  billItems.forEach((item) => { const owner = splitItems[item.id]; if (owner === 'Everyone' || !participants.includes(owner)) participants.forEach((person) => { itemTotals[person] += item.amount / participants.length }); else itemTotals[owner] += item.amount })
  const resetDemo = () => { localStorage.clear(); window.location.reload() }

  if (!ready) {
    if (account && onboardingStep === 0) return <Login language={language} onLogin={logIn} onRegister={() => setOnboardingStep(1)} />
    return <Onboarding language={language} setLanguage={setLanguage} step={onboardingStep} setStep={setOnboardingStep} passport={passport} updatePassport={updatePassport} finish={finishOnboarding} onRegister={completeRegistration} existingEmails={accounts.map((record) => record.profile.email)} t={t} />
  }

  return <div className="app-root">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <div className="app-shell">
      <header className="topbar"><button className="brand" onClick={() => openScreen('home')} aria-label={`${t('home')} · Bitewise 食见`}><LogoMark small /><span className="brand-lockup"><strong>BITEWISE</strong><small>食见</small></span></button></header>
      <main className="main-content">
        {screen === 'home' && <Home t={t} p={p} language={language} userName={account?.username || ''} passport={passport} dishes={sessionMenu} sessionRestaurant={sessionRestaurant} currentOrder={currentSessionOrder} openScreen={openScreen} onOpenOrder={openSavedOrder} onAddMore={startAddingToOrder} onDeleteSession={deleteCurrentSession} setSelectedDish={setSelectedDish} setAskSheet={setAskSheet} nearbyRestaurants={restaurantCatalog.filter((restaurant) => restaurant.source).slice(0, 6)} savedRestaurants={savedRestaurants} onToggleRestaurant={toggleSavedRestaurant} onScanAction={requestHomeScan} />}
        {screen === 'scan' && <Scan t={t} p={p} language={language} restaurantName={sessionRestaurant} setRestaurantName={setSessionRestaurant} scanImage={scanImage} scanning={scanning} scanError={scanError} canRetry={Boolean(lastScanFile)} photoInputRef={photoInputRef} fileInputRef={fileInputRef} cameraInputRef={cameraInputRef} showUploadOptions={showUploadOptions} setShowUploadOptions={setShowUploadOptions} handleFile={handleFile} handleCameraFile={handleCameraFile} startScan={startScan} onRetry={() => { if (lastScanFile) void startScan(lastScanFile) }} onOpenCamera={openCamera} onBack={() => openScreen('home')} onToast={setToast} />}
        {screen === 'camera' && <CameraCapture t={t} p={p} pages={capturedPages} onCapture={addCapturedPage} onUndo={undoCapturedPage} onDelete={removeCapturedPage} onDone={finishMenuScan} onBack={() => openScreen('scan')} />}
        {screen === 'menu' && <MenuResults t={t} p={p} language={language} dishes={sessionMenu} allDishes={sessionMenu} getStatus={getDiningStatus} cart={cart} onAddToCart={addToCart} onOpenCart={() => openScreen('cart')} companions={currentCompanions} activeCompanionIds={activeCompanionIds} onToggleCompanion={toggleCompanion} onOpenCompanions={() => openCompanions('menu')} onBack={() => openScreen('home')} onDetail={(dish) => { setSelectedDish(dish); openScreen('detail'); track('dish_view') }} />}
        {screen === 'detail' && <DishDetail t={t} p={p} language={language} dish={selectedDish} passport={passport} status={getStatus(selectedDish)} onBack={() => openScreen('menu')} onAsk={() => { setAskSheet(true); track('ask_restaurant_clicked') }} onAddToCart={() => addToCart(selectedDish)} />}
        {screen === 'cart' && <Cart t={t} p={p} language={language} cart={cart} itemCount={cartItemCount} total={cartTotal} getStatus={getDiningStatus} onBack={() => openScreen('menu')} onIncrease={(dishId) => updateCartQuantity(dishId, (cart.find((item) => item.dish.id === dishId)?.quantity || 0) + 1)} onDecrease={(dishId) => updateCartQuantity(dishId, (cart.find((item) => item.dish.id === dishId)?.quantity || 0) - 1)} onClear={() => setCart([])} onConfirm={() => { setSelectedSessionOrder(null); track('cart_confirmed'); openScreen('order') }} />}
        {screen === 'order' && <OrderPage language={language} p={p} passport={selectedSessionOrder?.passportSnapshot || passport} cart={selectedSessionOrder?.cartSnapshot || cart} savedOrder={selectedSessionOrder} onBack={() => openScreen('cart')} onComplete={completeCartOrder} onAddMore={(order) => startAddingToOrder(order)} onSplitBill={(order) => openBill(order, 'order')} onHome={() => openScreen('home')} onSpeak={(text) => speak(text, 'waiter_voice_play')} />}
        {screen === 'bill' && activeBillOrder && <Bill t={t} p={p} language={language} billInputRef={billInputRef} handleFile={handleBillFile} billMode={billMode} setBillMode={setBillMode} participants={participants} setParticipants={setParticipants} splitItems={splitItems} setSplitItems={setSplitItems} billItems={billItems} billTotal={billTotal} equalAmount={equalAmount} itemTotals={itemTotals} order={activeBillOrder} billSource={billSource} billReceiptName={billReceiptName} setBillSource={(source) => { setBillSource(source); if (source === 'order') setBillReceiptName('') }} onBack={() => openScreen(billReturnScreen)} onToast={setToast} />}
        {screen === 'find' && <FindFood t={t} p={p} language={language} restaurants={restaurantCatalog} savedRestaurants={savedRestaurants} pastOrders={pastSessionOrders} onToggleRestaurant={toggleSavedRestaurant} onBack={() => openScreen('home')} />}
        {screen === 'community' && <FindFood variant="community" t={t} p={p} language={language} restaurants={restaurantCatalog} savedRestaurants={savedRestaurants} pastOrders={pastSessionOrders} onToggleRestaurant={toggleSavedRestaurant} onBack={() => openScreen('home')} />}
        {screen === 'orders' && <Orders language={language} currentOrder={currentSessionOrder} pastOrders={pastSessionOrders} onOpenOrder={openSavedOrder} onSplitBill={(order) => openBill(order, 'orders')} />}
        {screen === 'profile' && account && <Profile t={t} p={p} language={language} user={account} passport={passport} restaurants={savedRestaurants} companions={currentCompanions} pendingInviteCount={incomingCompanionInvites.length} onOpenSavedRestaurants={() => openScreen('savedRestaurants')} onOpenCompanions={() => openCompanions('profile')} onOpenPassport={() => openScreen('passport')} onLanguageChange={setLanguage} onAvatarChange={updateAvatar} onSubscriptionChange={updateSubscription} onLogout={logOut} onReset={resetDemo} />}
        {screen === 'passport' && <PassportPage language={language} t={t} passport={passport} updatePassport={updatePassport} onBack={() => openScreen('profile')} />}
        {screen === 'savedRestaurants' && <SavedRestaurantsPage p={p} language={language} restaurants={savedRestaurants} onToggleRestaurant={toggleSavedRestaurant} onOpenFind={() => openScreen('find')} onBack={() => openScreen('profile')} />}
        {screen === 'companions' && account && <CompanionsPage p={p} account={account} accounts={accounts} companions={currentCompanions} incomingInvites={incomingCompanionInvites} outgoingInvites={outgoingCompanionInvites} onAddCompanion={addCompanion} onAcceptInvite={(inviteId) => updateInviteStatus(inviteId, 'accepted')} onDeclineInvite={(inviteId) => updateInviteStatus(inviteId, 'declined')} onRemoveCompanion={removeCompanion} onOpenCompanion={(email) => { setSelectedCompanionEmail(email); openScreen('companionDetail') }} onBack={() => openScreen(companionReturnScreen)} />}
        {screen === 'companionDetail' && selectedCompanion && <CompanionDetailPage p={p} language={language} companion={selectedCompanion} onUnlink={() => { removeCompanion(selectedCompanion.inviteId); openScreen('companions') }} onBack={() => openScreen('companions')} />}
      </main>
      {screen === 'home' && <><input ref={homeCameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleCameraFile} hidden /><input ref={homeUploadInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} hidden /></>}
      {(['home', 'find', 'community', 'orders', 'profile'].includes(screen)) && <BottomNav language={language} screen={screen} openScreen={openScreen} t={t} />}
    </div>
    {askSheet && <AskSheet t={t} p={p} language={language} dish={selectedDish} question={questionFor(selectedDish)} loading={assistantLoading} onClose={() => setAskSheet(false)} onCopy={copyQuestion} onSpeak={(text, onEnd) => speak(text, 'question_voice_play', onEnd)} />}
    {toast && <div className="toast"><Icon name="check" size={16} /> {toast}</div>}
  </div>
}

function Onboarding({ language, setLanguage, step, setStep, passport, updatePassport, finish, onRegister, existingEmails, t }: { language: Language; setLanguage: (language: Language) => void; step: number; setStep: (step: number) => void; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void; finish: () => void; onRegister: (profile: UserProfile) => void; existingEmails: string[]; t: (key: CopyKey) => string }) {
  const text = onboardingCopy[language]
  return <div className="onboarding-root"><div className={`onboarding-frame ${step === 0 ? 'onboarding-frame-welcome' : ''}`}><div className="onboarding-progress"><LogoMark /><div className="onboarding-brand"><strong>BITEWISE</strong><small>食见</small></div></div>{step === 0 ? <WelcomePage onContinue={() => setStep(1)} /> : step === 1 ? <section className="onboarding-card"><h1>{t('selectLanguage')}</h1><p className="lead">{t('languageSub')}</p><div className="language-grid">{languages.map((item) => <button type="button" key={item.code} className={`language-card ${language === item.code ? 'selected' : ''}`} onClick={() => setLanguage(item.code)}><span>{item.label}</span><small>{item.native}</small>{language === item.code && <span className="selected-check"><Icon name="check" size={14} /></span>}</button>)}</div><Button className="full-button" onClick={() => setStep(2)} icon="arrow">{t('next')}</Button><p className="safe-note"><Icon name="shield" size={16} /> {text.clarityNote}</p></section> : step === 2 ? <RegisterPage language={language} existingEmails={existingEmails} onBack={() => setStep(1)} onContinue={onRegister} /> : <PassportEditor language={language} t={t} passport={passport} updatePassport={updatePassport} onBack={() => setStep(2)} onFinish={finish} />}</div></div>
}

function RegisterPage({ language, existingEmails, onBack, onContinue }: { language: Language; existingEmails: string[]; onBack: () => void; onContinue: (profile: UserProfile) => void }) {
  const text = accountCopy[language]
  const page = pageCopy[language]
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [emailTaken, setEmailTaken] = useState(false)
  const canContinue = username.trim().length > 0 && email.trim().length > 0 && !emailTaken
  const submit = () => {
    const normalizedEmail = normalizeEmail(email)
    if (existingEmails.some((storedEmail) => normalizeEmail(storedEmail) === normalizedEmail)) {
      setEmailTaken(true)
      return
    }
    onContinue({ username: username.trim(), email: email.trim() })
  }
  return <section className="onboarding-card auth-card">
    <button className="back-link" onClick={onBack}><Icon name="back" size={18} /> {onboardingCopy[language].back}</button>
    <h1>{text.registerTitle}</h1>
    <p className="lead">{text.registerSubtitle}</p>
    <label className="field-label" htmlFor="register-username">{text.usernameLabel}</label>
    <input className="auth-input" id="register-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={text.usernamePlaceholder} autoComplete="name" autoFocus />
    <label className="field-label" htmlFor="register-email">{text.emailLabel}</label>
    <input className={`auth-input ${emailTaken ? 'has-error' : ''}`} id="register-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailTaken(false) }} placeholder={text.emailPlaceholder} autoComplete="email" />
    {emailTaken && <p className="auth-error">{page.emailTaken}</p>}
    <Button className="full-button" disabled={!canContinue} onClick={submit} icon="arrow">{text.continueLabel}</Button>
  </section>
}

function Login({ language, onLogin, onRegister }: { language: Language; onLogin: (email: string) => boolean; onRegister: () => void }) {
  const text = accountCopy[language]
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)
  const submit = () => { const ok = onLogin(email); setError(!ok) }
  return <div className="onboarding-root"><div className="onboarding-frame"><div className="onboarding-progress"><LogoMark /><div className="onboarding-brand"><strong>BITEWISE</strong><small>食见</small></div></div><section className="onboarding-card auth-card"><h1>{text.loginTitle}</h1><p className="lead">{text.loginSubtitle}</p><label className="field-label" htmlFor="login-email">{text.emailLabel}</label><input className={`auth-input ${error ? 'has-error' : ''}`} id="login-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(false) }} placeholder={text.loginEmailPlaceholder} autoComplete="email" autoFocus onKeyDown={(event) => { if (event.key === 'Enter') submit() }} />{error && <p className="auth-error">{text.loginError}</p>}<Button className="full-button" disabled={!email.trim()} onClick={submit} icon="arrow">{text.loginButton}</Button><button type="button" className="auth-register-link" onClick={onRegister}><Icon name="plus" size={15} /> {text.registerNewUser}</button></section></div></div>
}

function WelcomePage({ onContinue }: { onContinue: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const language = languages[activeIndex].code
  const content = onboardingCopy[language]
  useEffect(() => {
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % languages.length), 3600)
    return () => window.clearInterval(timer)
  }, [])
  return <section className="onboarding-welcome">
    <div className="welcome-art" aria-hidden="true">
      <div className="welcome-orbit welcome-orbit-one" />
      <div className="welcome-orbit welcome-orbit-two" />
      <div className="welcome-plate"><span>🍜</span><i>食</i></div>
      <div className="welcome-note welcome-note-menu"><Icon name="scan" size={16} /><span>{content.welcomeMenuNote}</span></div>
      <div className="welcome-note welcome-note-safe"><Icon name="shield" size={16} /><span>{content.welcomeFitNote}</span></div>
    </div>
    <div className="welcome-copy">
      <span className="welcome-language" aria-live="polite">{languages[activeIndex].label}</span>
      <h1>{content.welcomeTitle}</h1>
      <p className="lead">{content.welcomeSubtitle}</p>
      <Button className="full-button" onClick={onContinue} icon="arrow">{content.welcomeCta}</Button>
      <p className="welcome-footnote">{content.welcomeFootnote}</p>
    </div>
  </section>
}

function AllergenStatusIndicators({ profile, t }: { profile: AllergyProfile; t: (key: CopyKey) => string }) {
  return <span className="allergen-status-row" aria-label={`${t(profile.severity)} · ${t('crossContact')}`}>
    <span className={`allergen-status-badge allergen-status-cross-${profile.crossContact ? 'on' : 'off'}`} title={t('crossContact')}><CrossContactIcon blocked={profile.crossContact} size={12} /></span>
  </span>
}

function AllergenModal({ language, t, id, label, order, profile, otherValue, isExisting, onOtherChange, onProfileChange, onBack, onSave, onRemove }: { language: Language; t: (key: CopyKey) => string; id: string; label: string; order?: number; profile: AllergyProfile; otherValue: string; isExisting: boolean; onOtherChange: (value: string) => void; onProfileChange: (profile: AllergyProfile) => void; onBack: () => void; onSave: () => void; onRemove: () => void }) {
  const text = onboardingCopy[language]
  const isOther = id === 'other'
  const displayLabel = isOther ? otherValue.trim() || label : label
  const canSave = !isOther || Boolean(otherValue.trim())

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onBack() }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [onBack])

  return createPortal(<div className="allergen-modal-backdrop">
    <section className="allergen-modal" role="dialog" aria-modal="true" aria-labelledby="allergen-modal-title">
      <div className="allergen-modal-topbar">
        <button type="button" className="allergen-modal-back" onClick={onBack}><Icon name="back" size={17} /> {text.back}</button>
        <span>{t('allergies')}</span>
      </div>
      <div className="allergen-modal-heading">
        {order ? <img src={`/allergen-icons/${String(order).padStart(2, '0')}.png`} alt="" /> : <span className="allergen-modal-other-icon">＋</span>}
        <div><span>{text.personalSettings}</span><h2 id="allergen-modal-title">{displayLabel}</h2></div>
      </div>
      {isOther && <label className="allergen-modal-input"><span>{text.otherAllergen}</span><input value={otherValue} onChange={(event) => onOtherChange(event.target.value)} placeholder={text.otherAllergenPlaceholder} autoFocus /></label>}
      <div className="allergen-modal-question">
        <div><strong>{text.severityQuestion}</strong><small>{text.severityHint(displayLabel)}</small></div>
        <div className="allergen-modal-severity">{(['mild', 'moderate', 'severe'] as const).map((value) => <button type="button" key={value} className={`allergen-severity-option allergen-severity-option-${value} ${profile.severity === value ? 'active' : ''}`} onClick={() => onProfileChange({ ...profile, severity: value })}><span>{t(value)}</span></button>)}</div>
      </div>
      <button type="button" className={`allergen-modal-cross-contact ${profile.crossContact ? 'active' : ''}`} onClick={() => onProfileChange({ ...profile, crossContact: !profile.crossContact })}>
        <span className="allergen-modal-cross-icon"><CrossContactIcon blocked={profile.crossContact} size={21} /></span>
        <span><strong>{t('crossContact')}</strong><small>{text.crossContactHint(displayLabel)}</small></span>
        <span className={`toggle ${profile.crossContact ? 'on' : ''}`}><span /></span>
      </button>
      <div className={`allergen-modal-actions ${isExisting ? 'has-remove' : 'without-remove'}`}>
        {isExisting && <button type="button" className="allergen-modal-remove" onClick={onRemove}><Icon name="close" size={15} /> {removeAllergenLabels[language]}</button>}
        <Button variant="secondary" onClick={onBack} icon="back">{text.back}</Button>
        <Button onClick={onSave} icon="check" disabled={!canSave}>{text.saveChanges}</Button>
      </div>
    </section>
  </div>, document.body)
}

function AllergenSection({ language, t, passport, updatePassport }: { language: Language; t: (key: CopyKey) => string; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void }) {
  const [editingAllergen, setEditingAllergen] = useState<string | null>(null)
  const [draftProfile, setDraftProfile] = useState<AllergyProfile>(defaultAllergyProfile)
  const [draftOther, setDraftOther] = useState('')
  const text = onboardingCopy[language]
  const otherVisible = Boolean(passport.otherAllergen.trim())
  const updateProfile = (id: string, key: keyof AllergyProfile, value: AllergyProfile[keyof AllergyProfile]) => updatePassport(`allergyProfile:${id}:${key}`, value as string | boolean)
  const editingOption = editingAllergen ? allergyOptions.find((item) => item.id === editingAllergen) : undefined
  const editingLabel = editingOption ? allergenLabel(language, editingOption.id, editingOption.label) : allergenLabel(language, 'other', 'Other')
  const editingIsExisting = editingAllergen === 'other' ? otherVisible : Boolean(editingAllergen && passport.allergies.includes(editingAllergen))

  const openAllergen = (id: string) => {
    setEditingAllergen(id)
    setDraftProfile({ ...(passport.allergyProfiles[id] || defaultAllergyProfile) })
    setDraftOther(id === 'other' ? passport.otherAllergen : '')
  }
  const closeAllergen = () => setEditingAllergen(null)
  const saveAllergen = () => {
    if (!editingAllergen) return
    if (editingAllergen === 'other') {
      const otherAllergen = draftOther.trim()
      if (!otherAllergen) return
      updatePassport('otherAllergen', otherAllergen)
      updateProfile('other', 'severity', draftProfile.severity)
      updateProfile('other', 'crossContact', draftProfile.crossContact)
    } else {
      if (!passport.allergies.includes(editingAllergen)) updatePassport('allergies', editingAllergen)
      updateProfile(editingAllergen, 'severity', draftProfile.severity)
      updateProfile(editingAllergen, 'crossContact', draftProfile.crossContact)
    }
    setEditingAllergen(null)
  }
  const removeAllergen = () => {
    if (!editingAllergen) return
    if (editingAllergen === 'other') updatePassport('otherAllergen', '')
    else if (passport.allergies.includes(editingAllergen)) updatePassport('allergies', editingAllergen)
    setEditingAllergen(null)
  }

  return <div className="allergen-section">
    <div className="passport-section-heading allergen-heading">
      <div><label className="field-label">{t('allergies')}</label><p>{text.selectAllToAvoid}</p></div>
    </div>
    <div className="passport-section-body allergen-section-body">
      <div className="allergen-grid">
        {allergyOptions.map((item) => {
          const selected = passport.allergies.includes(item.id)
          const profile = passport.allergyProfiles[item.id] || defaultAllergyProfile
          return <button type="button" key={item.id} aria-pressed={selected} className={`allergen-card ${selected ? `selected allergen-severity-${profile.severity}` : ''}`} onClick={() => openAllergen(item.id)}>
            <span className="allergen-number">{item.order}</span>
            <img className="allergen-icon" src={`/allergen-icons/${String(item.order).padStart(2, '0')}.png`} alt="" />
            <span className="allergen-label">{allergenLabel(language, item.id, item.label)}</span>
            {selected && <><span className="allergen-check"><Icon name="check" size={13} /></span><AllergenStatusIndicators profile={profile} t={t} /></>}
          </button>
        })}
        <button type="button" aria-pressed={otherVisible} className={`allergen-card allergen-card-other ${otherVisible ? `selected allergen-severity-${(passport.allergyProfiles.other || defaultAllergyProfile).severity}` : ''}`} onClick={() => openAllergen('other')}>
          <span className="allergen-icon">＋</span>
          <span className="allergen-label">{otherVisible ? passport.otherAllergen : allergenLabel(language, 'other', 'Other')}</span>
          <span className="allergen-card-hint">{text.addOne}</span>
          {otherVisible && <><span className="allergen-check"><Icon name="check" size={13} /></span><AllergenStatusIndicators profile={passport.allergyProfiles.other || defaultAllergyProfile} t={t} /></>}
        </button>
      </div>
    </div>
    {editingAllergen && <AllergenModal language={language} t={t} id={editingAllergen} label={editingLabel} order={editingOption?.order} profile={draftProfile} otherValue={draftOther} isExisting={editingIsExisting} onOtherChange={setDraftOther} onProfileChange={setDraftProfile} onBack={closeAllergen} onSave={saveAllergen} onRemove={removeAllergen} />}
  </div>
}

function DietPreferenceSection({ language, passport, updatePassport }: { language: Language; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void }) {
  const text = onboardingCopy[language]
  const localizedDietStyles = dietStyleOptions.map((item) => ({ ...item, ...passportOptionTranslations[language].dietStyle[item.id] }))
  const localizedFaithDiets = faithDietOptions.map((item) => ({ ...item, ...passportOptionTranslations[language].faithDiet[item.id] }))
  const localizedAvoidFoods = avoidFoodOptions.map((item) => ({ ...item, label: passportOptionTranslations[language].avoidFood[item.id] }))

  return <section className="diet-preference-section">
    <div className="passport-section-heading">
      <div><label className="field-label">{text.dietaryProfile}</label><p>{text.dietaryProfileHint}</p></div>
    </div>

    <div className="passport-section-body dietary-profile-body">
      <div className="passport-question">
        <div className="passport-question-heading"><strong>{text.howDoYouEat}</strong><small>{text.chooseEatingPattern}</small></div>
        <div className="passport-option-grid four-columns">
          {localizedDietStyles.map((item) => <button type="button" key={item.id} className={`passport-option-card ${passport.dietStyle === item.id ? 'selected' : ''}`} onClick={() => updatePassport('dietStyle', item.id)}>
            <span className={`passport-option-icon ${item.id === 'none' ? 'passport-option-symbol' : ''}`}>{item.icon}</span><strong>{item.label}</strong><small>{item.hint}</small>
          </button>)}
        </div>
      </div>

      <div className="passport-question">
        <div className="passport-question-heading"><strong>{text.faithRequirements}</strong><small>{text.faithHint}</small></div>
        <div className="passport-option-grid four-columns">
          {localizedFaithDiets.map((item) => <button type="button" key={item.id} className={`passport-option-card ${passport.faithDiet === item.id ? 'selected' : ''}`} onClick={() => updatePassport('faithDiet', item.id)}>
            <span className="passport-option-icon passport-option-symbol">{item.icon}</span><strong>{item.label}</strong><small>{item.hint}</small>
          </button>)}
        </div>
        {passport.faithDiet === 'other' && <div className="passport-inline-input"><label htmlFor="faith-other">{text.faithOtherLabel}</label><input id="faith-other" value={passport.faithOther} onChange={(event) => updatePassport('faithOther', event.target.value)} placeholder={text.faithOtherPlaceholder} /></div>}
      </div>

      <div className="passport-question">
        <div className="passport-question-heading"><strong>{text.foodsToLeaveOut}</strong><small>{text.meatSeafoodHint}</small></div>
        <div className="passport-chip-grid">
          {localizedAvoidFoods.map((item) => <button type="button" key={item.id} className={`passport-chip ${passport.avoidFoods.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('avoidFoods', item.id)}><span>{item.icon}</span>{item.label}</button>)}
        </div>
      </div>

    </div>
  </section>
}

function EverydayPreferenceSection({ language, passport, updatePassport }: { language: Language; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void }) {
  const spiceValue = passport.spiceLevel ?? 2
  const text = onboardingCopy[language]
  const localizedPreferences = preferenceOptions.map((item) => ({ ...item, label: passportOptionTranslations[language].preference[item.id] }))

  return <section className="everyday-preference-section">
    <div className="passport-section-heading">
      <div><label className="field-label">{text.everydayTitle}</label><p>{text.everydayHint}</p></div>
    </div>

    <div className="passport-section-body everyday-preference-body">
      <div className="passport-question">
        <div className="passport-question-heading"><strong>{text.spiceQuestion}</strong><small>{text.spiceHint}</small></div>
        <div className="spice-control">
          <span className="spice-illustration" aria-hidden="true">{spiceValue === 0 ? <Icon name="chili" size={22} /> : '🌶️'.repeat(spiceValue)}</span>
          <input type="range" min="0" max="3" step="1" value={spiceValue} onChange={(event) => updatePassport('spiceLevel', Number(event.target.value))} aria-label={text.spiceQuestion} />
          <div className="spice-scale"><span>{text.spiceCannot}</span><span>{text.spiceLow}</span><span>{text.spiceMedium}</span><span>{text.spiceAny}</span></div>
        </div>
      </div>

      <div className="passport-question">
        <div className="passport-question-heading"><strong>{text.otherPreferences}</strong><small>{text.preferenceHint}</small></div>
        <div className="passport-chip-grid preference-chip-grid">
          {localizedPreferences.map((item) => <button type="button" key={item.id} className={`passport-chip ${passport.preferences.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('preferences', item.id)}><span>{item.icon}</span>{item.label}</button>)}
        </div>
      </div>
    </div>
  </section>
}

function PassportEditor({ language, t, passport, updatePassport, onBack, onFinish, finishLabel, finishIcon = 'scan' }: { language: Language; t: (key: CopyKey) => string; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void; onBack: () => void; onFinish: () => void; finishLabel?: string; finishIcon?: string }) {
  const text = onboardingCopy[language]
  return <section className="onboarding-card passport-onboarding"><button className="back-link" onClick={onBack}><Icon name="back" size={18} /> {text.back}</button><h1>{t('anything')}</h1><p className="lead">{t('passportSub')}</p><AllergenSection language={language} t={t} passport={passport} updatePassport={updatePassport} /><DietPreferenceSection language={language} passport={passport} updatePassport={updatePassport} /><EverydayPreferenceSection language={language} passport={passport} updatePassport={updatePassport} /><Button className="full-button" onClick={onFinish} icon={finishIcon}>{finishLabel || t('save')}</Button></section>
}

function Home({ t, p, language, userName, passport, dishes: sessionDishes, sessionRestaurant, currentOrder, openScreen, onOpenOrder, onAddMore, onDeleteSession, setSelectedDish, setAskSheet, nearbyRestaurants, savedRestaurants, onToggleRestaurant, onScanAction }: { t: (key: CopyKey) => string; p: PageCopy; language: Language; userName: string; passport: Passport; dishes: Dish[]; sessionRestaurant: string; currentOrder: DiningOrder | null; openScreen: (screen: Screen) => void; onOpenOrder: (order: DiningOrder) => void; onAddMore: (order: DiningOrder) => void; onDeleteSession: () => void; setSelectedDish: (dish: Dish) => void; setAskSheet: (open: boolean) => void; nearbyRestaurants: SavedRestaurant[]; savedRestaurants: SavedRestaurant[]; onToggleRestaurant: (restaurant: SavedRestaurant) => void; onScanAction: (mode: 'camera' | 'upload') => void }) {
  const homeText = homeCopy[language]
  const hasSavedOrder = Boolean(currentOrder?.cartSnapshot?.length)
  const hasScannedMenu = sessionDishes.length > 0
  const hasOngoingSession = hasScannedMenu || Boolean(currentOrder)
  const savedMenuCount = currentOrder?.menuSnapshot?.length || sessionDishes.length
  const restaurantName = currentOrder?.restaurant || sessionRestaurant
  const restaurantInitials = currentOrder?.initials || initialsForRestaurant(sessionRestaurant)

  return <div className="page page-home">
    <section className="home-scan-card home-scan-card-minimal" aria-label={`${homeText.takePhoto} / ${homeText.uploadFromFile}`}>
      <div className="home-scan-actions">
        <button className="home-scan-action home-scan-action-photo" type="button" aria-label={homeText.takePhoto} onClick={() => onScanAction('camera')}><span className="home-scan-action-icon"><Icon name="camera" size={22} /></span><span><strong>{homeText.takePhoto}</strong></span></button>
        <button className="home-scan-action home-scan-action-upload" type="button" aria-label={homeText.uploadFromFile} onClick={() => onScanAction('upload')}><span className="home-scan-action-icon"><Icon name="upload" size={22} /></span><span><strong>{homeText.uploadFromFile}</strong><small>{p.uploadedPreview}</small></span></button>
      </div>
    </section>
    {hasOngoingSession && <section className="session-section home-session-section"><div className="section-heading"><div><span className="home-section-kicker">{homeText.ongoingSession}</span><h2>{restaurantName}</h2></div><span className="status-chip match"><span className="status-dot" /> {hasSavedOrder ? p.orderSaved : t('menuReady')}</span></div><div className="session-card"><div className="session-meta"><span className="restaurant-avatar">{restaurantInitials}</span><span className="session-meta-copy"><strong className="session-restaurant-name">{restaurantName}</strong><strong className="session-time">{hasSavedOrder && currentOrder ? currentOrder.time : p.tonight}</strong>{hasSavedOrder && currentOrder ? <small className="session-order-summary"><span>{currentOrder.itemCount} {p.dishesOrdered}</span><b className="session-total">¥{currentOrder.total}</b></small> : <small>{`${savedMenuCount} ${p.menuDishes} · ${passport.diets.includes('vegetarian') ? p.vegetarian : p.passportActive}`}</small>}</span></div><div className="session-actions"><div className="session-primary-actions"><button className="session-action-primary" type="button" onClick={() => hasSavedOrder && currentOrder ? onAddMore(currentOrder) : openScreen('menu')}><Icon name="plus" size={17} /> {hasSavedOrder ? p.addMoreDishes : t('openSession')}</button>{hasSavedOrder && currentOrder ? <button className="session-action-secondary" type="button" onClick={() => onOpenOrder(currentOrder)}><Icon name="receipt" size={17} /> {p.viewOrder}</button> : hasScannedMenu ? <button className="session-action-secondary" type="button" onClick={() => { setSelectedDish(sessionDishes[0]); setAskSheet(true) }}><Icon name="alert" size={17} /> {p.reviewFlags}</button> : null}</div><button className="session-delete-action" type="button" onClick={onDeleteSession}><Icon name="trash" size={16} /> {p.deleteSession}</button></div></div></section>}
    <section className="home-nearby-section home-nearby-minimal" aria-labelledby="home-nearby-title"><div className="home-nearby-heading"><div><span className="home-section-kicker">{homeText.location}</span><h2 id="home-nearby-title">{homeText.nearbyFood}</h2><p>{homeText.nearbyDescription}</p></div><Icon name="compass" size={22} /></div><div className="home-restaurant-grid">{nearbyRestaurants.map((restaurant, index) => {
      const restaurantText = localizedRestaurant(language, restaurant)
      const displayName = restaurantText.name || restaurant.name
      const categoryLabel = restaurantText.cuisine.split(' · ')[0] || homeText.featured
      const saved = savedRestaurants.some((item) => item.id === restaurant.id)
      const imageSrc = homeRestaurantImageSrc[restaurant.id] || sessionDishes[index % sessionDishes.length]?.imageSrc || '/dish-photos/kung-pao.png'
      const distance = restaurant.distanceKm === undefined ? '—' : `${restaurant.distanceKm.toFixed(1)} km ${homeText.distance}`
      return <article className="home-restaurant-card" key={restaurant.id}><div className="home-restaurant-media"><img src={imageSrc} alt={`${homeText.restaurantPhotoAlt} ${displayName}`} loading={index < 2 ? 'eager' : 'lazy'} /><span className="home-restaurant-type">{categoryLabel}</span><button type="button" className={`home-restaurant-save ${saved ? 'saved' : ''}`} onClick={() => onToggleRestaurant(restaurant)} aria-pressed={saved} aria-label={saved ? `${p.removeFromSaved} ${displayName}` : `${p.save} ${displayName}`}><Icon name="bookmark" size={17} /></button><span className="home-restaurant-rating"><Icon name="star" size={13} /> {restaurant.rating?.toFixed(1) || '—'}</span></div><div className="home-restaurant-body"><div className="home-restaurant-title"><h3>{displayName}</h3><span>{distance}</span></div><p className="home-restaurant-cuisine">{restaurantText.cuisine}</p><div className="home-restaurant-location"><Icon name="pin" size={13} /> <span>{restaurant.address || restaurantText.location}</span></div><small className="home-restaurant-note"><Icon name="shield" size={13} /> {restaurantText.why}</small></div></article>
    })}</div></section>
  </div>
}

function Scan({ t, p, language, restaurantName, setRestaurantName, scanImage, scanning, scanError, canRetry, photoInputRef, fileInputRef, cameraInputRef, showUploadOptions, setShowUploadOptions, handleFile, handleCameraFile, startScan, onRetry, onOpenCamera, onBack, onToast }: { t: (key: CopyKey) => string; p: PageCopy; language: Language; restaurantName: string; setRestaurantName: (value: string) => void; scanImage: string | null; scanning: boolean; scanError: string; canRetry: boolean; photoInputRef: RefObject<HTMLInputElement>; fileInputRef: RefObject<HTMLInputElement>; cameraInputRef: RefObject<HTMLInputElement>; showUploadOptions: boolean; setShowUploadOptions: (open: boolean) => void; handleFile: (event: ChangeEvent<HTMLInputElement>) => void; handleCameraFile: (event: ChangeEvent<HTMLInputElement>) => void; startScan: (file?: File) => void | Promise<void>; onRetry: () => void; onOpenCamera: () => void; onBack: () => void; onToast: (message: string) => void }) {
  const hasRestaurantName = restaurantName.trim().length > 0
  const uploadText = uploadSourceCopy[language]
  const chooseFrom = (inputRef: RefObject<HTMLInputElement>) => {
    setShowUploadOptions(false)
    inputRef.current?.click()
  }
  const handleSelectedFile = (event: ChangeEvent<HTMLInputElement>) => {
    setShowUploadOptions(false)
    handleFile(event)
  }
  const requestUpload = () => {
    if (!hasRestaurantName) {
      onToast(p.toastRestaurantFirst)
      return
    }
    setShowUploadOptions(true)
  }
  return <div className="page page-narrow page-scan">
    <PageHeader title={t('scanMenu')} kicker={`${p.step} 01 · ${t('capture')}`} backLabel={p.back} onBack={onBack} />
    <div className="scan-intro"><h1>{t('scanTitle')}</h1><p>{t('scanSubTitle')}</p></div>
    <div className="restaurant-name-field"><label htmlFor="restaurant-name">{p.whereEating}</label><input id="restaurant-name" value={restaurantName} onChange={(event) => setRestaurantName(event.target.value)} placeholder={p.restaurantPlaceholder} disabled={scanning} required /><small>{p.restaurantHelper}</small></div>
    <div className={`scan-frame ${scanImage ? 'has-image' : ''}`}>{scanImage ? <img src={scanImage} alt={p.uploadedPreview} /> : <><div className="scan-corners" /><div className="scan-placeholder"><span className="menu-paper"><b>今日菜单</b><span>宫保鸡丁　　 ¥38</span><span>麻婆豆腐　　 ¥28</span><span>清炒时蔬　　 ¥22</span><span>酸辣汤　　　 ¥18</span></span><div className="scan-line" /></div></>}</div>
    <div className="tip-grid"><div><Icon name="spark" size={17} /><span>{t('avoidGlare')}</span></div><div><Icon name="scan" size={17} /><span>{t('keepFlat')}</span></div><div><Icon name="copy" size={17} /><span>{t('everyPage')}</span></div></div>
    <input ref={photoInputRef} type="file" accept="image/*" onChange={handleSelectedFile} hidden />
    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSelectedFile} hidden />
    <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleCameraFile} hidden />
    {scanning ? <div className="analysis-card"><span className="loader" /><span><strong>{t('analyzing')}</strong><small>{t('analysisSub')}</small></span></div> : scanError ? <div className="analysis-error"><strong>Menu analysis failed</strong><p>{scanError}</p><div className="analysis-error-actions"><Button onClick={onRetry} icon="refresh" disabled={!canRetry}>Retry</Button><Button variant="secondary" onClick={requestUpload} icon="upload">Choose another photo</Button></div></div> : <><Button className="full-button" onClick={onOpenCamera} icon="camera">{t('capture')}</Button><Button className="full-button" variant="secondary" onClick={requestUpload} icon="upload">{scanImage ? p.chooseAnotherPhoto : t('upload')}</Button><button className="demo-link" onClick={() => void startScan()}><Icon name="spark" size={16} /> {t('sampleMenu')}</button></>}
    {showUploadOptions && createPortal(<div className="upload-source-backdrop" role="presentation" onClick={() => setShowUploadOptions(false)}><section className="upload-source-sheet" role="dialog" aria-modal="true" aria-labelledby="upload-source-title" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><h2 id="upload-source-title">{uploadText.title}</h2><p>{uploadText.subtitle}</p><div className="upload-source-actions"><Button onClick={() => chooseFrom(photoInputRef)} icon="camera">{uploadText.photos}</Button><Button variant="secondary" onClick={() => chooseFrom(fileInputRef)} icon="upload">{uploadText.files}</Button><Button variant="ghost" onClick={() => setShowUploadOptions(false)}>{uploadText.cancel}</Button></div></section></div>, document.body)}
  </div>
}

function CameraCapture({ t, p, pages, onCapture, onUndo, onDelete, onDone, onBack }: { t: (key: CopyKey) => string; p: PageCopy; pages: CapturedPage[]; onCapture: () => void; onUndo: () => void; onDelete: (id: number) => void; onDone: () => void; onBack: () => void }) {
  const [reviewing, setReviewing] = useState(false)
  const [showCapturedPages, setShowCapturedPages] = useState(false)
  const hasPages = pages.length > 0
  const beginCapture = () => { setReviewing(true); setShowCapturedPages(false) }
  const confirmCapture = () => { onCapture(); setReviewing(false); setShowCapturedPages(false) }
  const focusViewfinder = () => { setShowCapturedPages(false); document.querySelector<HTMLElement>('.camera-viewport')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }

  return <div className="page page-narrow page-camera">
    <PageHeader title={t('capture')} kicker={`${p.step} 01 · ${p.pages}`} backLabel={p.back} onBack={onBack} />
    <div className="camera-intro"><strong>{p.keepWholeMenu}</strong><small>{p.ocrReady}</small></div>
    <div className={`camera-stage ${reviewing ? 'camera-stage-review' : ''}`}>
      <div className="camera-viewport">
        <div className={`camera-scene ${reviewing ? 'camera-scene-review' : ''}`}>
          <div className={`camera-menu-sheet ${reviewing ? 'camera-menu-sheet-review' : ''}`}><b>今日菜单</b><span>宫保鸡丁　　 ¥38</span><span>麻婆豆腐　　 ¥28</span><span>清炒时蔬　　 ¥22</span><span>酸辣汤　　　 ¥18</span><span>香煎茄子　　 ¥26</span></div>
          <div className="camera-boundary"><i /><i /><i /><i /></div>
          {!reviewing && <div className="camera-scan-line" />}
        </div>
        {!reviewing && <span className="camera-hint">{p.moveCloser}</span>}
        {!reviewing && hasPages && <Button className="camera-preview-done" onClick={onDone} icon="check">{p.doneScanning}</Button>}
      </div>
      {reviewing ? <div className="camera-controls camera-review-controls">
        <Button className="camera-review-action" variant="secondary" onClick={() => setReviewing(false)} icon="refresh">{p.retake}</Button>
        <Button className="camera-review-action" onClick={confirmCapture} icon="check">{p.usePhoto}</Button>
      </div> : <div className={`camera-controls ${hasPages ? 'camera-controls-ready' : 'camera-controls-first'}`}>
        {hasPages ? <button type="button" className="camera-control camera-undo" aria-label={p.undo} onClick={onUndo}><Icon name="undo" size={23} /><small>{p.undo}</small></button> : <span aria-hidden="true" />}
        <div className="camera-center-control">
          <button type="button" className="shutter-button" aria-label={p.capturePage} onClick={beginCapture}><span /></button>
        </div>
        {hasPages ? <button type="button" className={`camera-pages-trigger ${showCapturedPages ? 'active' : ''}`} aria-label={p.showCapturedPages} aria-expanded={showCapturedPages} onClick={() => setShowCapturedPages((current) => !current)}><span className="camera-pages-thumb"><span>{pages.length}</span></span><small>{p.pages}</small></button> : <span aria-hidden="true" />}
      </div>}
      {!reviewing && showCapturedPages && hasPages && <section className="captured-pages camera-pages-popover"><div className="captured-heading"><div><strong>{p.capturedPages}</strong><small>{pages.length} {p.pages} · {p.keepScanning}</small></div><span>{t('everyPage')}</span></div><div className="page-thumbnails">{pages.map((page) => <div className={`page-thumbnail page-thumbnail-${page.variant}`} key={page.id}><div className="thumbnail-paper"><b>{page.title}</b><span>今日菜单</span><em>¥38</em><em>¥28</em><em>¥22</em></div><button type="button" className="thumbnail-delete" aria-label={`${p.deletePage || p.removeDish} ${page.title}`} onClick={() => onDelete(page.id)}><Icon name="close" size={11} /></button></div>)}<button type="button" className="thumbnail-add" aria-label={p.addAnotherPage} onClick={focusViewfinder}><Icon name="plus" size={20} /></button></div></section>}
    </div>
  </div>
}

function PageHeader({ title, backLabel = 'Back', onBack, action }: { title: string; kicker?: string; hideKicker?: boolean; backLabel?: string; onBack?: () => void; action?: ReactNode }) { return <div className="page-header"><button className="icon-button soft" onClick={onBack} aria-label={backLabel}><Icon name="back" size={20} /></button><div className="page-title page-title-no-kicker"><strong>{title}</strong></div>{action || <span className="header-spacer" />}</div> }

function MenuResults({ t, p, language, dishes: visibleDishes, allDishes, getStatus, cart, onAddToCart, onOpenCart, companions, activeCompanionIds, onToggleCompanion, onOpenCompanions, onBack, onDetail }: { t: (key: CopyKey) => string; p: PageCopy; language: Language; dishes: Dish[]; allDishes: Dish[]; getStatus: (dish: Dish) => Status; cart: CartItem[]; onAddToCart: (dish: Dish) => void; onOpenCart: () => void; companions: Companion[]; activeCompanionIds: string[]; onToggleCompanion: (id: string) => void; onOpenCompanions: () => void; onBack: () => void; onDetail: (dish: Dish) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<DishCategory | 'all'>('all')
  const connectedCompanions = companions.filter((companion) => companion.passport)
  const conflictCount = allDishes.filter((dish) => getStatus(dish) === 'CONFLICT').length
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  const groups = menuCategoryOrder
    .map((category) => ({ category, dishes: visibleDishes.filter((dish) => inferDishCategory(dish) === category) }))
    .filter((group) => group.dishes.length > 0)
  const filteredGroups = selectedCategory === 'all' ? groups : groups.filter((group) => group.category === selectedCategory)
  const localizedCategories = categoryLabels[language]

  return <div className="page page-narrow page-menu">
    <PageHeader title={t('menuResults')} kicker={`${p.step} 02 · ${p.decisionFirst}`} backLabel={p.back} onBack={onBack} />
    <div className="menu-notice"><Icon name="shield" size={19} /><span>{t('checking')}<small>{conflictCount ? ` ${p.clearConflicts}` : ` ${p.unknownVisible}`}</small></span></div>
    <section className="menu-companion-panel menu-companion-panel-compact">
      <div className="menu-companion-heading"><span className="menu-companion-icon"><Icon name="users" size={18} /></span><div><strong>{p.chooseCompanions}</strong><small>{p.matchTable}</small></div><button type="button" className="text-link" onClick={onOpenCompanions}>{p.manage}</button></div>
      <div className="menu-companion-chips">{connectedCompanions.map((companion) => <button type="button" key={companion.id} className={`menu-person-chip ${activeCompanionIds.includes(companion.id) ? 'active' : ''}`} onClick={() => onToggleCompanion(companion.id)}><span className="person-avatar">{companion.initials}</span><span>{companion.name.split(' ')[0]}</span>{activeCompanionIds.includes(companion.id) && <Icon name="check" size={13} />}</button>)}<button type="button" className="menu-add-companion" onClick={onOpenCompanions}><Icon name="plus" size={14} /> {p.add}</button></div>
      {activeCompanionIds.length > 0 && <p className="menu-companion-note"><Icon name="shield" size={14} /> {p.matchingAgainst} {activeCompanionIds.length} {p.companions}.</p>}
    </section>
    <section className="menu-category-section" aria-label={p.menuCategories}>
      <div className="menu-category-heading"><div><strong>{p.browseSections}</strong></div><small>{countText(language, visibleDishes.length, p.dish, p.dishes)}</small></div>
      <div className="menu-category-nav" role="tablist" aria-label={p.filterCategories}>
        <button type="button" className={selectedCategory === 'all' ? 'active' : ''} onClick={() => setSelectedCategory('all')}><span>{p.all}</span><b>{visibleDishes.length}</b></button>
        {groups.map(({ category, dishes: groupDishes }) => <button type="button" key={category} className={selectedCategory === category ? 'active' : ''} onClick={() => setSelectedCategory(category)}><span>{localizedCategories[category]}</span><b>{groupDishes.length}</b></button>)}
      </div>
    </section>
    <div className="menu-category-groups">{filteredGroups.map(({ category, dishes: groupDishes }) => <section className="menu-group" key={category}><div className="menu-group-heading"><span className="menu-group-icon">{menuCategoryMeta[category].icon}</span><div><h2>{localizedCategories[category]}</h2><small>{menuCategoryMeta[category].zh}</small></div><em>{groupDishes.length}</em></div><div className="menu-list">{groupDishes.map((dish) => <DishCard key={dish.id} p={p} dish={dish} language={language} status={getStatus(dish)} t={t} onDetail={onDetail} onAddToCart={onAddToCart} cartQuantity={cart.find((item) => item.dish.id === dish.id)?.quantity || 0} />)}</div></section>)}</div>
    <div className={`sticky-cta ${cartCount ? 'has-items' : 'empty'}`}><button type="button" className="cart-floating-button" onClick={onOpenCart}><span className="cart-floating-icon"><Icon name="cart" size={19} />{cartCount > 0 && <b>{cartCount}</b>}</span><span className="cart-floating-copy"><strong>{cartCount ? p.viewCart : p.cart}</strong><small>{cartCount ? `${cartCount} ${countText(language, cartCount, p.dish, p.dishes)} ${p.selected}` : p.browseDishes}</small></span><strong className="cart-floating-total">{cartCount ? `¥${cartTotal}` : '¥0'}</strong><Icon name="arrow" size={17} /></button></div>
  </div>
}

function DishVisual({ dish, language = 'en', small = false }: { dish: Dish; language?: Language; small?: boolean }) { return <div className={`dish-visual ${dish.className} ${small ? 'dish-visual-small' : ''}`}><img className="dish-photo" src={dish.imageSrc} alt={dish.localized[language]} loading="lazy" /></div> }
function IngredientVisual({ label }: { label: string }) {
  const normalized = label.toLowerCase()
  const kind = normalized.includes('tofu') ? 'tofu' : normalized.includes('bean paste') ? 'paste' : normalized.includes('pork') ? 'pork' : normalized.includes('pepper') ? 'pepper' : normalized.includes('soy') || normalized.includes('bean') ? 'soy' : 'leaf'
  const art: Record<string, ReactNode> = {
    tofu: <><path d="m7 7 5-3 5 3v7l-5 3-5-3V7Z"/><path d="M12 4v6m5-3-5 3-5-3"/></>,
    paste: <><ellipse cx="12" cy="7.5" rx="7" ry="3"/><path d="M5 7.5v3.2c0 2.5 3.1 4.5 7 4.5s7-2 7-4.5V7.5M8 7.5c1.2-.8 2.6-1.2 4-1.2s2.8.4 4 1.2"/><path d="M9 5.8c.4-.6.9-.9 1.5-.9M13 5.4c.5-.5 1-.7 1.6-.5"/></>,
    pork: <><path d="M7.2 11.8c-1.7 0-2.7-1.2-2.1-2.5.5-1 1.7-1.3 2.8-.8.4-1.7 2.3-2.5 3.5-1.5 1-1.7 3.5-1.5 4.1.5 1.7-.2 3 1 2.7 2.4-.3 1.2-1.5 1.9-2.8 1.7-.6 1.6-2.8 2-3.8.6-1.4.9-3.4.6-4.4-.4Z"/><path d="M8.5 10.1h.1M13.2 9.2h.1M15.1 11h.1"/></>,
    pepper: <><circle cx="7" cy="8" r="2.2"/><circle cx="12" cy="6" r="2.2"/><circle cx="17" cy="8" r="2.2"/><circle cx="9.5" cy="13" r="2.2"/><circle cx="14.5" cy="13" r="2.2"/><path d="M12 3.7c.1-1 .7-1.6 1.4-1.9"/></>,
    soy: <><ellipse cx="8" cy="10" rx="3.2" ry="2.4" transform="rotate(-25 8 10)"/><ellipse cx="15.5" cy="8" rx="3.2" ry="2.4" transform="rotate(28 15.5 8)"/><ellipse cx="14" cy="14.5" rx="3.2" ry="2.4" transform="rotate(-18 14 14.5)"/><path d="M6.8 9.2c.8.4 1.5.4 2.3 0M14.3 7.2c.8.4 1.6.4 2.4 0M12.8 13.7c.8.4 1.6.4 2.4 0"/></>,
    leaf: <><path d="M18.5 5.5C11 5.7 6 8.7 6 13.5c0 3 2.2 5 5.1 5 4.9 0 7.4-5.4 7.4-13Z"/><path d="M5 19c2.2-3.2 5-5.7 8.8-7.5"/></>,
  }
  return <svg className="ingredient-art" width="58" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{art[kind]}</svg>
}
function StatusBadge({ status, t }: { status: Status; t: (key: CopyKey) => string }) { const map = { MATCH: ['match', t('matchLabel'), 'check'], WARNING: ['warning', t('warningLabel'), 'alert'], CONFLICT: ['conflict', t('conflictLabel'), 'close'], UNKNOWN: ['unknown', t('unknownLabel'), 'alert'] } as const; const [color, label, icon] = map[status]; return <span className={`status-badge ${color}`}><Icon name={icon} size={14} /> {label}</span> }
const dishTagTranslations: Record<Language, Record<string, string>> = {
  en: {},
  ko: { Chicken: '닭고기', Peanut: '땅콩', Peanuts: '땅콩', 'Dried chili': '말린 고추', Tofu: '두부', 'Chili bean paste': '두반장', 'Minced pork': '다진 돼지고기', 'Sichuan pepper': '화자오', Vegetarian: '채식', 'Vegetarian option': '채식 옵션', Garlic: '마늘', Sichuan: '쓰촨', Fresh: '신선한', Mild: '순한맛', Crisp: '바삭한', 'Sweet-sour': '새콤달콤', Warm: '따뜻한' },
  ja: { Chicken: '鶏肉', Peanut: 'ピーナッツ', Peanuts: 'ピーナッツ', 'Dried chili': '乾燥唐辛子', Tofu: '豆腐', 'Chili bean paste': '豆板醤', 'Minced pork': '豚ひき肉', 'Sichuan pepper': '花椒', Vegetarian: 'ベジタリアン', 'Vegetarian option': 'ベジタリアン対応', Garlic: 'にんにく', Sichuan: '四川', Fresh: '新鮮', Mild: '控えめ', Crisp: 'シャキシャキ', 'Sweet-sour': '甘酸っぱい', Warm: '温かい' },
  ru: { Chicken: 'Курица', Peanut: 'Арахис', Peanuts: 'Арахис', 'Dried chili': 'Сушёный чили', Tofu: 'Тофу', 'Chili bean paste': 'Бобовая паста с чили', 'Minced pork': 'Свиной фарш', 'Sichuan pepper': 'Сычуаньский перец', Vegetarian: 'Вегетарианское', 'Vegetarian option': 'Вегетарианский вариант', Garlic: 'Чеснок', Sichuan: 'Сычуань', Fresh: 'Свежий', Mild: 'Мягкая острота', Crisp: 'Хрустящий', 'Sweet-sour': 'Кисло-сладкий', Warm: 'Согревающий' },
  es: { Chicken: 'Pollo', Peanut: 'Cacahuete', Peanuts: 'Cacahuete', 'Dried chili': 'Chile seco', Tofu: 'Tofu', 'Chili bean paste': 'Pasta de chile y judías', 'Minced pork': 'Cerdo picado', 'Sichuan pepper': 'Pimienta de Sichuan', Vegetarian: 'Vegetariano', 'Vegetarian option': 'Opción vegetariana', Garlic: 'Ajo', Sichuan: 'Sichuan', Fresh: 'Fresco', Mild: 'Suave', Crisp: 'Crujiente', 'Sweet-sour': 'Agridulce', Warm: 'Reconfortante' },
  it: { Chicken: 'Pollo', Peanut: 'Arachidi', Peanuts: 'Arachidi', 'Dried chili': 'Peperoncino secco', Tofu: 'Tofu', 'Chili bean paste': 'Pasta di fagioli e peperoncino', 'Minced pork': 'Maiale tritato', 'Sichuan pepper': 'Pepe del Sichuan', Vegetarian: 'Vegetariano', 'Vegetarian option': 'Opzione vegetariana', Garlic: 'Aglio', Sichuan: 'Sichuan', Fresh: 'Fresco', Mild: 'Delicato', Crisp: 'Croccante', 'Sweet-sour': 'Agrodolce', Warm: 'Caldo' },
}
const dishTagLabel = (language: Language, tag: string) => dishTagTranslations[language][tag] || tag
const ingredientLabelTranslations: Record<Language, Record<string, string>> = {
  en: {},
  ko: { Chicken: '닭고기', Peanuts: '땅콩', 'Dried chilies': '말린 고추', Scallions: '대파', Tofu: '두부', 'Chili bean paste': '두반장', 'Minced pork': '다진 돼지고기', 'Sichuan pepper': '화자오', Eggplant: '가지', Garlic: '마늘', 'Pickled chili': '절인 고추', Vinegar: '식초', 'Seasonal greens': '제철 채소', 'Cooking oil': '식용유', 'Lotus root': '연근', 'Rice vinegar': '쌀식초', Sugar: '설탕', Sesame: '참깨', 'Winter melon': '동과', Mushrooms: '버섯', Ginger: '생강', Stock: '육수', 'Unspecified recipe detail': '확인되지 않은 조리 세부 정보', 'Passport conflict': '푸드 패스포트 충돌' },
  ja: { Chicken: '鶏肉', Peanuts: 'ピーナッツ', 'Dried chilies': '乾燥唐辛子', Scallions: 'ねぎ', Tofu: '豆腐', 'Chili bean paste': '豆板醤', 'Minced pork': '豚ひき肉', 'Sichuan pepper': '花椒', Eggplant: 'なす', Garlic: 'にんにく', 'Pickled chili': '漬け唐辛子', Vinegar: '酢', 'Seasonal greens': '季節の青菜', 'Cooking oil': '食用油', 'Lotus root': 'れんこん', 'Rice vinegar': '米酢', Sugar: '砂糖', Sesame: 'ごま', 'Winter melon': '冬瓜', Mushrooms: 'きのこ', Ginger: 'しょうが', Stock: 'だし', 'Unspecified recipe detail': '未確認の調理詳細', 'Passport conflict': 'フードパスポートとの衝突' },
  ru: { Chicken: 'Курица', Peanuts: 'Арахис', 'Dried chilies': 'Сушёный чили', Scallions: 'Зелёный лук', Tofu: 'Тофу', 'Chili bean paste': 'Бобовая паста с чили', 'Minced pork': 'Свиной фарш', 'Sichuan pepper': 'Сычуаньский перец', Eggplant: 'Баклажан', Garlic: 'Чеснок', 'Pickled chili': 'Маринованный чили', Vinegar: 'Уксус', 'Seasonal greens': 'Сезонная зелень', 'Cooking oil': 'Растительное масло', 'Lotus root': 'Корень лотоса', 'Rice vinegar': 'Рисовый уксус', Sugar: 'Сахар', Sesame: 'Кунжут', 'Winter melon': 'Зимняя дыня', Mushrooms: 'Грибы', Ginger: 'Имбирь', Stock: 'Бульон', 'Unspecified recipe detail': 'Неподтверждённая деталь рецепта', 'Passport conflict': 'Конфликт с пищевым паспортом' },
  es: { Chicken: 'Pollo', Peanuts: 'Cacahuete', 'Dried chilies': 'Chiles secos', Scallions: 'Cebolleta', Tofu: 'Tofu', 'Chili bean paste': 'Pasta de judías y chile', 'Minced pork': 'Cerdo picado', 'Sichuan pepper': 'Pimienta de Sichuan', Eggplant: 'Berenjena', Garlic: 'Ajo', 'Pickled chili': 'Chile encurtido', Vinegar: 'Vinagre', 'Seasonal greens': 'Verduras de temporada', 'Cooking oil': 'Aceite de cocina', 'Lotus root': 'Raíz de loto', 'Rice vinegar': 'Vinagre de arroz', Sugar: 'Azúcar', Sesame: 'Sésamo', 'Winter melon': 'Melón de invierno', Mushrooms: 'Setas', Ginger: 'Jengibre', Stock: 'Caldo', 'Unspecified recipe detail': 'Detalle de receta no confirmado', 'Passport conflict': 'Conflicto con el pasaporte' },
  it: { Chicken: 'Pollo', Peanuts: 'Arachidi', 'Dried chilies': 'Peperoncini secchi', Scallions: 'Cipollotto', Tofu: 'Tofu', 'Chili bean paste': 'Pasta di fagioli e peperoncino', 'Minced pork': 'Maiale tritato', 'Sichuan pepper': 'Pepe del Sichuan', Eggplant: 'Melanzana', Garlic: 'Aglio', 'Pickled chili': 'Peperoncino sottaceto', Vinegar: 'Aceto', 'Seasonal greens': 'Verdure di stagione', 'Cooking oil': 'Olio da cucina', 'Lotus root': 'Radice di loto', 'Rice vinegar': 'Aceto di riso', Sugar: 'Zucchero', Sesame: 'Sesamo', 'Winter melon': 'Zucca invernale', Mushrooms: 'Funghi', Ginger: 'Zenzero', Stock: 'Brodo', 'Unspecified recipe detail': 'Dettaglio della ricetta non confermato', 'Passport conflict': 'Conflitto con il passaporto' },
}
const ingredientDisplayLabel = (language: Language, label: string) => ingredientLabelTranslations[language][label] || label
type DishNarrative = Pick<Dish, 'taste' | 'texture' | 'cooking' | 'bestWith' | 'culture' | 'reason'>
const dishNarrativeTranslations: Record<Language, Record<string, DishNarrative>> = {
  en: {},
  ko: {
    'kung-pao': { taste: '달콤하고 짭짤하며 새콤하고 은은하게 얼얼해요', texture: '부드러운 닭고기와 바삭한 땅콩', cooking: '센 불에 빠르게 볶아요', bestWith: '밥과 다른 요리와 함께 나눠 먹기 좋아요', culture: '궁보계정은 역사적 관직의 이름을 딴 쓰촨식 볶음 요리예요. 땅콩은 장식이 아니라 보통 요리의 일부입니다.', reason: '이 메뉴에는 전체 재료 목록이 없어 땅콩이 포함될 가능성을 확인해야 합니다.' },
    'mapo-tofu': { taste: '맵고 짭짤하며 얼얼해요', texture: '향긋한 소스를 머금은 부드러운 두부', cooking: '두반장 소스에 넣고 끓여요', bestWith: '흰밥과 채소를 곁들이기 좋아요', culture: '마파는 이 사랑받는 쓰촨 요리를 만든 것으로 알려진 할머니의 별명에서 왔어요.', reason: '일반적인 레시피에는 다진 돼지고기가 들어가며, 이 메뉴는 채식 버전이라고 표시하지 않았습니다.' },
    eggplant: { taste: '새콤달콤하고 마늘 향이 나며 은은하게 매워요', texture: '윤기 나는 소스의 부드러운 가지', cooking: '부드러워질 때까지 졸여요', bestWith: '밥과 아삭한 채소 요리와 잘 어울려요', culture: '어향은 쓰촨식 양념 스타일을 뜻하며, 생선이 들어간다는 의미는 아닙니다.', reason: '메뉴에는 채식으로 표시되어 있지만 알레르기가 있다면 소스와 주방의 교차 접촉을 확인해야 합니다.' },
    greens: { taste: '신선하고 순하며 마늘 향이 나요', texture: '아삭하면서 부드러운 잎채소', cooking: '뜨거운 웍에서 빠르게 볶아요', bestWith: '매운 요리들과 함께 먹으면 균형이 좋아요', culture: '중국 식탁에서 흔히 볼 수 있는 채소 요리로, 정확한 채소는 계절에 따라 달라집니다.', reason: '표시된 충돌은 없지만 식용유와 공용 웍 사용 여부는 메뉴에 확인되지 않았습니다.' },
    lotus: { taste: '산뜻하고 새콤달콤하며 아삭해요', texture: '아삭하고 즙이 많아요', cooking: '식초 글레이즈와 함께 빠르게 볶아요', bestWith: '진하거나 매운 음식과 잘 맞아요', culture: '연근의 이어진 단면은 식탁에서 함께함을 상징하는 경우가 많습니다.', reason: '참깨는 표시되어 있지만 다른 소스 재료는 완전히 확인되지 않았습니다.' },
    soup: { taste: '가볍고 감칠맛이 나며 따뜻해요', texture: '부드러운 동과와 연한 버섯', cooking: '국물을 천천히 끓여요', bestWith: '테이블 전체가 함께 나눠 먹기 좋아요', culture: '강한 맛의 요리 사이에서 균형을 잡아 주는 담백한 수프예요.', reason: '육수의 재료가 표시되지 않아 명확히 확인할 수 없는 상태로 유지합니다.' },
  },
  ja: {
    'kung-pao': { taste: '甘じょっぱく、酸味があり、ややしびれる味', texture: 'やわらかな鶏肉と香ばしいピーナッツ', cooking: '強火で手早く炒めます', bestWith: 'ご飯や他の料理とシェアするのがおすすめ', culture: '宮保鶏丁は歴史上の官職にちなんだ四川風炒めです。ピーナッツは通常、飾りではなく料理の一部です。', reason: 'メニューに完全な食材一覧がないため、ピーナッツの有無を確認してください。' },
    'mapo-tofu': { taste: '辛く、うま味があり、しびれる味', texture: '香り高いソースのやわらかな豆腐', cooking: '豆板醤のソースで煮込みます', bestWith: '白いご飯や青菜とよく合います', culture: '「麻婆」はこの有名な四川料理を作ったとされる女性の呼び名に由来します。', reason: '一般的なレシピには豚ひき肉が入り、このメニューはベジタリアンとは表示されていません。' },
    eggplant: { taste: '甘酸っぱく、にんにく風味でやさしい辛さ', texture: 'つやのあるソースをまとったなす', cooking: 'やわらかくなるまで煮込みます', bestWith: 'ご飯や歯ごたえのある青菜と合います', culture: '魚香は四川の味付けの名称で、魚が入っているとは限りません。', reason: 'ベジタリアン表示ですが、アレルギーがある場合はソースと厨房での交差接触を確認してください。' },
    greens: { taste: 'さっぱりして控えめなにんにく風味', texture: 'シャキッとしてやわらかな葉野菜', cooking: '熱い鍋でさっと炒めます', bestWith: '辛い料理の箸休めになります', culture: '中国の食卓でよく食べられる野菜料理で、野菜の種類は季節で変わります。', reason: '表示上の衝突はありませんが、油と共用の鍋については確認できません。' },
    lotus: { taste: '明るい甘酸っぱさと歯ごたえ', texture: 'シャキシャキしてみずみずしい', cooking: '酢のたれと手早く炒めます', bestWith: '濃い味や辛い料理と合います', culture: 'れんこんのつながった断面は、食卓のつながりを表すことがあります。', reason: 'ごまは表示されていますが、ほかのソース材料は完全には分かりません。' },
    soup: { taste: '軽く、うま味があり、体が温まる味', texture: 'やわらかな冬瓜ときのこ', cooking: 'スープをゆっくり煮込みます', bestWith: 'テーブルで取り分けるのに向いています', culture: '味の濃い料理の合間に食べる穏やかなスープです。', reason: 'だしの材料が不明なため、明確に判断できない状態です。' },
  },
  ru: {
    'kung-pao': { taste: 'Сладко-солёный, кисловатый и слегка пряно-онемляющий вкус', texture: 'Нежная курица и хрустящий арахис', cooking: 'Быстро обжаривается на сильном огне', bestWith: 'Хорошо делить с рисом и другими блюдами', culture: 'Курица гунбао — сычуаньское блюдо, названное в честь исторической должности. Арахис обычно входит в состав, а не служит украшением.', reason: 'Меню не содержит полного списка ингредиентов, поэтому наличие арахиса нужно уточнить.' },
    'mapo-tofu': { taste: 'Острый, насыщенный и слегка онемляющий вкус', texture: 'Мягкий тофу с ароматным соусом', cooking: 'Тушится в соусе с бобовой пастой и чили', bestWith: 'Подаётся с рисом и зеленью', culture: 'Название «мапо» связано с прозвищем женщины, которой приписывают создание этого блюда.', reason: 'В классический рецепт часто входит свиной фарш, а это блюдо не отмечено как вегетарианское.' },
    eggplant: { taste: 'Кисло-сладкий, чесночный и умеренно острый вкус', texture: 'Мягкий баклажан в блестящем соусе', cooking: 'Тушится до мягкости', bestWith: 'Хорошо сочетается с рисом и хрустящей зеленью', culture: 'Юйсян — название сычуаньской приправы; оно не означает, что в блюде есть рыба.', reason: 'Блюдо отмечено как вегетарианское, но при аллергии нужно уточнить соус и перекрёстный контакт на кухне.' },
    greens: { taste: 'Свежий, мягкий вкус с чесночной ноткой', texture: 'Листья хрустящие, но нежные', cooking: 'Быстро обжаривается в горячем воке', bestWith: 'Уравновешивает острые блюда на общем столе', culture: 'Распространённый китайский овощной гарнир; состав зелени меняется по сезону.', reason: 'Явного конфликта нет, но масло и общий вок меню не подтверждает.' },
    lotus: { taste: 'Яркий кисло-сладкий вкус и хруст', texture: 'Хрустящий и сочный', cooking: 'Быстро обжаривается с уксусным соусом', bestWith: 'Подходит к насыщенным и острым блюдам', culture: 'Соединённые ломтики корня лотоса часто ассоциируются с единством за столом.', reason: 'Кунжут указан, но остальные ингредиенты соуса описаны не полностью.' },
    soup: { taste: 'Лёгкий, насыщенный и согревающий вкус', texture: 'Мягкая зимняя дыня и нежные грибы', cooking: 'Бульон медленно томится', bestWith: 'Подходит для общего стола', culture: 'Нежный суп, который часто уравновешивает более яркие блюда.', reason: 'Основа бульона не указана, поэтому блюдо остаётся неопределённым.' },
  },
  es: {
    'kung-pao': { taste: 'Dulce, sabroso, ácido y ligeramente adormecedor', texture: 'Pollo tierno con cacahuetes crujientes', cooking: 'Salteado rápidamente a fuego alto', bestWith: 'Ideal para compartir con arroz y otros platos', culture: 'El pollo kung pao es un salteado de Sichuan llamado así por un cargo histórico. El cacahuete suele formar parte del plato, no ser solo decoración.', reason: 'El menú no ofrece una lista completa de ingredientes, así que hay que confirmar el cacahuete.' },
    'mapo-tofu': { taste: 'Picante, sabroso y ligeramente adormecedor', texture: 'Tofu suave con salsa aromática', cooking: 'Guisado en salsa de judías y chile', bestWith: 'Combina con arroz blanco y verduras', culture: '«Mapo» alude al apodo de la mujer a la que se atribuye la creación de este plato de Sichuan.', reason: 'La receta habitual lleva cerdo picado y este plato no está marcado como vegetariano.' },
    eggplant: { taste: 'Agridulce, con ajo y un picante suave', texture: 'Berenjena melosa con salsa brillante', cooking: 'Guisada hasta quedar tierna', bestWith: 'Combina con arroz y una verdura crujiente', culture: 'Yuxiang describe un estilo de condimento de Sichuan; no significa necesariamente que lleve pescado.', reason: 'El menú la marca como vegetariana, pero las alergias requieren confirmar la salsa y el contacto cruzado.' },
    greens: { taste: 'Fresco, suave y con ajo', texture: 'Hojas tiernas y ligeramente crujientes', cooking: 'Salteadas rápidamente en un wok caliente', bestWith: 'Equilibra los platos picantes de la mesa', culture: 'Una verdura habitual en la mesa china; las verduras exactas cambian con la temporada.', reason: 'No aparece ningún conflicto, pero el menú no confirma el aceite ni el wok compartido.' },
    lotus: { taste: 'Crujiente, dulce y ácido', texture: 'Crujiente y jugosa', cooking: 'Salteada rápidamente con glaseado de vinagre', bestWith: 'Acompaña bien a platos intensos o picantes', culture: 'Las rodajas unidas de raíz de loto suelen asociarse con la unión en la mesa.', reason: 'El sésamo aparece indicado, pero los demás ingredientes de la salsa no están completamente especificados.' },
    soup: { taste: 'Ligero, sabroso y reconfortante', texture: 'Melón de invierno suave con setas tiernas', cooking: 'Caldo cocido a fuego lento', bestWith: 'Adecuada para compartir en la mesa', culture: 'Una sopa suave que suele equilibrar platos de sabores más intensos.', reason: 'No se especifica la base del caldo, así que el plato sigue siendo incierto.' },
  },
  it: {
    'kung-pao': { taste: 'Dolce, saporito, acidulo e leggermente anestetizzante', texture: 'Pollo tenero con arachidi croccanti', cooking: 'Saltato rapidamente a fuoco vivo', bestWith: 'Da condividere con riso e altri piatti', culture: 'Il pollo kung pao è un piatto saltato del Sichuan che prende il nome da una carica storica. Le arachidi di solito fanno parte del piatto, non sono solo una decorazione.', reason: 'Il menu non offre l’elenco completo degli ingredienti: verifica la presenza di arachidi.' },
    'mapo-tofu': { taste: 'Piccante, saporito e leggermente anestetizzante', texture: 'Tofu morbido con salsa aromatica', cooking: 'Stufato in una salsa di fagioli e peperoncino', bestWith: 'Ottimo con riso bianco e verdure', culture: '«Mapo» richiama il soprannome della donna a cui si attribuisce la creazione di questo piatto del Sichuan.', reason: 'La ricetta comune include maiale tritato e questo piatto non è indicato come vegetariano.' },
    eggplant: { taste: 'Agrodolce, all’aglio e delicatamente piccante', texture: 'Melanzana morbida con salsa lucida', cooking: 'Stufata finché diventa tenera', bestWith: 'Si abbina a riso e verdure croccanti', culture: 'Yuxiang descrive uno stile di condimento del Sichuan; non significa necessariamente che contenga pesce.', reason: 'Il menu la indica come vegetariana, ma per le allergie bisogna confermare salsa e contatto crociato.' },
    greens: { taste: 'Fresco, delicato e agliato', texture: 'Foglie croccanti ma tenere', cooking: 'Saltate velocemente in un wok caldo', bestWith: 'Bilanciano i piatti piccanti condivisi', culture: 'Una verdura comune sulla tavola cinese; il tipo esatto cambia con la stagione.', reason: 'Non risultano conflitti, ma il menu non conferma olio e wok condivisi.' },
    lotus: { taste: 'Croccante, fresco e agrodolce', texture: 'Croccante e succosa', cooking: 'Saltata rapidamente con glassa all’aceto', bestWith: 'Sta bene con piatti ricchi o piccanti', culture: 'Le fette unite della radice di loto sono spesso associate allo stare insieme a tavola.', reason: 'Il sesamo è indicato, ma gli altri ingredienti della salsa non sono specificati del tutto.' },
    soup: { taste: 'Leggero, saporito e riscaldante', texture: 'Zucca invernale morbida e funghi teneri', cooking: 'Brodo cotto lentamente', bestWith: 'Adatta da condividere a tavola', culture: 'Una zuppa delicata che aiuta a bilanciare piatti dai sapori più decisi.', reason: 'La base del brodo non è specificata, quindi il piatto resta incerto.' },
  },
}
const dishNarrativeLabel = (language: Language, dish: Dish, key: keyof DishNarrative) => dishNarrativeTranslations[language][dish.id]?.[key] || dish[key]
function DishCard({ p, dish, language, status, t, onDetail, onAddToCart, cartQuantity }: { p: PageCopy; dish: Dish; language: Language; status: Status; t: (key: CopyKey) => string; onDetail: (dish: Dish) => void; onAddToCart: (dish: Dish) => void; cartQuantity: number }) { const info = status === 'CONFLICT' ? t('detailsConflict') : status === 'WARNING' ? t('possibleConflict') : status === 'UNKNOWN' ? t('detailsUnknown') : t('detailsMatch'); const inCart = cartQuantity > 0; return <article className={`dish-card card-status-${status.toLowerCase()}`}><button className="dish-card-main" onClick={() => onDetail(dish)}><DishVisual dish={dish} language={language} /><div className="dish-card-content"><div className="dish-card-title"><div><h3>{dish.localized[language]}</h3><span>{dish.zh}</span></div><strong>¥{dish.price}</strong></div><div className="tag-row dish-tags">{dish.tags.map((tag) => <span key={tag} className="tiny-tag">{dishTagLabel(language, tag)}</span>)}<span className="tiny-tag spicy">{dish.spicy ? '🌶️'.repeat(dish.spicy) : '○'} {dish.spicy ? dish.spicy === 1 ? p.mild : dish.spicy === 2 ? p.medium : p.spicy : p.mild}</span></div><div className="status-line"><div className="status-line-copy"><StatusBadge status={status} t={t} /><span>{info}</span></div></div></div></button><div className="dish-card-actions"><button className="dish-detail-button" onClick={() => onDetail(dish)}>{t('viewDetails')} <Icon name="arrow" size={16} /></button><button className={`dish-cart-button ${inCart ? 'is-in-cart' : ''}`} disabled={status === 'CONFLICT'} aria-pressed={inCart} onClick={() => onAddToCart(dish)}>{status === 'CONFLICT' ? <><Icon name="close" size={15} /> {p.excluded}</> : inCart ? <><span className="cart-button-check"><Icon name="check" size={13} /></span><span>{p.inCart}</span><b className="cart-button-count">{cartQuantity}</b></> : <><Icon name="plus" size={15} /> {p.addToCart}</>}</button></div></article> }

type IngredientRisk = 'clear' | 'conflict' | 'possible' | 'unknown'
type IngredientCheck = { label: string; risk: IngredientRisk; source: EvidenceSource }

const ingredientAllergenTerms: Record<string, string[]> = {
  peanut: ['peanut'],
  'tree-nut': ['nut'],
  milk: ['milk', 'dairy', 'cream', 'butter'],
  egg: ['egg'],
  fish: ['fish'],
  shellfish: ['shellfish', 'shrimp', 'prawn', 'seafood'],
  crustacean: ['shrimp', 'prawn', 'crab', 'lobster', 'shellfish', 'seafood'],
  mollusk: ['mollusk', 'clam', 'oyster', 'squid', 'seafood'],
  wheat: ['wheat', 'gluten', 'flour', 'noodle', 'dumpling'],
  soy: ['soy', 'tofu', 'bean paste'],
  sesame: ['sesame'],
}

function ingredientMatchesAllergen(label: string, allergen: string) {
  const lower = label.toLowerCase()
  return (ingredientAllergenTerms[allergen] || [allergen.replace('-', ' ')]).some((term) => lower.includes(term))
}

function ingredientCarrier(label: string) {
  return /sauce|paste|stock|broth|oil|glaze|seasoning|dressing/i.test(label)
}

function ingredientDietConflict(label: string, dish: Dish, passport: Passport) {
  const lower = label.toLowerCase()
  const avoidFoods = new Set([...passport.avoidFoods, ...passport.diets.filter((id) => avoidFoodIds.includes(id))])
  const has = (...terms: string[]) => terms.some((term) => lower.includes(term))
  const isVegetarianProfile = ['vegetarian', 'lacto', 'ovo', 'lacto-ovo'].includes(passport.dietStyle) || passport.diets.includes('vegetarian')
  if (isVegetarianProfile && !dish.vegetarian) return has('pork', 'beef', 'chicken', 'duck', 'fish', 'seafood', 'meat', 'poultry')
  if ((passport.dietStyle === 'vegan' || passport.diets.includes('vegan')) && !dish.vegan) return has('pork', 'beef', 'chicken', 'duck', 'fish', 'seafood', 'meat', 'poultry', 'stock', 'dairy', 'egg')
  if (passport.dietStyle === 'lacto' && dish.allergens.includes('egg')) return has('egg', 'eggs')
  if (passport.dietStyle === 'ovo' && dish.allergens.includes('milk')) return has('milk', 'dairy', 'cheese', 'cream', 'butter')
  if (passport.dietStyle === 'pescatarian') return has('pork', 'beef', 'chicken', 'duck', 'meat', 'poultry')
  if (avoidFoods.has('no-pork') && dish.hasPork) return has('pork')
  if (avoidFoods.has('no-beef') && dish.hasBeef) return has('beef')
  if (avoidFoods.has('no-poultry') && dish.hasPoultry) return has('chicken', 'duck', 'poultry')
  if (avoidFoods.has('no-seafood') && dish.hasSeafood) return has('fish', 'seafood', 'shrimp', 'prawn', 'shellfish')
  if (avoidFoods.has('no-offal') && dish.hasOffal) return has('offal', 'liver', 'intestine')
  if ((passport.faithDiet === 'halal' || passport.faithDiet === 'kosher') && dish.hasPork) return has('pork')
  if (dish.hasLard && (isVegetarianProfile || passport.dietStyle === 'vegan' || passport.diets.includes('vegan') || avoidFoods.has('no-pork') || passport.faithDiet === 'halal' || passport.faithDiet === 'kosher')) return has('lard', 'pork fat', 'animal fat')
  if (passport.preferences.includes('no-scallion') && dish.hasScallion) return has('scallion', 'green onion', 'spring onion')
  if (passport.preferences.includes('no-garlic') && dish.hasGarlic) return has('garlic')
  return passport.faithDiet === 'kosher' && dish.hasSeafood && has('fish', 'seafood', 'shrimp', 'prawn', 'shellfish')
}

function buildIngredientChecks(dish: Dish, passport: Passport, status: Status): IngredientCheck[] {
  const evidence = dish.ingredientEvidence?.length ? dish.ingredientEvidence : dish.ingredients.map((label) => ({ label, source: 'menu' as const }))
  const checks = evidence.map<IngredientCheck>(({ label, source }) => {
    if (source === 'unknown') return { label, risk: 'possible', source }
    if (passport.allergies.some((allergen) => ['peanut', 'soy', 'sesame'].includes(allergen)) && /oil|fryer|fat|油/i.test(label)) return { label, risk: 'possible', source }
    const explicitConflict = passport.allergies.some((selected) => dish.allergens.some((allergen) => allergenMatchKeys(selected).includes(allergen)) && ingredientMatchesAllergen(label, selected))
    const dietaryConflict = ingredientDietConflict(label, dish, passport)
    if (explicitConflict || dietaryConflict) return { label, risk: 'conflict', source }
    const possibleConflict = (dish.possibleAllergens || []).some((allergen) => passport.allergies.some((selected) => allergenMatchKeys(selected).includes(allergen)) && ingredientMatchesAllergen(label, allergen))
    return { label, risk: possibleConflict ? 'possible' : 'clear', source }
  })

  const carrierIndex = checks.findIndex((item) => ingredientCarrier(item.label) && item.risk === 'clear')
  const relevantPossible = (dish.possibleAllergens || []).some((allergen) => passport.allergies.some((selected) => allergenMatchKeys(selected).includes(allergen)))
  if (relevantPossible && !checks.some((item) => item.risk === 'possible')) {
    if (carrierIndex >= 0) checks[carrierIndex].risk = 'possible'
    else checks.push({ label: 'Unspecified recipe detail', risk: 'possible', source: 'unknown' })
  }
  if (status === 'UNKNOWN' && !checks.some((item) => item.risk === 'unknown')) {
    const unknownIndex = checks.findIndex((item) => ingredientCarrier(item.label) && item.risk === 'clear')
    if (unknownIndex >= 0) checks[unknownIndex].risk = 'unknown'
    else checks.push({ label: 'Unspecified recipe detail', risk: 'unknown', source: 'unknown' })
  }
  if (status === 'CONFLICT' && !checks.some((item) => item.risk === 'conflict')) checks.push({ label: 'Passport conflict', risk: 'conflict', source: 'menu' })
  return checks
}

function ingredientRiskLabel(risk: IngredientRisk, t: (key: CopyKey) => string) {
  if (risk === 'conflict') return t('conflictLabel')
  if (risk === 'possible') return t('warningLabel')
  if (risk === 'unknown') return t('unknownLabel')
  return t('matchLabel')
}

function DishDetail({ t, p, language, dish, passport, status, onBack, onAsk, onAddToCart }: { t: (key: CopyKey) => string; p: PageCopy; language: Language; dish: Dish; passport: Passport; status: Status; onBack: () => void; onAsk: () => void; onAddToCart: () => void }) {
  const ingredientChecks = buildIngredientChecks(dish, passport, status)
  return <div className="page page-narrow page-detail">
    <div className="detail-hero">
      <DishVisual dish={dish} language={language} />
      <div className="detail-hero-topbar">
        <button type="button" className="detail-hero-icon" onClick={onBack} aria-label={p.back}><Icon name="back" size={19} /></button>
        <div className="detail-hero-actions" aria-hidden="true"><span className="detail-hero-icon"><Icon name="heart" size={18} /></span><span className="detail-hero-icon"><Icon name="share" size={17} /></span></div>
      </div>
    </div>
    <div className="detail-card">
      <div className="detail-card-handle" aria-hidden="true" />
      <div className="detail-card-topline"><StatusBadge status={status} t={t} /></div>
      <div className="detail-heading"><div><h1>{dish.localized[language]}</h1><span>{dish.zh}</span></div><strong>¥{dish.price}</strong></div>
      <div className="detail-meta-row"><span className="detail-meta-chip"><Icon name="chili" size={15} />{dish.spicy ? '🌶️'.repeat(dish.spicy) : '○'} {dish.spicy ? dish.spicy === 1 ? p.mild : dish.spicy === 2 ? p.medium : p.spicy : p.notSpicy}</span>{dish.tags.slice(0, 2).map((tag) => <span className="detail-meta-chip" key={tag}><Icon name="check" size={14} />{dishTagLabel(language, tag)}</span>)}</div>
      <section className="detail-ingredients-section">
        <div className="detail-section-heading"><SectionTitle>{t('mainIngredients')}</SectionTitle><span>{p.swipeExplore}</span></div>
        <div className="ingredient-scroller" role="list" aria-label={t('mainIngredients')}>
          {ingredientChecks.map((item) => <div className={`ingredient-card ingredient-card-${item.risk}`} key={`${item.label}-${item.risk}-${item.source}`} role="listitem"><strong>{ingredientDisplayLabel(language, item.label)}</strong><IngredientVisual label={item.label} /><small>{ingredientRiskLabel(item.risk, t)}</small></div>)}
        </div>
      </section>
      <p className="illustrative"><Icon name="alert" size={15} /> {t('illustrative')}</p>
      <section className="detail-info-section"><div className="detail-section-heading"><SectionTitle>Description</SectionTitle></div><div className="detail-status-summary"><span>{status === 'CONFLICT' ? t('detailsConflict') : status === 'WARNING' ? t('possibleConflict') : status === 'UNKNOWN' ? t('detailsUnknown') : t('detailsMatch')}</span></div></section>
      <div className="fact-grid"><Fact icon="chili" title={t('taste')} value={dishNarrativeLabel(language, dish, 'taste')} /><Fact icon="tofuBowl" title={t('texture')} value={dishNarrativeLabel(language, dish, 'texture')} /><Fact icon="pot" title={t('cooking')} value={dishNarrativeLabel(language, dish, 'cooking')} /><Fact icon="riceBowl" title={t('bestWith')} value={dishNarrativeLabel(language, dish, 'bestWith')} /></div>
      <section className="detail-info-section"><SectionTitle>{t('culturalNote')}</SectionTitle><div className="culture-card"><Icon name="book" size={27} stroke={1.8} /><p>{dishNarrativeLabel(language, dish, 'culture')}</p></div></section>
      <div className="detail-actions"><Button variant="secondary" onClick={onAsk} icon="alert">{t('askRestaurant')}</Button><Button disabled={status === 'CONFLICT'} onClick={onAddToCart} icon={status === 'CONFLICT' ? 'close' : 'cart'}>{status === 'CONFLICT' ? p.excluded : p.addToCart}</Button></div>
    </div>
  </div>
}
function Cart({ t, p, language, cart, itemCount, total, getStatus, onBack, onIncrease, onDecrease, onClear, onConfirm }: { t: (key: CopyKey) => string; p: PageCopy; language: Language; cart: CartItem[]; itemCount: number; total: number; getStatus: (dish: Dish) => Status; onBack: () => void; onIncrease: (dishId: string) => void; onDecrease: (dishId: string) => void; onClear: () => void; onConfirm: () => void }) {
  return <div className="page page-narrow page-cart">
    <PageHeader title={p.yourCart} kicker={`${p.step} 03 · ${p.selected}`} backLabel={p.back} onBack={onBack} action={cart.length ? <button type="button" className="text-link" onClick={onClear}>{p.clear}</button> : undefined} />
    {!cart.length ? <div className="cart-empty"><div className="cart-empty-icon"><Icon name="cart" size={28} /></div><h1>{p.cartEmpty}</h1><p>{p.cartHint}</p><Button className="full-button" onClick={onBack} icon="menu">{p.backToMenu}</Button></div> : <>
      <div className="cart-list">{cart.map(({ dish, quantity }) => <article className="cart-item" key={dish.id}><div className="cart-item-main"><DishVisual dish={dish} language={language} small /><div className="cart-item-copy"><strong>{dish.localized[language]}</strong><small>{dish.zh} · ¥{dish.price}</small></div><div className="cart-item-aside"><b className="cart-item-price">¥{dish.price * quantity}</b><StatusBadge status={getStatus(dish)} t={t} /></div></div><div className="cart-item-footer"><div className="cart-quantity"><button type="button" onClick={() => onDecrease(dish.id)} aria-label={`${p.decrease} ${dish.localized[language]}`}><Icon name="minus" size={13} /></button><strong>{quantity}</strong><button type="button" onClick={() => onIncrease(dish.id)} aria-label={`${p.increase} ${dish.localized[language]}`}><Icon name="plus" size={13} /></button></div><span className="cart-item-subtotal">{quantity > 1 ? `${quantity} × ¥${dish.price}` : p.singleDish}</span></div></article>)}</div>
      <div className="cart-total"><span>{p.total} · {countText(language, itemCount, p.dish, p.dishes)}</span><strong>¥{total}</strong></div>
      <Button className="full-button" onClick={onConfirm} icon="check">{p.confirmSelections}</Button>
    </>}
  </div>
}

type OrderRequirement = { user: string; chinese: string; tone?: 'alert' | 'note' }

const chineseRequirementLabels: Record<string, string> = {
  wheat: '含麸质谷物', crustacean: '甲壳类', egg: '鸡蛋', soy: '大豆', milk: '牛奶 / 乳制品', 'tree-nut': '坚果', celery: '芹菜', fish: '鱼类', peanut: '花生', mustard: '芥末', sesame: '芝麻', sulphites: '二氧化硫 / 亚硫酸盐', lupin: '羽扇豆', mollusk: '软体动物',
  'no-pork': '不含猪肉', 'no-beef': '不含牛肉', 'no-poultry': '不含禽肉', 'no-seafood': '不含海鲜', 'no-offal': '不含内脏',
  'less-oil': '少油', 'less-salt': '少盐', 'less-sugar': '少糖', 'no-cilantro': '不加香菜', 'no-scallion': '不加葱', 'no-garlic': '不加蒜', 'no-raw': '不吃生食', 'well-cooked': '充分加热', boneless: '优先去骨',
}

const chineseDietLabels: Record<DietStyle, string> = { none: '', vegetarian: '素食', vegan: '纯素', lacto: '奶素', ovo: '蛋素', 'lacto-ovo': '蛋奶素', pescatarian: '鱼素', flexitarian: '弹性素食' }
const chineseFaithLabels: Record<FaithDiet, string> = { none: '', halal: '清真', kosher: '犹太洁食', other: '宗教饮食要求' }
const chineseSeverityLabels: Record<AllergySeverity, string> = { mild: '轻度', moderate: '中度', severe: '严重' }
const orderConfirmationCopy: Record<Language, { recipe: string; oil: string; fat: string }> = {
  en: { recipe: 'Recipe detail to confirm', oil: 'Confirm cooking oil and shared fryer', fat: 'Confirm cooking fat and stock base' },
  ko: { recipe: '레시피 확인 필요', oil: '조리유와 공용 튀김기 확인', fat: '조리 기름과 육수 확인' },
  ja: { recipe: 'レシピの確認が必要', oil: '調理油と共用フライヤーを確認', fat: '調理油脂とスープのベースを確認' },
  ru: { recipe: 'Нужно уточнить состав', oil: 'Уточнить масло и общую фритюрницу', fat: 'Уточнить жир и основу бульона' },
  es: { recipe: 'Hay que confirmar la receta', oil: 'Confirmar el aceite y la freidora compartida', fat: 'Confirmar la grasa y la base del caldo' },
  it: { recipe: 'Ricetta da verificare', oil: 'Verificare olio e friggitrice condivisa', fat: 'Verificare grasso di cottura e brodo' },
}

function orderRequirements(passport: Passport, language: Language, t: (key: CopyKey) => string, cart: CartItem[]): OrderRequirement[] {
  const p = pageCopy[language]
  const confirmationCopy = orderConfirmationCopy[language]
  const requirements: OrderRequirement[] = []
  passport.allergies.forEach((id) => {
    const profile = passport.allergyProfiles[id] || defaultAllergyProfile
    requirements.push({ user: `${allergenLabel(language, id, id)} allergy · ${t(profile.severity)}`, chinese: `${chineseRequirementLabels[id] || id}过敏 · ${chineseSeverityLabels[profile.severity]}过敏`, tone: 'alert' })
  })
  if (passport.otherAllergen.trim()) {
    const profile = passport.allergyProfiles.other || defaultAllergyProfile
    requirements.push({ user: `${passport.otherAllergen.trim()} allergy · ${t(profile.severity)}`, chinese: `${passport.otherAllergen.trim()}过敏 · ${chineseSeverityLabels[profile.severity]}过敏`, tone: 'alert' })
  }
  if (passport.dietStyle !== 'none') requirements.push({ user: passportOptionTranslations[language].dietStyle[passport.dietStyle].label, chinese: chineseDietLabels[passport.dietStyle], tone: 'note' })
  if (passport.faithDiet !== 'none') requirements.push({ user: passportOptionTranslations[language].faithDiet[passport.faithDiet].label, chinese: passport.faithDiet === 'other' && passport.faithOther.trim() ? passport.faithOther.trim() : chineseFaithLabels[passport.faithDiet], tone: 'note' })
  passport.avoidFoods.forEach((id) => requirements.push({ user: passportOptionTranslations[language].avoidFood[id] || choiceLabel(language, id, id), chinese: chineseRequirementLabels[id] || id, tone: 'note' }))
  passport.preferences.forEach((id) => requirements.push({ user: passportOptionTranslations[language].preference[id] || choiceLabel(language, id, id), chinese: chineseRequirementLabels[id] || id, tone: 'note' }))
  if (passport.spiceLevel !== null) requirements.push({ user: `${p.spicePreference || 'Spice'} ${passport.spiceLevel} ${p.upToLevel}`, chinese: `辣度不超过${passport.spiceLevel}级`, tone: 'note' })
  const needsCrossContactCare = (passport.crossContact && (passport.allergies.length > 0 || Boolean(passport.otherAllergen))) || passport.allergies.some((id) => (passport.allergyProfiles[id] || defaultAllergyProfile).crossContact) || Boolean(passport.otherAllergen)
  if (needsCrossContactCare) requirements.push({ user: p.avoidCrossContact, chinese: '请避免交叉接触', tone: 'alert' })

  const cartNeedsRecipeConfirmation = cart.some(({ dish }) => Boolean(dish.possibleIngredients?.length) || dish.ingredients.some((ingredient) => ingredientCarrier(ingredient)) || dish.confidence < 0.9)
  cart.filter(({ dish }) => dish.possibleIngredients?.length).forEach(({ dish }) => {
    const labels = dish.possibleZhIngredients?.length ? dish.possibleZhIngredients : dish.possibleIngredients || []
    requirements.push({ user: `${confirmationCopy.recipe} · ${dish.localized[language]}`, chinese: `请确认${dish.zh}是否含${labels.join('、')}。菜单未明确标注这些成分。`, tone: 'alert' })
  })

  const oilAllergenLabels = passport.allergies.map((id) => ({ peanut: '花生油', soy: '大豆油', sesame: '芝麻油' }[id])).filter((label): label is string => Boolean(label))
  const hasAnyAllergy = passport.allergies.length > 0 || Boolean(passport.otherAllergen.trim())
  if (cartNeedsRecipeConfirmation && hasAnyAllergy) {
    const oilDetail = oilAllergenLabels.length ? `是否使用${oilAllergenLabels.join('、')}，并确认没有与相关过敏原共用锅具或炸油` : '是否接触我的过敏原，并确认没有与相关过敏原共用锅具或炸油'
    requirements.push({ user: confirmationCopy.oil, chinese: `请确认烹调油和炸油${oilDetail}。`, tone: 'alert' })
  }

  const avoidsAnimalFat = ['vegetarian', 'lacto', 'ovo', 'lacto-ovo', 'vegan'].includes(passport.dietStyle) || passport.diets.some((id) => ['vegetarian', 'vegan'].includes(id)) || passport.avoidFoods.includes('no-pork') || passport.faithDiet === 'halal' || passport.faithDiet === 'kosher'
  if (cartNeedsRecipeConfirmation && avoidsAnimalFat) requirements.push({ user: confirmationCopy.fat, chinese: '请确认未使用猪油、牛油、其他动物油或含肉高汤。', tone: 'alert' })
  return requirements
}

function OrderPage({ language, p, passport, cart, savedOrder, onBack, onComplete, onAddMore, onSplitBill, onHome, onSpeak }: { language: Language; p: PageCopy; passport: Passport; cart: CartItem[]; savedOrder: DiningOrder | null; onBack: () => void; onComplete: () => void; onAddMore: (order: DiningOrder) => void; onSplitBill: (order: DiningOrder) => void; onHome: () => void; onSpeak: (text: string) => void }) {
  const t = (key: CopyKey) => tFor(language, key)
  const isSavedOrder = Boolean(savedOrder)
  const requirements = orderRequirements(passport, language, t, cart)
  const total = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const waiterSpeech = [
    '你好，我们想点以下菜品。',
    ...cart.map(({ dish, quantity }) => `${dish.zh}${quantity > 1 ? `，${quantity}份` : ''}`),
    requirements.length ? '另外请注意以下忌口和过敏要求。' : '',
    ...requirements.map((requirement) => requirement.chinese),
    '请先帮我们确认配料和制作过程。如果无法确认，请先告诉我们。',
  ].filter(Boolean).join(' ')
  return <div className="page page-narrow page-order-brief">
    <PageHeader title={p.orderBrief} kicker={p.orderStep} backLabel={p.back} onBack={isSavedOrder ? onHome : onBack} />
    <div className="order-brief-heading"><h1>{p.showWaiter}</h1><p>{p.orderDescription}</p></div>
    <section className="order-brief-card order-brief-user"><div className="order-brief-card-heading"><div><span className="order-brief-kicker">{p.forYou}</span><h2>{p.selectedDishes}</h2></div><span className="order-brief-language">{countText(language, count, p.dish, p.dishes)}</span></div><div className="order-brief-dishes">{cart.map(({ dish, quantity }) => <div className="order-brief-dish" key={dish.id}><DishVisual dish={dish} language={language} small /><div><strong>{dish.localized[language]}</strong><small>{dish.zh} · ×{quantity}</small></div><b>¥{dish.price * quantity}</b></div>)}</div><div className="order-brief-total"><span>{p.total}</span><strong>¥{total}</strong></div><div className="order-brief-translation order-brief-user-notes"><div className="order-brief-card-heading"><div><span className="order-brief-kicker">{p.dietaryNotes}</span><h2>{p.requirements}</h2></div><Icon name="shield" size={20} /></div>{requirements.length ? <div className="order-requirements">{requirements.map((requirement) => <div className={`order-requirement ${requirement.tone === 'alert' ? 'is-alert' : ''}`} key={`${requirement.user}-${requirement.chinese}`}><Icon name={requirement.tone === 'alert' ? 'alert' : 'check'} size={15} /><span>{requirement.user}</span></div>)}</div> : <p className="order-no-requirements">{p.noRequirements}</p>}</div></section>
    <section className="order-brief-card order-brief-waiter"><div className="order-brief-card-heading"><div><span className="order-brief-kicker">{p.forWaiter}</span><h2>点餐信息</h2></div><Icon name="users" size={20} /></div><div className="waiter-order-section"><h3>需要的菜品</h3><div className="waiter-order-list">{cart.map(({ dish, quantity }) => <div key={dish.id}><span><strong>{dish.zh}</strong></span><b>×{quantity}</b></div>)}</div></div><div className="waiter-order-section"><h3>忌口与注意事项</h3>{requirements.length ? <div className="order-requirements">{requirements.map((requirement) => <div className={`order-requirement ${requirement.tone === 'alert' ? 'is-alert' : ''}`} key={`${requirement.chinese}-${requirement.user}`}><Icon name={requirement.tone === 'alert' ? 'alert' : 'check'} size={15} /><span>{requirement.chinese}</span></div>)}</div> : <p className="order-no-requirements">暂无额外忌口要求，请按菜单正常出餐。</p>}</div><Button className="waiter-speak-button" onClick={() => onSpeak(waiterSpeech)} icon="volume">{p.play}</Button><p className="waiter-speak-note"><Icon name="volume" size={13} /> 使用设备的中文语音朗读</p></section>
    <div className={`order-brief-actions ${isSavedOrder ? 'saved-order-actions' : ''}`}>{isSavedOrder ? <><Button className="full-button" onClick={() => savedOrder && onAddMore(savedOrder)} icon="plus">{p.addMore}</Button><Button variant="secondary" className="full-button" onClick={() => savedOrder && onSplitBill(savedOrder)} icon="receipt">{p.splitBill}</Button><Button variant="ghost" className="full-button" onClick={onHome} icon="home">{p.backHome}</Button></> : <><Button className="full-button" onClick={onBack} icon="cart">{p.returnCart}</Button><Button variant="secondary" className="full-button" onClick={onComplete} icon="check">{p.completeOrder}</Button></>}</div>
    <p className="order-brief-disclaimer"><Icon name="alert" size={14} /> {p.orderDisclaimer}</p>
  </div>
}

function SectionTitle({ children }: { children: ReactNode }) { return <h2 className="section-title">{children}</h2> }
function Fact({ icon, title, value }: { icon: string; title: string; value: string }) { return <div className="fact-card"><span className="fact-card-label"><Icon name={icon} size={19} stroke={1.8} />{title}</span><strong>{value}</strong></div> }

function AskSheet({ t, p, language, dish, question, loading, onClose, onCopy, onSpeak }: { t: (key: CopyKey) => string; p: PageCopy; language: Language; dish: Dish; question: string; loading: boolean; onClose: () => void; onCopy: (text: string) => void; onSpeak: (text: string, onEnd: () => void) => void }) {
  const text = askEditorCopy[language]
  const [editedQuestion, setEditedQuestion] = useState(question)
  const [translation, setTranslation] = useState(() => translateRestaurantQuestion(question))
  const [translating, setTranslating] = useState(false)
  const [speechState, setSpeechState] = useState<'idle' | 'playing' | 'paused'>('idle')

  useEffect(() => {
    setEditedQuestion(question)
    setTranslation(translateRestaurantQuestion(question))
    setSpeechState('idle')
  }, [question])
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  const stopSpeech = () => {
    window.speechSynthesis?.cancel()
    setSpeechState('idle')
  }
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return
    if (speechState === 'playing') {
      window.speechSynthesis.pause()
      setSpeechState('paused')
      return
    }
    if (speechState === 'paused') {
      window.speechSynthesis.resume()
      setSpeechState('playing')
      return
    }
    setSpeechState('playing')
    onSpeak(editedQuestion, () => setSpeechState('idle'))
  }
  const updateQuestion = (value: string) => {
    stopSpeech()
    setEditedQuestion(value)
    setTranslation('')
  }
  const translate = () => {
    stopSpeech()
    setTranslating(true)
    window.setTimeout(() => {
      setTranslation(translateRestaurantQuestion(editedQuestion))
      setTranslating(false)
    }, 160)
  }
  const close = () => { stopSpeech(); onClose() }
  return <div className="sheet-backdrop" onClick={close}><section className="ask-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-top"><span aria-hidden="true" /><button className="icon-button soft" onClick={close} aria-label={p.clear}><Icon name="close" size={18} /></button></div><span className="safety-label"><Icon name="shield" size={15} /> {t('askWarning')}</span><h2>{t('askTitle')}</h2><div className="question-card bilingual-question-card"><div className="bilingual-block"><div className="bilingual-block-heading"><strong>{text.chinese}</strong><small>{text.editHint}</small></div><textarea aria-label={text.chinese} className="bilingual-question-input" value={editedQuestion} onChange={(event) => updateQuestion(event.target.value)} disabled={loading} /></div><div className="bilingual-divider" /><div className="bilingual-block"><div className="bilingual-block-heading"><strong>{text.english}</strong></div>{translation ? <p className="bilingual-translation">{translation}</p> : <p className="bilingual-empty">{text.translationHint}</p>}<small className="bilingual-translation-hint">{text.translationHint}</small></div><Button className="bilingual-translate-button" variant="secondary" onClick={translate} icon="refresh" disabled={loading || translating || !editedQuestion.trim()}>{translating ? text.translating : text.translate}</Button><hr /><strong>{dish.localized[language]}</strong><small>{dish.zh} · {dish.price} CNY</small></div><div className="sheet-actions"><Button onClick={toggleSpeech} icon="volume" disabled={loading || !editedQuestion.trim()}>{speechState === 'paused' ? text.resume : speechState === 'playing' ? text.pause : t('playChinese')}</Button><Button variant="secondary" onClick={() => onCopy(editedQuestion)} icon="copy" disabled={loading || !editedQuestion.trim()}>{t('copyQuestion')}</Button></div><p className="sheet-disclaimer">{p.askDisclaimer}</p></section></div>
}


function Bill({ t, p, language, billInputRef, handleFile, billMode, setBillMode, participants, setParticipants, splitItems, setSplitItems, billItems, billTotal, equalAmount, itemTotals, order, billSource, billReceiptName, setBillSource, onBack, onToast }: { t: (key: CopyKey) => string; p: PageCopy; language: Language; billInputRef: React.RefObject<HTMLInputElement>; handleFile: (event: React.ChangeEvent<HTMLInputElement>) => void; billMode: BillMode; setBillMode: (mode: BillMode) => void; participants: string[]; setParticipants: (people: string[]) => void; splitItems: Record<string, string>; setSplitItems: (items: Record<string, string>) => void; billItems: BillItem[]; billTotal: number; equalAmount: string; itemTotals: Record<string, number>; order: DiningOrder; billSource: 'order' | 'receipt'; billReceiptName: string; setBillSource: (source: 'order' | 'receipt') => void; onBack: () => void; onToast: (toast: string) => void }) {
  const [editingParticipant, setEditingParticipant] = useState<number | null>(null)
  const [draftParticipant, setDraftParticipant] = useState('')
  const participantLabel = (person: string) => person === 'You' ? p.you : person
  const editParticipant = (index: number) => { setEditingParticipant(index); setDraftParticipant(participants[index]) }
  const commitParticipant = (index: number) => {
    const nextName = draftParticipant.trim()
    const currentName = participants[index]
    const duplicate = participants.some((person, personIndex) => personIndex !== index && person.toLowerCase() === nextName.toLowerCase())
    if (!nextName || duplicate) { setDraftParticipant(currentName); setEditingParticipant(null); return }
    setParticipants(participants.map((person, personIndex) => personIndex === index ? nextName : person))
    setSplitItems(Object.fromEntries(Object.entries(splitItems).map(([itemId, owner]) => [itemId, owner === currentName ? nextName : owner])))
    setEditingParticipant(null)
  }
  const addParticipant = () => { const name = `${p.guest} ${participants.length + 1}`; setParticipants([...participants, name]); setDraftParticipant(name); setEditingParticipant(participants.length) }
  const removeParticipant = (index: number) => {
    const removedName = participants[index]
    setParticipants(participants.filter((_, personIndex) => personIndex !== index))
    setSplitItems(Object.fromEntries(Object.entries(splitItems).map(([itemId, owner]) => [itemId, owner === removedName ? 'Everyone' : owner])))
    setEditingParticipant(null)
  }

  return <div className="page page-narrow page-bill">
    <PageHeader title={t('billTitle')} hideKicker backLabel={p.back} onBack={onBack} />
    <div className="bill-context-card"><span className="bill-context-icon"><Icon name="receipt" size={20} /></span><div><strong>{order.restaurant}</strong><small>{order.time} · {billItems.length} {p.items}</small></div><span className={`bill-source-badge ${billSource === 'receipt' ? 'is-receipt' : ''}`}>{billSource === 'receipt' ? p.receiptUpdated : p.fromOrder}</span></div>
    <div className="bill-source-actions"><input ref={billInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden /><Button variant="secondary" onClick={() => billInputRef.current?.click()} icon="camera">{billSource === 'receipt' ? p.replaceReceipt : p.uploadReceipt}</Button>{billSource === 'receipt' && <button className="text-link" onClick={() => { setBillSource('order'); onToast(p.toastUsingOrder) }}>{p.useOrderTotals}</button>}</div>
    <p className="bill-source-note"><Icon name="shield" size={14} /> {billSource === 'receipt' ? `${p.lineItemsUpdated} ${billReceiptName || p.uploadedReceipt}.` : p.usingOrderPrices}</p>
    <div className="bill-summary"><div><span>{t('verified')}</span><strong>¥{billTotal.toFixed(2)}</strong></div><span className="status-chip match"><span className="status-dot" /> {billSource === 'receipt' ? p.receiptTotal : p.orderTotal}</span></div>
    <div className="bill-tabs segmented">{([['equal', t('equal')], ['item', t('byItem')]] as Array<[BillMode, string]>).map(([value, label]) => <button key={value} className={billMode === value ? 'active' : ''} onClick={() => setBillMode(value)}>{label}</button>)}</div>
    <div className="bill-section"><div className="section-heading compact-heading"><h2>{t('participants')}</h2><span className="muted-small">{p.namesEditable}</span><button className="text-link" onClick={addParticipant}><Icon name="plus" size={14} /> {p.add}</button></div><div className="participant-row">{participants.map((person, index) => { const isEditing = editingParticipant === index; const label = participantLabel(person); return <div className={`participant-chip ${isEditing ? 'is-editing' : ''}`} key={`${index}-${person}`}>{isEditing ? <input className="participant-name-input" value={draftParticipant} onChange={(event) => setDraftParticipant(event.target.value)} onBlur={() => commitParticipant(index)} onKeyDown={(event) => { if (event.key === 'Enter') commitParticipant(index); if (event.key === 'Escape') { setDraftParticipant(person); setEditingParticipant(null) } }} autoFocus aria-label={`${p.editParticipant} ${label}`} /> : <><button className="participant-name" onClick={() => editParticipant(index)} aria-label={`${p.editParticipant} ${label}`}><span>{label.trim().charAt(0).toUpperCase() || '?'}</span>{label}</button><button className="participant-edit" onClick={() => editParticipant(index)} aria-label={`${p.editParticipant} ${label}`}><Icon name="edit" size={11} /></button></>}{index > 0 && <button className="participant-remove" onClick={() => removeParticipant(index)} aria-label={`${p.removeParticipant} ${label}`}><Icon name="close" size={12} /></button>}</div> })}</div></div>
    {billMode !== 'equal' && <div className="bill-section"><div className="section-heading compact-heading"><h2>{t('billItems')}</h2><span className="muted-small">{p.tapAssign}</span></div><div className="bill-item-list">{billItems.map((item) => <div className="bill-item" key={item.id}><DishVisual dish={item.dish} language={language} small /><span><strong>{item.dish.localized[language]}</strong><small>{item.zh}</small></span><select value={splitItems[item.id] || 'Everyone'} onChange={(event) => setSplitItems({ ...splitItems, [item.id]: event.target.value })}><option value="Everyone">{p.everyone}</option>{participants.map((person) => <option key={person} value={person}>{participantLabel(person)}</option>)}</select><b>¥{item.amount.toFixed(2)}</b></div>)}</div></div>}
    <div className="split-result"><div className="result-heading"><h2>{p.everyonePays}</h2><span>{p.exactCheck} <Icon name="check" size={15} /></span></div>{billMode === 'equal' ? participants.map((person) => <div className="person-result" key={person}><span><span className="participant-initial">{participantLabel(person).trim().charAt(0).toUpperCase() || '?'}</span>{participantLabel(person)}</span><strong>¥{equalAmount}</strong></div>) : participants.map((person) => <div className="person-result" key={person}><span><span className="participant-initial">{participantLabel(person).trim().charAt(0).toUpperCase() || '?'}</span>{participantLabel(person)}</span><strong>¥{itemTotals[person].toFixed(2)}</strong></div>)}<div className="split-total"><span>{t('verified')}</span><strong>¥{billTotal.toFixed(2)}</strong></div></div><Button className="full-button" onClick={() => { onToast(p.shareReady); navigator.share?.({ title: 'Bitewise bill split', text: `${p.everyonePays} ¥${billTotal.toFixed(2)}` }) }} icon="share">{t('share')}</Button>{billSource === 'receipt' && <button className="reset-bill" onClick={() => { setBillSource('order'); onToast(p.toastUsingOrder) }}>{p.useOrderTotals}</button>}</div>
}

function FindFood({ variant = 'find', t, p, language, restaurants, savedRestaurants, pastOrders, onToggleRestaurant, onBack }: { variant?: 'find' | 'community'; t: (key: CopyKey) => string; p: PageCopy; language: Language; restaurants: SavedRestaurant[]; savedRestaurants: SavedRestaurant[]; pastOrders: DiningOrder[]; onToggleRestaurant: (restaurant: SavedRestaurant) => void; onBack: () => void }) {
  const communityMode = variant === 'community'
  const [activeCategory, setActiveCategory] = useState('all')
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [posts, setPosts] = useState<FoodPost[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cit:food-posts') || '') as FoodPost[]
      return Array.isArray(saved) && saved.length ? saved : foodPosts
    } catch { return foodPosts }
  })
  const [composerOpen, setComposerOpen] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [composerRestaurantId, setComposerRestaurantId] = useState('')
  const [draft, setDraft] = useState<FoodPostDraft>({ title: '', body: '', dish: '', dishMeta: '', category: 'local' })
  const historyRestaurants = pastOrders.reduce<SavedRestaurant[]>((items, order) => {
    const restaurant = restaurants.find((item) => item.name === order.restaurant)
    return restaurant && !items.some((item) => item.id === restaurant.id) ? [...items, restaurant] : items
  }, [])
  const selectedRestaurant = historyRestaurants.find((restaurant) => restaurant.id === composerRestaurantId) || historyRestaurants[0]
  const referencePost = posts.find((post) => post.restaurantId === selectedRestaurant?.id) || foodPosts.find((post) => post.restaurantId === selectedRestaurant?.id)
  const visiblePosts = activeCategory === 'all' ? posts : posts.filter((post) => post.category === activeCategory)
  const nearbyRestaurants = restaurants.filter((restaurant) => restaurant.source).slice(0, 10)
  const nearbyText = nearbyCopy[language]
  const toggleLike = (postId: string) => setLikedPosts((current) => current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId])
  const openComposer = () => {
    const firstRestaurant = historyRestaurants[0]
    const firstPost = firstRestaurant ? posts.find((post) => post.restaurantId === firstRestaurant.id) || foodPosts.find((post) => post.restaurantId === firstRestaurant.id) : undefined
    setComposerRestaurantId(firstRestaurant?.id || '')
    setDraft({ title: '', body: '', dish: firstPost?.dish || '', dishMeta: firstPost?.dishMeta || '', category: firstPost?.category || 'local' })
    setComposerOpen(true)
  }
  const changeComposerRestaurant = (restaurantId: string) => {
    const nextRestaurant = historyRestaurants.find((restaurant) => restaurant.id === restaurantId)
    const nextPost = nextRestaurant ? posts.find((post) => post.restaurantId === nextRestaurant.id) || foodPosts.find((post) => post.restaurantId === nextRestaurant.id) : undefined
    setComposerRestaurantId(restaurantId)
    setDraft((current) => ({ ...current, dish: nextPost?.dish || '', dishMeta: nextPost?.dishMeta || '', category: nextPost?.category || current.category }))
  }
  const publishPost = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRestaurant || !draft.title.trim() || !draft.body.trim() || !draft.dish.trim()) return
    const nextPost: FoodPost = {
      id: `post-user-${Date.now()}`,
      restaurantId: selectedRestaurant.id,
      category: draft.category,
      categoryLabel: foodCategoryLabels[language][draft.category] || foodCategoryLabels[language].all,
      author: p.you,
      initials: 'YO',
      avatarTone: 'avatar-coral',
      time: localizedPostMeta[language].justNow,
      title: draft.title.trim(),
      body: draft.body.trim(),
      dish: draft.dish.trim(),
      dishMeta: draft.dishMeta.trim() || localizedPostMeta[language].worthTrying,
      imageSrc: draft.imageSrc || referencePost?.imageSrc || '/dish-photos/old-town-kitchen-signature.png',
      imageTone: referencePost?.imageTone || 'feed-image-coral',
      likes: 0,
      comments: 0,
    }
    setPosts((current) => [nextPost, ...current])
    setActiveCategory('all')
    setComposerOpen(false)
  }
  const handleFoodPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDraft((current) => ({ ...current, imageSrc: typeof reader.result === 'string' ? reader.result : current.imageSrc }))
    reader.readAsDataURL(file)
    event.target.value = ''
  }
  useEffect(() => { localStorage.setItem('cit:food-posts', JSON.stringify(posts)) }, [posts])
  useEffect(() => {
    if (!composerOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    return () => { document.body.style.overflow = previousOverflow }
  }, [composerOpen])

  return <div className={`page page-narrow ${communityMode ? 'page-community' : 'page-find'}`}>
    <PageHeader title={communityMode ? 'Community' : t('findFood')} hideKicker backLabel={p.back} onBack={onBack} action={<button type="button" className="icon-button soft" onClick={openComposer} aria-label={p.createFoodPost}><Icon name="plus" size={20} /></button>} />
    <div className={`feed-intro ${communityMode ? 'community-intro' : ''}`}>
      <div><span className="community-eyebrow">{communityMode ? 'COMMUNITY' : p.exploreKicker}</span><h1>{communityMode ? 'Share what you found at the table.' : p.findHeading}</h1><p>{communityMode ? 'Real notes, dishes and small discoveries from people eating nearby.' : p.findDescription}</p></div>
      {communityMode && <div className="community-count"><strong>{posts.length}</strong><span>notes from the table</span></div>}
    </div>
    <div className="feed-categories" aria-label={p.foodCategories}>{foodCategories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? 'active' : ''} onClick={() => setActiveCategory(category.id)}>{foodCategoryLabels[language][category.id]}</button>)}</div>
    <div className="feed-context"><span className="feed-context-icon"><Icon name="leaf" size={15} /></span><span><strong>{p.communityPicks}</strong><small>{p.communityHint}</small></span></div>
    <div className={`feed-grid ${communityMode ? 'community-feed-grid' : ''}`}>{visiblePosts.map((post) => {
      const restaurant = restaurants.find((item) => item.id === post.restaurantId)
      if (!restaurant) return null
      const restaurantText = localizedRestaurant(language, restaurant)
      const postText = localizedPost(language, post)
      const saved = savedRestaurants.some((item) => item.id === restaurant.id)
      const liked = likedPosts.includes(post.id)
      return <article className={`feed-post ${communityMode ? 'community-feed-post' : ''}`} key={post.id}>
        <div className={`feed-media ${post.imageTone}`}><img src={post.imageSrc} alt={postText.dish} /><span className="feed-media-category">{foodCategoryLabels[language][post.category] || post.categoryLabel}</span></div>
        <div className="feed-post-body">
          <div className="feed-author"><span className={`feed-avatar ${post.avatarTone}`}>{post.initials}</span><span><strong>{post.author}</strong><small>{postText.time} · {restaurantText.location.split(' · ')[0]}</small></span><button type="button" className="feed-more" aria-label={`${p.moreOptions} ${postText.title}`}><Icon name="dots" size={17} /></button></div>
          <h2>{postText.title}</h2>
          <p>{postText.body}</p>
          <div className="feed-dish"><small>{p.mustTry}</small><strong>{postText.dish}</strong><span>{postText.dishMeta}</span></div>
          <div className="feed-restaurant"><span className={`feed-restaurant-mark ${restaurant.tone}`}>{restaurant.emoji}</span><span className="feed-restaurant-copy"><strong>{restaurantText.name || restaurant.name}</strong><small>{restaurantText.location} · {restaurantText.cuisine}</small></span><button type="button" className={`feed-save ${saved ? 'saved' : ''}`} aria-label={saved ? `${p.removeFromSaved} ${restaurantText.name || restaurant.name}` : `${p.save} ${restaurantText.name || restaurant.name}`} onClick={() => onToggleRestaurant(restaurant)}><Icon name="bookmark" size={16} /><span>{saved ? p.saved : p.save}</span></button></div>
          <div className="feed-actions"><button type="button" className={liked ? 'liked' : ''} onClick={() => toggleLike(post.id)}><Icon name="heart" size={15} /> {post.likes + (liked ? 1 : 0)}</button><span><Icon name="dots" size={15} /> {post.comments}</span><button type="button" aria-label={`${p.sharePost} ${postText.title}`}><Icon name="share" size={15} /></button></div>
        </div>
      </article>
    })}</div>
    {!visiblePosts.length && <div className="feed-empty"><span>🍜</span><strong>{p.noNotes}</strong><small>{p.keepExploring}</small></div>}
    {!communityMode && nearbyRestaurants.length > 0 && <section className="nearby-restaurant-section"><div className="nearby-restaurant-heading"><div><h2>{nearbyText.title}</h2><p>{nearbyText.description}</p></div><Icon name="compass" size={20} /></div><div className="restaurant-list nearby-restaurant-list">{nearbyRestaurants.map((restaurant) => { const restaurantText = localizedRestaurant(language, restaurant); const displayName = restaurantText.name || restaurant.name; const saved = savedRestaurants.some((item) => item.id === restaurant.id); return <article className="restaurant-card" key={restaurant.id}><div className={`restaurant-photo ${restaurant.tone}`}>{restaurant.photoSrc ? <img src={restaurant.photoSrc} alt="" loading="lazy" /> : restaurant.emoji}</div><div><div className="restaurant-top"><strong>{displayName}</strong><button type="button" className={`restaurant-save-toggle ${saved ? 'saved' : ''}`} aria-pressed={saved} aria-label={saved ? `${p.removeFromSaved} ${displayName}` : `${p.save} ${displayName}`} onClick={() => onToggleRestaurant(restaurant)}><Icon name={saved ? 'check' : 'bookmark'} size={16} /><span>{saved ? p.saved : p.save}</span></button></div><p>{restaurantText.cuisine}</p><small><Icon name="shield" size={14} /> {restaurantText.why}</small><div className="restaurant-meta"><span>{restaurantText.location}</span><span>{restaurant.rating?.toFixed(1) || '—'} ★</span></div><small className="restaurant-source">{nearbyText.source}: {restaurant.source}</small></div></article> })}</div></section>}
    {composerOpen && createPortal(<div className="sheet-backdrop feed-compose-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposerOpen(false) }}><form className={`feed-compose-sheet ${communityMode ? 'community-compose-sheet' : ''}`} role="dialog" aria-modal="true" aria-label={p.createFoodPost} onSubmit={publishPost} onMouseDown={(event) => event.stopPropagation()}>
      <div className="feed-compose-heading"><div><span className="community-eyebrow">{communityMode ? 'COMMUNITY' : p.exploreKicker}</span><h2>{p.createFoodNote}</h2><p>{communityMode ? 'Keep the useful details: what you ordered, how it tasted and what others should know.' : p.historyOnly}</p></div><button type="button" className="icon-button soft" onClick={() => setComposerOpen(false)} aria-label={p.closeComposer}><Icon name="close" size={18} /></button></div>
      <label className="feed-compose-field">{p.visitedRestaurant}<select value={selectedRestaurant?.id || ''} onChange={(event) => changeComposerRestaurant(event.target.value)} disabled={!historyRestaurants.length}>{historyRestaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name} · {localizedRestaurant(language, restaurant).location}</option>)}</select></label>
      <div className="feed-compose-order-note"><Icon name="receipt" size={15} /><span>{selectedRestaurant ? `${p.pastVisit} · ${pastOrders.find((order) => order.restaurant === selectedRestaurant.name)?.time || ''}` : p.noHistory}</span></div>
      <section className="feed-compose-photo-field"><div className="feed-compose-label">Food photo <span>Optional, but a real plate helps others decide</span></div>{draft.imageSrc ? <div className="feed-compose-photo-preview"><img src={draft.imageSrc} alt="Selected food" /><button type="button" onClick={() => setDraft((current) => ({ ...current, imageSrc: undefined }))}>Remove</button></div> : <div className="feed-compose-photo-actions"><button type="button" onClick={() => cameraInputRef.current?.click()}><Icon name="camera" size={18} /><strong>Take a photo</strong><small>Use your camera</small></button><button type="button" onClick={() => galleryInputRef.current?.click()}><Icon name="image" size={18} /><strong>Choose from gallery</strong><small>Pick from your album</small></button></div>}<input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoodPhoto} hidden /><input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFoodPhoto} hidden /></section>
      <label className="feed-compose-field">Post title <span className="feed-compose-helper">Give this meal a memorable one-line takeaway</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={p.titlePlaceholder} required /></label>
      <label className="feed-compose-field">What did you order? <span className="feed-compose-helper">Name the dish others should look for</span><input value={draft.dish} onChange={(event) => setDraft({ ...draft, dish: event.target.value })} placeholder={p.dishName} required /></label>
      <label className="feed-compose-field">{p.cuisineCategory}<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{foodCategories.filter((category) => category.id !== 'all').map((category) => <option key={category.id} value={category.id}>{foodCategoryLabels[language][category.id]}</option>)}</select></label>
      <label className="feed-compose-field">Your quick take <span className="feed-compose-helper">Tell people about taste, texture, portion, or who would enjoy it</span><textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="e.g. Floral and chewy, best shared after a spicy meal." rows={4} required /></label>
      <label className="feed-compose-field">Extra details <span className="feed-compose-helper">Optional: price, spice level, or a useful ordering tip</span><input value={draft.dishMeta} onChange={(event) => setDraft({ ...draft, dishMeta: event.target.value })} placeholder={p.dishDetailsPlaceholder} /></label>
      <div className="feed-compose-actions"><button type="button" className="button button-secondary" onClick={() => setComposerOpen(false)}>{p.cancel}</button><Button type="submit" icon="plus" disabled={!selectedRestaurant}>{p.publishNote}</Button></div>
    </form></div>, document.body)}
  </div>
}

function Orders({ language, currentOrder, pastOrders, onOpenOrder, onSplitBill }: { language: Language; currentOrder: DiningOrder | null; pastOrders: DiningOrder[]; onOpenOrder: (order: DiningOrder) => void; onSplitBill: (order: DiningOrder) => void }) {
  const text = orderCopy[language]
  return <div className="page page-narrow page-orders">
    <div className="orders-heading"><div><h1>{text.title}</h1><p>{text.subtitle}</p></div><span className="orders-count"><Icon name="receipt" size={17} /> {pastOrders.length + (currentOrder ? 1 : 0)}</span></div>
    <section className="orders-section"><div className="orders-section-heading"><h2>{text.current}</h2>{currentOrder && <span className="status-chip match"><span className="status-dot" /> {text.inProgress}</span>}</div>{currentOrder ? <OrderCard language={language} text={text} order={currentOrder} onOpenOrder={onOpenOrder} onSplitBill={onSplitBill} /> : <div className="orders-empty"><Icon name="receipt" size={22} /><span>{text.emptyCurrent}</span></div>}</section>
    <section className="orders-section"><div className="orders-section-heading"><h2>{text.past}</h2><span className="muted-small">{pastOrders.length} {text.items}</span></div><div className="past-order-list">{pastOrders.length ? pastOrders.map((order) => <OrderCard key={order.id} language={language} text={text} order={order} onOpenOrder={onOpenOrder} onSplitBill={onSplitBill} />) : <div className="orders-empty"><Icon name="receipt" size={22} /><span>{text.emptyPast}</span></div>}</div></section>
  </div>
}

function OrderCard({ language, text, order, onOpenOrder, onSplitBill }: { language: Language; text: OrderCopy; order: DiningOrder; onOpenOrder?: (order: DiningOrder) => void; onSplitBill?: (order: DiningOrder) => void }) {
  const isCurrent = order.status === 'current'
  const preview = order.cartSnapshot?.length ? order.cartSnapshot.map(({ dish, quantity }) => `${dish.localized[language]} ×${quantity}`).join(' · ') : order.billItems.map((item) => item.dish.localized[language]).join(' · ')
  return <article className={`order-record ${isCurrent ? 'order-record-current' : 'order-record-past'}`}>
    <div className="order-record-top"><span className={`order-restaurant-mark ${order.tone}`}>{order.initials}</span><div className="order-record-restaurant"><div className="order-record-name"><strong>{order.restaurant}</strong><span className={`order-status ${isCurrent ? 'order-status-active' : 'order-status-complete'}`}><span className="status-dot" /> {isCurrent ? text.inProgress : text.completed}</span></div><small>{order.location}</small><span className="order-record-time">{order.time}</span></div><strong className="order-record-total">¥{order.total}</strong></div>
    <div className="order-record-divider" />
    <div className="order-record-summary"><span>{order.itemCount} {text.items}</span><span>{text.total} <strong>¥{order.total}</strong></span></div><p className="order-record-preview">{preview || order.preview}</p>
    {(onOpenOrder && order.cartSnapshot?.length || onSplitBill) && <div className={`order-record-actions ${onOpenOrder && order.cartSnapshot?.length ? '' : 'single'}`}>{onOpenOrder && order.cartSnapshot?.length ? <Button variant="secondary" onClick={() => onOpenOrder(order)} icon="menu">{text.viewMenu}</Button> : null}{onSplitBill && <Button className="full-button" onClick={() => onSplitBill(order)} icon="receipt">{text.splitBill}</Button>}</div>}
  </article>
}

function PassportPage({ language, t, passport, updatePassport, onBack }: { language: Language; t: (key: CopyKey) => string; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void; onBack: () => void }) {
  return <div className="page page-narrow page-profile profile-passport-page">
    <div className="profile-passport-frame">
      <PassportEditor language={language} t={t} passport={passport} updatePassport={updatePassport} onBack={onBack} onFinish={onBack} finishLabel={onboardingCopy[language].saveChanges} finishIcon="check" />
    </div>
  </div>
}

function SavedRestaurantsPage({ p, language, restaurants, onToggleRestaurant, onOpenFind, onBack }: { p: PageCopy; language: Language; restaurants: SavedRestaurant[]; onToggleRestaurant: (restaurant: SavedRestaurant) => void; onOpenFind: () => void; onBack: () => void }) {
  return <div className="page page-narrow page-profile profile-subpage">
    <PageHeader title={p.savedRestaurants} kicker={p.profileFindFood} backLabel={p.back} onBack={onBack} action={<button type="button" className="icon-button soft" onClick={onOpenFind} aria-label={p.openFindFood}><Icon name="compass" size={19} /></button>} />
    <div className="subpage-heading"><h1>{p.placesWorthReturning}</h1><p>{p.savedRestaurantsHint}</p></div>
    <div className="subpage-summary"><span><Icon name="bookmark" size={16} /> {restaurants.length} · {p.savedRestaurants}</span><button type="button" className="text-link" onClick={onOpenFind}>{p.exploreFindFood} <Icon name="arrow" size={15} /></button></div>
    <div className="saved-restaurant-grid saved-restaurant-grid-full">{restaurants.length ? restaurants.map((restaurant) => { const restaurantText = localizedRestaurant(language, restaurant); const displayName = restaurantText.name || restaurant.name; return <article className="saved-restaurant-card" key={restaurant.id}><div className={`saved-restaurant-photo ${restaurant.tone}`}>{restaurant.emoji}</div><div className="saved-restaurant-body"><div className="saved-restaurant-top"><strong>{displayName}</strong><button type="button" className="saved-restaurant-remove" aria-label={`${p.removeFromSaved} ${displayName}`} onClick={() => onToggleRestaurant(restaurant)}><Icon name="close" size={15} /></button></div><span>{restaurantText.cuisine}</span><small>{restaurantText.location}</small><p className="saved-restaurant-why"><Icon name="shield" size={13} /> {restaurantText.why}</p></div></article> }) : <div className="profile-empty-card"><Icon name="bookmark" size={21} /><span>{p.noSavedRestaurants}</span></div>}<button type="button" className="profile-explore-card" onClick={onOpenFind}><span className="profile-explore-icon"><Icon name="plus" size={18} /></span><span><strong>{p.exploreFindFood}</strong><small>{p.saveFromFeed}</small></span><Icon name="arrow" size={17} /></button></div>
  </div>
}

function CompanionsPage({ p, account, accounts, companions, incomingInvites, outgoingInvites, onAddCompanion, onAcceptInvite, onDeclineInvite, onRemoveCompanion, onOpenCompanion, onBack }: { p: PageCopy; account: UserProfile; accounts: StoredAccount[]; companions: Companion[]; incomingInvites: CompanionInvite[]; outgoingInvites: CompanionInvite[]; onAddCompanion: (email: string) => CompanionAddResult; onAcceptInvite: (id: string) => void; onDeclineInvite: (id: string) => void; onRemoveCompanion: (id: string) => void; onOpenCompanion: (email: string) => void; onBack: () => void }) {
  const [companionEmail, setCompanionEmail] = useState('')
  const [companionNotice, setCompanionNotice] = useState('')
  const connectedCompanions = companions
  const profileForEmail = (email: string) => accounts.find((record) => normalizeEmail(record.profile.email) === normalizeEmail(email))?.profile
  const submitCompanion = () => {
    const result = onAddCompanion(companionEmail)
    setCompanionNotice(result.message)
    if (result.ok) setCompanionEmail('')
  }
  return <div className="page page-narrow page-profile profile-subpage">
    <PageHeader title={p.companions} kicker={p.profileAtTable} backLabel={p.back} onBack={onBack} />
    <div className="subpage-heading"><h1>{p.makeMenuWork}</h1><p>{p.connectPassport}</p></div>
    <div className="subpage-summary"><span><Icon name="users" size={16} /> {connectedCompanions.length} {p.connected}</span><span className="subpage-summary-muted">{incomingInvites.length ? `${incomingInvites.length} ${p.invitationsToReview}` : p.privateSettings}</span></div>
    {incomingInvites.length > 0 && <section className="companion-inbox"><div className="companion-section-heading"><div><h2>{p.wantsToDine}</h2></div><span className="companion-count-badge">{incomingInvites.length}</span></div><div className="companion-inbox-list">{incomingInvites.map((invite) => { const sender = profileForEmail(invite.fromEmail); if (!sender) return null; return <article className="companion-inbox-card" key={invite.id}><span className="companion-avatar companion-avatar-pending">{initialsForProfile(sender)}</span><div className="companion-copy"><strong>{sender.username}</strong><small>{sender.email}</small><p>{p.shareConnection}</p></div><div className="companion-inbox-actions"><Button variant="primary" onClick={() => onAcceptInvite(invite.id)} icon="check">{p.accept}</Button><button type="button" className="text-link companion-decline" onClick={() => onDeclineInvite(invite.id)}>{p.decline}</button></div></article> })}</div></section>}
    {outgoingInvites.length > 0 && <section className="companion-outbox"><div className="companion-section-heading"><div><h2>{p.invitationsSent}</h2></div></div><div className="companion-outbox-list">{outgoingInvites.map((invite) => { const recipient = profileForEmail(invite.toEmail); if (!recipient) return null; return <article className="companion-outbox-card" key={invite.id}><span className="companion-avatar companion-avatar-pending">{initialsForProfile(recipient)}</span><div className="companion-copy"><strong>{recipient.username}</strong><small>{recipient.email}</small></div><span className="companion-status companion-status-pending">{p.pending}</span></article> })}</div></section>}
    <div className="companion-add-card"><div className="companion-add-heading"><span className="profile-setting-icon profile-setting-icon-coral"><Icon name="users" size={20} /></span><div><strong>{p.addCompanion}</strong><small>{p.inviteRegistered}</small></div></div><form className="companion-add-form" onSubmit={(event) => { event.preventDefault(); submitCompanion() }}><input aria-label={p.companionEmail} type="email" value={companionEmail} onChange={(event) => setCompanionEmail(event.target.value)} placeholder="friend@example.com" /><Button type="submit" icon="plus" disabled={!companionEmail.trim()}>{p.invite}</Button></form><p className="companion-add-hint"><Icon name="shield" size={14} /> {p.registeredOnly}</p>{companionNotice && <p className="companion-notice">{companionNotice}</p>}</div>
    <div className="companion-list">{connectedCompanions.length ? connectedCompanions.map((companion) => <article className="companion-card" key={companion.id}><span className="companion-avatar companion-avatar-connected">{companion.initials}</span><div className="companion-copy"><div className="companion-name-row"><strong>{companion.name}</strong><span className="companion-status companion-status-connected">{p.connected}</span></div><small>{companion.email}</small><p>{companion.note}</p></div><div className="companion-card-actions"><Button variant="secondary" onClick={() => onOpenCompanion(companion.email)}>{p.viewFoodPassport}</Button></div></article>) : <div className="companion-empty-state"><Icon name="users" size={22} /><strong>{p.noCompanions}</strong><span>{p.buildTableProfile}</span></div>}</div>
    {connectedCompanions.length > 0 && <div className="companion-flow-note"><Icon name="check" size={16} /><span>{p.companionFlow}</span></div>}
  </div>
}

function CompanionDetailPage({ p, language, companion, onUnlink, onBack }: { p: PageCopy; language: Language; companion: Companion; onUnlink: () => void; onBack: () => void }) {
  const passport = companion.passport
  const allergyText = [...passport.allergies.map((id) => allergenLabel(language, id, id)), ...(passport.otherAllergen ? [passport.otherAllergen] : [])].join(', ') || p.noShared
  const dietText = passport.dietStyle !== 'none' ? passportOptionTranslations[language].dietStyle[passport.dietStyle].label : p.noDietShared
  const avoidText = passport.avoidFoods.length ? passport.avoidFoods.map((id) => passportOptionTranslations[language].avoidFood[id] || id).join(', ') : p.noRulesShared
  const preferenceText = passport.preferences.length ? passport.preferences.map((id) => passportOptionTranslations[language].preference[id] || id).join(', ') : p.noPreferencesShared
  const crossContactText = Object.values(passport.allergyProfiles).some((profile) => profile.crossContact) || passport.crossContact ? p.avoidCrossContact : p.notSpecified
  return <div className="page page-narrow page-profile profile-subpage companion-detail-page">
    <PageHeader title={companion.name} kicker={p.companionReadOnly} backLabel={p.back} onBack={onBack} />
    <div className="subpage-heading"><h1>{companion.name} · {p.tableProfile}</h1><p>{companion.email} · {p.useSettings} {companion.name} {p.canEdit}</p></div>
    <section className="companion-readonly-card"><div className="companion-readonly-heading"><span className="companion-avatar companion-avatar-connected">{companion.initials}</span><div><strong>{companion.name}</strong><small>{companion.note}</small></div><span className="companion-status companion-status-connected">{p.readOnly}</span></div><div className="readonly-passport-grid"><div className="readonly-passport-row"><span>{p.allergens}</span><strong>{allergyText}</strong></div><div className="readonly-passport-row"><span>{p.dietaryStyle}</span><strong>{dietText}</strong></div><div className="readonly-passport-row"><span>{p.foodsToAvoid}</span><strong>{avoidText}</strong></div><div className="readonly-passport-row"><span>{p.everydayPreferences}</span><strong>{preferenceText}</strong></div><div className="readonly-passport-row"><span>{p.spicePreference}</span><strong>{passport.spiceLevel === null ? p.notSet : `${p.upToLevel} ${passport.spiceLevel}`}</strong></div><div className="readonly-passport-row"><span>{p.kitchenSafety}</span><strong>{crossContactText}</strong></div></div><div className="companion-detail-note"><Icon name="shield" size={16} /><span>{p.readonlyNote}</span></div></section>
    <Button variant="danger" className="full-button" onClick={onUnlink} icon="close">{p.unlinkCompanion}</Button>
  </div>
}

function SubscriptionBenefits({ tier }: { tier: 'free' | 'pro' }) {
  return <ul className="subscription-benefits">{subscriptionBenefits.map((benefit) => { const enabled = tier === 'free' ? benefit.free : benefit.pro; return <li key={`${tier}-${benefit.proLabel}`} className={enabled ? 'is-included' : 'is-excluded'}><Icon name={enabled ? 'check' : 'close'} size={13} /><span>{tier === 'free' ? benefit.freeLabel : benefit.proLabel}</span></li> })}</ul>
}

function SubscriptionModal({ language, user, onClose, onSelect }: { language: Language; user: UserProfile; onClose: () => void; onSelect: (days: number | null) => void }) {
  const text = subscriptionTextFor(language)
  const [selectedPlan, setSelectedPlan] = useState<number | null>(user.subscriptionTier === 'pro' ? user.subscriptionPlanDays || 7 : 7)
  const selectPlan = (days: number | null) => { setSelectedPlan(days); onSelect(days) }
  return <div className="subscription-backdrop" onClick={onClose}><section className="subscription-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-title" onClick={(event) => event.stopPropagation()}><div className="subscription-modal-top"><div><span className="eyebrow">{text.entry}</span><h2 id="subscription-title">{text.title}</h2><p>{text.subtitle}</p></div><button type="button" className="icon-button soft" onClick={onClose} aria-label={text.close}><Icon name="close" size={18} /></button></div><div className="subscription-tier-comparison"><button type="button" className={`subscription-tier-card subscription-tier-card-free ${selectedPlan === null ? 'selected' : ''}`} aria-pressed={selectedPlan === null} onClick={() => selectPlan(null)}><span className="subscription-tier-card-heading"><strong>{text.free}</strong><b>¥0</b></span><SubscriptionBenefits tier="free" /></button><button type="button" className={`subscription-tier-card subscription-tier-card-pro ${selectedPlan !== null ? 'selected' : ''}`} aria-pressed={selectedPlan !== null} onClick={() => selectPlan(selectedPlan || subscriptionPlans[1].days)}><span className="subscription-tier-card-heading"><strong>Pro</strong><b>{subscriptionPlans[0].price}+</b></span><SubscriptionBenefits tier="pro" /></button></div><div className="subscription-plan-grid">{subscriptionPlans.map((plan) => { const selected = selectedPlan === plan.days; return <button type="button" key={plan.days} aria-label={`${plan.days} days · ${plan.price}`} className={`subscription-plan ${plan.featured ? 'subscription-plan-featured' : ''} ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => selectPlan(plan.days)}>{plan.featured && <span className="subscription-featured">{text.bestValue}</span>}<strong>{plan.days} days</strong><b>{plan.price}</b>{selected && <span className="subscription-selected-mark"><Icon name="check" size={13} /></span>}</button> })}</div></section></div>
}

function Profile({ t, p, language, user, passport, restaurants, companions, pendingInviteCount, onOpenSavedRestaurants, onOpenCompanions, onOpenPassport, onLanguageChange, onAvatarChange, onSubscriptionChange, onLogout, onReset }: { t: (key: CopyKey) => string; p: PageCopy; language: Language; user: UserProfile; passport: Passport; restaurants: SavedRestaurant[]; companions: Companion[]; pendingInviteCount: number; onOpenSavedRestaurants: () => void; onOpenCompanions: () => void; onOpenPassport: () => void; onLanguageChange: (language: Language) => void; onAvatarChange: (avatarSrc: string) => void; onSubscriptionChange: (days: number | null) => void; onLogout: () => void; onReset: () => void }) {
  const text = subscriptionTextFor(language)
  const accountText = accountCopy[language]
  const [languageOpen, setLanguageOpen] = useState(false)
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const passportCount = passport.allergies.length + (passport.otherAllergen ? 1 : 0) + passport.avoidFoods.length + (passport.dietStyle !== 'none' ? 1 : 0)
  const connectedCompanions = companions.length
  const activePro = user.subscriptionTier === 'pro' && (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > Date.now())
  const tierLabel = activePro ? subscriptionTierCopy[language].pro : text.free
  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') onAvatarChange(reader.result) }
    reader.readAsDataURL(file)
    event.target.value = ''
  }
  return <div className="page page-narrow page-profile profile-dashboard">
    <section className="profile-account-card"><input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} hidden /><button type="button" className="profile-avatar" onClick={() => avatarInputRef.current?.click()} aria-label="Change profile photo">{user.avatarSrc ? <img src={user.avatarSrc} alt="" /> : <span>{initialsForProfile(user)}</span>}<span className="profile-avatar-edit"><Icon name="camera" size={14} /></span></button><div className="profile-account-details"><div><strong>{user.username}</strong><small>{user.email}</small></div><div className="profile-subscription-summary"><span className={`profile-tier-badge ${activePro ? 'profile-tier-pro' : 'profile-tier-free'}`}>{tierLabel}</span><span>{subscriptionExpiryLabel(language, activePro ? user.subscriptionExpiresAt : null)}</span></div></div></section>
    <section className="profile-section"><div className="profile-section-label">{p.yourFoodProfile}</div><div className="profile-entry-list"><button className="profile-setting-card profile-passport-entry" onClick={onOpenPassport}><span className="profile-setting-icon profile-setting-icon-green"><Icon name="shield" size={21} /></span><span className="profile-setting-copy"><strong>{accountText.foodPassportTitle}</strong><small>{accountText.foodPassportDesc}</small></span><span className="profile-setting-meta">{passportCount}<small>{accountText.passportSummary}</small></span><Icon name="arrow" size={18} /></button><button className="profile-setting-card profile-entry-card" onClick={onOpenCompanions}><span className="profile-setting-icon profile-setting-icon-green"><Icon name="users" size={20} /></span><span className="profile-setting-copy"><strong>{p.myCompanions}</strong><small>{p.sharedPassports}</small></span><span className="profile-setting-meta">{connectedCompanions}<small>{pendingInviteCount ? `${pendingInviteCount} ${p.new}` : p.connected}</small></span>{pendingInviteCount > 0 && <span className="profile-entry-alert"><Icon name="alert" size={14} /> {pendingInviteCount}</span>}<Icon name="arrow" size={18} /></button></div></section>
    <section className="profile-section"><div className="profile-section-label">{p.tableToolkit}</div><div className="profile-entry-list"><button className="profile-setting-card profile-entry-card" onClick={onOpenSavedRestaurants}><span className="profile-setting-icon profile-setting-icon-coral"><Icon name="bookmark" size={20} /></span><span className="profile-setting-copy"><strong>{p.savedRestaurants}</strong><small>{p.placesTryNext}</small></span><span className="profile-setting-meta">{restaurants.length}<small>{p.savedCountLabel}</small></span><Icon name="arrow" size={18} /></button><button className="profile-setting-card profile-entry-card profile-subscription-entry" onClick={() => setSubscriptionOpen(true)}><span className="profile-setting-icon profile-setting-icon-coral"><Icon name="wallet" size={20} /></span><span className="profile-setting-copy"><strong>{text.entry}</strong><small>{text.entryDesc}</small></span><Icon name="arrow" size={18} /></button></div></section>
    <section className="profile-section"><div className="profile-section-label">{accountText.otherSettings}</div>
      <button className="profile-setting-card" onClick={() => setLanguageOpen((open) => !open)}><span className="profile-setting-icon"><Icon name="compass" size={20} /></span><span className="profile-setting-copy"><strong>{accountText.languagePreference}</strong><small>{accountText.languagePreferenceDesc}</small></span><span className="profile-language-value">{language.toUpperCase()}</span><Icon name="chevron" size={17} /></button>
      {languageOpen && <div className="profile-language-panel"><div className="language-select-grid">{languages.map((item) => <button key={item.code} className={language === item.code ? 'active' : ''} onClick={() => { onLanguageChange(item.code); setLanguageOpen(false) }}><strong>{item.label}</strong><span>{item.native}</span></button>)}</div></div>}
      <button className="profile-setting-card" onClick={onLogout}><span className="profile-setting-icon"><Icon name="back" size={20} /></span><span className="profile-setting-copy"><strong>{accountText.signOut}</strong><small>{accountText.signOutDesc}</small></span><Icon name="arrow" size={18} /></button>
      <button className="profile-setting-card profile-danger-row" onClick={onReset}><span className="profile-setting-icon"><Icon name="refresh" size={20} /></span><span className="profile-setting-copy"><strong>{accountText.resetDemo}</strong><small>{accountText.resetDemoDesc}</small></span><Icon name="arrow" size={18} /></button>
    </section>
    {subscriptionOpen && <SubscriptionModal language={language} user={user} onSelect={onSubscriptionChange} onClose={() => setSubscriptionOpen(false)} />}
  </div>
}

function BottomNav({ language, screen, openScreen, t }: { language: Language; screen: Screen; openScreen: (screen: Screen) => void; t: (key: CopyKey) => string }) { return <nav className="bottom-nav"><button className={screen === 'home' ? 'active' : ''} onClick={() => openScreen('home')}><Icon name="home" size={19} /><span>{t('home')}</span></button><button className={screen === 'find' ? 'active' : ''} onClick={() => openScreen('find')}><Icon name="compass" size={19} /><span>{t('findFood')}</span></button><button className={screen === 'community' ? 'active' : ''} onClick={() => openScreen('community')}><Icon name="users" size={19} /><span>Community</span></button><button className={screen === 'orders' ? 'active' : ''} onClick={() => openScreen('orders')}><Icon name="receipt" size={19} /><span>{orderCopy[language].nav}</span></button><button className={screen === 'profile' || screen === 'passport' || screen === 'savedRestaurants' || screen === 'companions' || screen === 'companionDetail' ? 'active' : ''} onClick={() => openScreen('profile')}><Icon name="user" size={19} /><span>{t('foodPassport')}</span></button></nav> }

export default App
