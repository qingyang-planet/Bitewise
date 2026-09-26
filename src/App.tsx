import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode, RefObject } from 'react'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { analyzeMenuImage, askDiningAssistant, validateMenuImage, type BackendDish, type BackendRisk } from './api'

type Language = 'en' | 'ko' | 'ja' | 'ru' | 'es' | 'it'
type Screen = 'home' | 'scan' | 'camera' | 'menu' | 'detail' | 'cart' | 'order' | 'bill' | 'find' | 'orders' | 'profile' | 'passport' | 'savedRestaurants' | 'companions' | 'companionDetail'
type Status = 'MATCH' | 'WARNING' | 'CONFLICT' | 'UNKNOWN'
type BillMode = 'equal' | 'item'
type AllergySeverity = 'mild' | 'moderate' | 'severe'
type AllergyProfile = { severity: AllergySeverity; crossContact: boolean }
type DietStyle = 'none' | 'vegetarian' | 'vegan' | 'lacto' | 'ovo' | 'lacto-ovo' | 'pescatarian' | 'flexitarian'
type FaithDiet = 'none' | 'halal' | 'kosher' | 'other'
type UserProfile = { username: string; email: string }
type SavedRestaurant = { id: string; name: string; initials: string; emoji: string; cuisine: string; location: string; why: string; tone: string }
type Companion = { id: string; name: string; email: string; initials: string; passport: Passport; note: string; inviteId: string }
type CompanionAddResult = { ok: boolean; message: string }
type CompanionInvite = { id: string; fromEmail: string; toEmail: string; status: 'pending' | 'accepted' | 'declined' | 'revoked'; createdAt: number }
type CapturedPage = { id: number; title: string; variant: number }

type Passport = {
  allergies: string[]
  otherAllergen: string
  allergyProfiles: Record<string, AllergyProfile>
  diets: string[]
  dietStyle: DietStyle
  faithDiet: FaithDiet
  faithOther: string
  avoidFoods: string[]
  otherDietary: string
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
  price: number
  imageSrc: string
  className: string
  ingredients: string[]
  zhIngredients: string[]
  allergens: string[]
  possibleAllergens?: string[]
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
  confidence: number
  taste: string
  texture: string
  cooking: string
  bestWith: string
  culture: string
  reason: string
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
  { code: 'ko', label: '한국어', native: 'Korean' },
  { code: 'ja', label: '日本語', native: 'Japanese' },
  { code: 'ru', label: 'Русский', native: 'Russian' },
  { code: 'es', label: 'Español', native: 'Spanish' },
  { code: 'it', label: 'Italiano', native: 'Italian' },
]

const copy = {
  en: {
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
    hello: '여행자님, 안녕하세요', subtitle: '메뉴를 이해하고, 나에게 맞는 음식을 알고, 자신 있게 주문하세요.', scanMenu: '메뉴 스캔', scanSub: '중국어 메뉴를 이해해요.', foodPassport: '푸드 패스포트', anything: '먹을 수 없는 음식이 있나요?', splitBill: '계산서 나누기', findFood: '음식 찾기', recentSession: '현재 식사 세션', menuReady: '메뉴를 살펴볼 준비가 됐어요', dishes: '가지 메뉴', openSession: '세션 열기', home: '홈', profile: '프로필', menu: '메뉴', scan: '스캔', passport: '패스포트', next: '계속', save: '저장하고 메뉴 스캔', selectLanguage: '언어를 선택하세요', languageSub: '앱과 메뉴 설명에 사용할 언어입니다. 직원에게 보여주는 문장은 중국어로 유지됩니다.', avoid: '주의할 음식은 무엇인가요?', passportSub: '가능한 충돌을 알려드리는 데만 사용합니다. 언제든 바꿀 수 있어요.', allergies: '알레르기', diet: '식단 제한', preferences: '일상 선호', severe: '심각', moderate: '보통', mild: '가벼움', noAllergens: '아직 알레르기를 추가하지 않았어요', scanTitle: '메뉴 전체를 화면 안에 맞춰주세요', scanSubTitle: '메뉴 이름과 재료가 선명하게 보이도록 고정하세요.', capture: '메뉴 촬영', upload: '사진 업로드', sampleMenu: '샘플 메뉴 사용', avoidGlare: '빛 반사 피하기', keepFlat: '평평하게', everyPage: '모든 페이지', analyzing: '메뉴를 읽는 중…', analysisSub: '이름, 가격, 푸드 패스포트를 연결하고 있어요', menuResults: '메뉴 결과', checking: '푸드 패스포트와 메뉴를 확인하는 중', all: '전체', forMe: '나에게 맞는 메뉴', vegetarian: '채식', notSpicy: '맵지 않게', viewDetails: '상세 보기', mainIngredients: '주요 재료', taste: '맛', texture: '식감', cooking: '조리법', bestWith: '함께 먹기', culturalNote: '문화 메모', illustrative: '참고용 이미지 · 알레르기 판단에 사용하지 않습니다', askRestaurant: '식당에 확인하기', whySeeing: '이 상태인 이유', noConflict: '현재 선호와 충돌 없음', possibleConflict: '식당에 확인해 주세요', confirmedConflict: '선택한 식단과 맞지 않아요', unable: '이 메뉴를 확실히 인식하지 못했어요', detailsUnknown: '재료를 확정할 근거가 메뉴에 충분하지 않습니다.', detailsConflict: '푸드 패스포트와 충돌하는 재료가 포함되었거나 포함될 수 있습니다.', detailsMatch: '현재 메뉴 정보에서 충돌을 찾지 못했습니다. 알레르기 안전을 보장하지는 않습니다.', askTitle: '식당에 보여주세요', askWarning: '심각한 알레르기', playChinese: '중국어 재생', copyQuestion: '질문 복사', assistant: '다이닝 어시스턴트', helpOrder: '주문 도와줘', planTitle: '테이블을 계획해요', planSub: '식당, 메뉴, 푸드 패스포트를 알고 있어요. 이번 식사에 필요한 것만 알려주세요.', people: '몇 명인가요?', budget: '총 예산', temporary: '이번 식사 선호', planMeal: '식사 계획하기', tablePlan: '테이블 플랜', ruleChecked: '규칙 검증 완료. 모든 메뉴와 가격을 다시 확인했습니다.', total: '합계', edit: '편집', regenerate: '다시 추천', orderThese: '이대로 주문', orderSaved: '이 테이블에 주문을 저장했어요', showWaiter: '직원에게 보여주기', specialRequest: '특별 요청 · 给餐厅', waiterText: '모든 요리를 채식으로 만들고 고수를 넣지 말아 주세요. 확인할 수 없는 재료가 있다면 먼저 알려 주세요.', waiterSub: '직원이 바로 이해할 수 있도록 중국어 요청을 먼저 보여줍니다.', play: '중국어 재생', atTable: '테이블에서', currentOrder: '현재 테이블에 있어요', questions: ['이건 무엇인가요?', '어떻게 먹나요?', '소스는 무엇인가요?', '매운가요?'], askAbout: '이 테이블의 음식 질문하기', answerFrom: '현재 메뉴와 확정된 주문으로 답변합니다', mustEscalate: '모든 소스와 주방 교차 접촉을 메뉴만으로 확인할 수 없습니다. 알레르기가 중요하다면 식당에 물어보세요.', billTitle: '계산서 나누기', billSub: '모든 금액이 원래 CNY 합계와 일치해야 합니다.', scanReceipt: '영수증 스캔', useReceipt: '샘플 영수증 사용', equal: '균등 분할', byItem: '메뉴별', participants: '참여자', billItems: '계산서 항목', share: '결과 공유', verified: '검증된 합계', mismatch: '합계를 맞출 수 없습니다. 강조된 항목을 확인하세요.', findTitle: '나에게 맞는 음식 찾기', findSub: '식당 평점보다 의도에서 시작하세요.', nearby: '내 주변', whyFits: '맞는 이유', profileTitle: '푸드 패스포트', profileSub: '중요한 제한은 직접 관리합니다. 과거 기록으로 알레르기를 추측하지 않습니다.', language: '언어', crossContact: '교차 접촉 피하기', reset: '데모 데이터 초기화', disclaimer: 'CanIEatThis는 메뉴 정보와 사용자의 입력을 바탕으로 판단을 돕습니다. 심각한 알레르기는 식당에 반드시 확인하세요.', matchLabel: '충돌 없음', warningLabel: '확인 필요', conflictLabel: '충돌', unknownLabel: '알 수 없음',
  },
  ja: {
    hello: 'こんにちは、旅人さん', subtitle: '料理を理解し、自分に合うか知って、自信を持って注文しましょう。', scanMenu: 'メニューをスキャン', scanSub: '中国語メニューを理解できます。', foodPassport: 'フードパスポート', anything: '食べられないものはありますか？', splitBill: '割り勘する', findFood: '料理を探す', recentSession: '現在の食事セッション', menuReady: 'メニューを見る準備ができました', dishes: '品', openSession: 'セッションを開く', home: 'ホーム', profile: 'プロフィール', menu: 'メニュー', scan: 'スキャン', passport: 'パスポート', next: '続ける', save: '保存してメニューをスキャン', selectLanguage: '言語を選択', languageSub: 'アプリと料理説明の言語です。スタッフへのメッセージは中国語のままです。', avoid: '避けたいものはありますか？', passportSub: '可能性のある衝突を示すためだけに使います。いつでも変更できます。', allergies: 'アレルギー', diet: '食事制限', preferences: '好み', severe: '重度', moderate: '中程度', mild: '軽度', noAllergens: 'アレルギーはまだありません', scanTitle: 'メニュー全体を画面に収めて', scanSubTitle: '料理名と食材が読めるようにしっかり構えてください。', capture: 'メニューを撮影', upload: '写真をアップロード', sampleMenu: 'サンプルメニューを使う', avoidGlare: '反射を避ける', keepFlat: '平らにする', everyPage: '全ページ', analyzing: 'メニューを読み取り中…', analysisSub: '料理名、価格、パスポート情報を結びつけています', menuResults: 'メニュー結果', checking: 'フードパスポートとメニューを確認中', all: 'すべて', forMe: '自分向け', vegetarian: 'ベジタリアン', notSpicy: '辛くない', viewDetails: '料理の詳細', mainIngredients: '主な食材', taste: '味', texture: '食感', cooking: '調理法', bestWith: 'おすすめの組み合わせ', culturalNote: '文化メモ', illustrative: '参考画像のみ · アレルギー判断には使いません', askRestaurant: 'お店に確認する', whySeeing: 'この状態の理由', noConflict: '好みとの衝突なし', possibleConflict: 'お店に確認してください', confirmedConflict: '選択した食事制限に合いません', unable: '料理を確実に認識できませんでした', detailsUnknown: '食材を確定する情報がメニューに足りません。', detailsConflict: 'フードパスポートと衝突する食材が含まれる、または可能性があります。', detailsMatch: '利用できるメニュー情報から衝突は見つかりませんでした。安全を保証するものではありません。', askTitle: 'お店に見せる', askWarning: '重度のアレルギー', playChinese: '中国語を再生', copyQuestion: '質問をコピー', assistant: 'ダイニングアシスタント', helpOrder: '注文を手伝って', planTitle: 'テーブルを計画しましょう', planSub: 'お店、メニュー、パスポートは把握しています。今回必要な情報だけ入力してください。', people: '何人ですか？', budget: '合計予算', temporary: '今回の好み', planMeal: '食事を計画', tablePlan: 'テーブルプラン', ruleChecked: 'ルール検証済み。メニューと価格を確認しました。', total: '合計', edit: '編集', regenerate: '再生成', orderThese: 'これを注文', orderSaved: 'テーブルに注文を保存しました', showWaiter: 'スタッフに見せる', specialRequest: '特別な要望 · 给餐厅', waiterText: 'すべての料理をベジタリアンにし、パクチーを入れないでください。確認できない場合は先に教えてください。', waiterSub: 'スタッフがすぐ行動できるよう、中国語の要望を先に表示します。', play: '中国語を再生', atTable: 'テーブルで', currentOrder: '現在テーブルにあります', questions: ['これは何ですか？', 'どう食べますか？', 'ソースは何ですか？', 'とても辛いですか？'], askAbout: 'テーブルの料理について質問', answerFrom: 'このメニューと確定した注文から回答します', mustEscalate: 'すべてのソースや厨房の交差接触はメニューだけでは確認できません。アレルギーに関わる場合はお店に確認してください。', billTitle: '割り勘', billSub: 'すべての金額を元のCNY合計に合わせます。', scanReceipt: 'レシートをスキャン', useReceipt: 'サンプルレシートを使う', equal: '均等割り', byItem: '品目ごと', participants: '参加者', billItems: '明細', share: '結果を共有', verified: '確認済み合計', mismatch: '合計が一致しません。強調された項目を確認してください。', findTitle: '自分に合う料理を探す', findSub: 'お店の評価ではなく、目的から始めましょう。', nearby: '近く', whyFits: '合う理由', profileTitle: 'フードパスポート', profileSub: '重要な制限は自分で管理します。履歴からアレルギーを推測しません。', language: '言語', crossContact: '交差接触を避ける', reset: 'デモデータをリセット', disclaimer: 'CanIEatThisはメニュー情報と入力内容から判断を支援します。重度のアレルギーは必ずお店に確認してください。', matchLabel: '衝突なし', warningLabel: '要確認', conflictLabel: '衝突', unknownLabel: '不明',
  },
  ru: {
    hello: 'Здравствуйте, путешественник', subtitle: 'Поймите блюдо, узнайте, подходит ли оно вам, и заказывайте уверенно.', scanMenu: 'Сканировать меню', scanSub: 'Поймите любое китайское меню.', foodPassport: 'Пищевой паспорт', anything: 'Есть ли продукты, которые вы не едите?', splitBill: 'Разделить счёт', findFood: 'Найти еду', recentSession: 'Текущая сессия', menuReady: 'Меню готово к изучению', dishes: 'блюд', openSession: 'Открыть сессию', home: 'Главная', profile: 'Профиль', menu: 'Меню', scan: 'Скан', passport: 'Паспорт', next: 'Продолжить', save: 'Сохранить и сканировать', selectLanguage: 'Выберите язык', languageSub: 'Язык приложения и описаний блюд. Сообщения для персонала остаются на китайском.', avoid: 'Что нужно учитывать?', passportSub: 'Используем только для предупреждений о возможных конфликтах. Можно изменить в любое время.', allergies: 'Аллергены', diet: 'Ограничения питания', preferences: 'Предпочтения', severe: 'Сильная', moderate: 'Средняя', mild: 'Лёгкая', noAllergens: 'Аллергены пока не добавлены', scanTitle: 'Поместите всё меню в кадр', scanSubTitle: 'Держите телефон ровно, чтобы названия и ингредиенты были читаемы.', capture: 'Снять меню', upload: 'Загрузить фото', sampleMenu: 'Использовать пример', avoidGlare: 'Без бликов', keepFlat: 'Ровно', everyPage: 'Все страницы', analyzing: 'Читаем меню…', analysisSub: 'Связываем блюда, цены и ваш пищевой паспорт', menuResults: 'Результаты меню', checking: 'Проверяем меню по вашему пищевому паспорту', all: 'Все', forMe: 'Для меня', vegetarian: 'Вегетарианское', notSpicy: 'Не острое', viewDetails: 'Подробнее', mainIngredients: 'Основные ингредиенты', taste: 'Вкус', texture: 'Текстура', cooking: 'Приготовление', bestWith: 'Лучше с', culturalNote: 'Культурная заметка', illustrative: 'Только иллюстрация · фото не определяет аллергены', askRestaurant: 'Спросить ресторан', whySeeing: 'Почему вы это видите', noConflict: 'Конфликтов не найдено', possibleConflict: 'Уточните в ресторане', confirmedConflict: 'Не подходит выбранной диете', unable: 'Не удалось надёжно определить блюдо', detailsUnknown: 'В меню недостаточно данных для уверенного решения об ингредиентах.', detailsConflict: 'Блюдо содержит или может содержать ингредиент, конфликтующий с паспортом.', detailsMatch: 'В доступных данных меню конфликтов нет. Это не гарантия безопасности.', askTitle: 'Покажите это ресторану', askWarning: 'При сильной аллергии', playChinese: 'Воспроизвести на китайском', copyQuestion: 'Скопировать вопрос', assistant: 'Помощник по ужину', helpOrder: 'Помогите заказать', planTitle: 'Составим стол', planSub: 'Я знаю ресторан, меню и ваш паспорт. Укажите только то, чего не хватает для этого ужина.', people: 'Сколько человек?', budget: 'Общий бюджет', temporary: 'Предпочтения на этот раз', planMeal: 'Спланировать ужин', tablePlan: 'План стола', ruleChecked: 'Проверено правилами. Все блюда и цены есть в меню.', total: 'Итого', edit: 'Изменить', regenerate: 'Сгенерировать ещё', orderThese: 'Заказать это', orderSaved: 'Заказ сохранён для этого стола', showWaiter: 'Показать официанту', specialRequest: 'Особая просьба · 给餐厅', waiterText: 'Пожалуйста, приготовьте все блюда без мяса и морепродуктов и не добавляйте кинзу. Если состав нельзя подтвердить, сначала сообщите нам.', waiterSub: 'Сначала показываем китайскую просьбу, чтобы персонал понял её сразу.', play: 'Воспроизвести китайский', atTable: 'За столом', currentOrder: 'сейчас на вашем столе', questions: ['Что это?', 'Как это есть?', 'Что в соусе?', 'Очень остро?'], askAbout: 'Спросить о блюдах на столе', answerFrom: 'Ответ на основе меню и подтверждённого заказа', mustEscalate: 'Меню не подтверждает каждый соус и перекрёстный контакт на кухне. Для аллергии уточните это у ресторана.', billTitle: 'Разделить счёт', billSub: 'Все суммы должны совпасть с исходным счётом в CNY.', scanReceipt: 'Сканировать чек', useReceipt: 'Использовать пример чека', equal: 'Поровну', byItem: 'По блюдам', participants: 'Участники', billItems: 'Позиции счёта', share: 'Поделиться', verified: 'Проверенная сумма', mismatch: 'Не удалось сопоставить итог. Проверьте выделенные позиции.', findTitle: 'Найдите подходящую еду', findSub: 'Начните с намерения, а не с рейтинга ресторана.', nearby: 'Рядом', whyFits: 'Почему подходит', profileTitle: 'Ваш пищевой паспорт', profileSub: 'Важные ограничения задаёте вы. Мы не выводим аллергию из истории.', language: 'Язык', crossContact: 'Избегать перекрёстного контакта', reset: 'Сбросить демо-данные', disclaimer: 'CanIEatThis помогает принять решение на основе меню и ввода пользователя. При серьёзной аллергии всегда уточняйте у ресторана.', matchLabel: 'Без конфликта', warningLabel: 'Нужно уточнить', conflictLabel: 'Конфликт', unknownLabel: 'Неизвестно',
  },
  es: {
    hello: 'Hola, viajero', subtitle: 'Entiende el plato, descubre si encaja contigo y pide con confianza.', scanMenu: 'Escanear menú', scanSub: 'Entiende cualquier menú chino.', foodPassport: 'Pasaporte de comida', anything: '¿Hay algo que no puedas comer?', splitBill: 'Dividir la cuenta', findFood: 'Buscar comida', recentSession: 'Sesión actual', menuReady: 'Menú listo para explorar', dishes: 'platos', openSession: 'Abrir sesión', home: 'Inicio', profile: 'Perfil', menu: 'Menú', scan: 'Escanear', passport: 'Pasaporte', next: 'Continuar', save: 'Guardar y escanear menú', selectLanguage: 'Elige tu idioma', languageSub: 'Controla la app y las explicaciones. Los mensajes para el personal permanecen en chino.', avoid: '¿Qué debemos vigilar?', passportSub: 'Solo lo usamos para señalar posibles conflictos. Puedes cambiarlo cuando quieras.', allergies: 'Alérgenos', diet: 'Restricciones', preferences: 'Preferencias', severe: 'Grave', moderate: 'Moderada', mild: 'Leve', noAllergens: 'Aún no has añadido alérgenos', scanTitle: 'Encuadra todo el menú', scanSubTitle: 'Mantén el móvil estable para que nombres e ingredientes se lean bien.', capture: 'Capturar menú', upload: 'Subir una foto', sampleMenu: 'Usar menú de ejemplo', avoidGlare: 'Evita reflejos', keepFlat: 'Mantén plano', everyPage: 'Cada página', analyzing: 'Leyendo tu menú…', analysisSub: 'Relacionando platos, precios y tu pasaporte', menuResults: 'Resultados del menú', checking: 'Comprobando el menú con tu pasaporte', all: 'Todo', forMe: 'Para mí', vegetarian: 'Vegetariano', notSpicy: 'Sin picante', viewDetails: 'Ver detalles', mainIngredients: 'Ingredientes principales', taste: 'Sabor', texture: 'Textura', cooking: 'Cocción', bestWith: 'Combina con', culturalNote: 'Nota cultural', illustrative: 'Solo ilustrativo · las fotos no determinan alérgenos', askRestaurant: 'Preguntar al restaurante', whySeeing: 'Por qué aparece esto', noConflict: 'Sin conflicto encontrado', possibleConflict: 'Confirma con el restaurante', confirmedConflict: 'No encaja con tu dieta', unable: 'No pudimos identificar este plato con fiabilidad', detailsUnknown: 'El menú no aporta pruebas suficientes para decidir los ingredientes.', detailsConflict: 'Contiene o puede contener un ingrediente que entra en conflicto con tu pasaporte.', detailsMatch: 'No hay conflicto en la información disponible. No es una garantía de seguridad.', askTitle: 'Muéstralo al restaurante', askWarning: 'Para una alergia grave', playChinese: 'Reproducir en chino', copyQuestion: 'Copiar pregunta', assistant: 'Asistente de mesa', helpOrder: 'Ayúdame a pedir', planTitle: 'Planifiquemos la mesa', planSub: 'Ya conozco el restaurante, el menú y tu pasaporte. Completa solo lo que falta para esta comida.', people: '¿Cuántas personas?', budget: 'Presupuesto total', temporary: 'Preferencias temporales', planMeal: 'Planificar comida', tablePlan: 'Plan de mesa', ruleChecked: 'Verificado por reglas. Todos los platos y precios existen en este menú.', total: 'Total', edit: 'Editar', regenerate: 'Regenerar', orderThese: 'Pedir esto', orderSaved: 'Pedido guardado para esta mesa', showWaiter: 'Mostrar al camarero', specialRequest: 'Solicitud especial · 给餐厅', waiterText: 'Por favor, preparen todos los platos vegetarianos y no añadan cilantro. Avísennos primero si no pueden confirmar algún ingrediente.', waiterSub: 'Mostramos primero el mensaje en chino para que el personal actúe rápido.', play: 'Reproducir chino', atTable: 'En la mesa', currentOrder: 'ahora en tu mesa', questions: ['¿Qué es esto?', '¿Cómo se come?', '¿Qué lleva la salsa?', '¿Pica mucho?'], askAbout: 'Preguntar por los platos de esta mesa', answerFrom: 'Respuesta basada en este menú y tu pedido confirmado', mustEscalate: 'El menú no confirma todas las salsas ni el contacto cruzado en cocina. Pregunta al restaurante si es importante para una alergia.', billTitle: 'Dividir la cuenta', billSub: 'Cada importe debe coincidir con el total original en CNY.', scanReceipt: 'Escanear recibo', useReceipt: 'Usar recibo de ejemplo', equal: 'A partes iguales', byItem: 'Por plato', participants: 'Participantes', billItems: 'Elementos de la cuenta', share: 'Compartir resultado', verified: 'Total verificado', mismatch: 'No pudimos cuadrar el total. Revisa los elementos destacados.', findTitle: 'Encuentra comida que encaje', findSub: 'Empieza por tu intención, no por la valoración.', nearby: 'Cerca de ti', whyFits: 'Por qué encaja', profileTitle: 'Tu pasaporte de comida', profileSub: 'Tú controlas las restricciones importantes. Nunca inferimos alergias del historial.', language: 'Idioma', crossContact: 'Evitar contacto cruzado', reset: 'Restablecer demo', disclaimer: 'CanIEatThis ayuda a decidir con la información del menú y tus datos. Para alergias graves, confirma siempre con el restaurante.', matchLabel: 'Sin conflicto', warningLabel: 'Necesita confirmación', conflictLabel: 'Conflicto', unknownLabel: 'Desconocido',
  },
  it: {
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
    welcomeEyebrow: 'YOUR DINING COMPANION IN CHINA', welcomeTitle: 'Discover Chinese food with confidence.', welcomeSubtitle: 'Understand the menu, find dishes that fit you, and order with confidence—wherever the meal takes you.', welcomeCta: 'Get started', welcomeFootnote: 'Clear answers for a better meal.', welcomeMenuNote: 'Menu, understood', welcomeFitNote: 'Know what fits you', languageEyebrow: 'Welcome to your dining companion', clarityNote: 'Built around clarity, not false certainty.', passportEyebrow: 'Food Passport', back: 'Back', assistantNote: 'I’ll help spot ingredients that may need a closer look.', safetyFlags: 'SAFETY FLAGS', selectAllToAvoid: 'Select all ingredients you need to avoid.', selected: (count) => `${count} selected`, addOne: 'Add one', otherAllergen: 'Other allergen', otherAllergenPlaceholder: 'e.g. mustard', selectedAllergens: 'About each selected allergen', setSeparately: 'Set them separately', personalSettings: 'Personal settings for this allergen', severityQuestion: 'How severe is this allergy?', severityHint: (label) => `Set the risk level for ${label}.`, crossContactHint: (label) => `Only for ${label}; shared oil, wok or utensils.`, profileBuilder: 'PROFILE BUILDER', dietaryProfile: 'Dietary profile', dietaryProfileHint: 'Answer a few broad questions instead of repeating every ingredient.', saved: (count) => `${count} saved`, howDoYouEat: 'How do you eat?', chooseEatingPattern: 'Choose one eating pattern.', faithRequirements: 'Any faith-based requirements?', faithHint: 'We’ll keep this separate from allergies.', faithOtherLabel: 'Tell us what to follow', faithOtherPlaceholder: 'e.g. Jain, Buddhist vegetarian', foodsToLeaveOut: 'Which foods should we leave out?', meatSeafoodHint: 'Select any meat or seafood you avoid.', otherDietRequirement: 'Other dietary requirement', otherDietHint: 'Add anything we should know.', otherRequirementLabel: 'Other requirement', otherRequirementPlaceholder: 'e.g. no alcohol, gluten-free, low sodium', everydayKicker: 'EVERYDAY PREFERENCES', everydayTitle: 'Everyday preferences', everydayHint: 'Fine-tune recommendations without turning every preference into a hard rule.', spiceQuestion: 'How much spice can you handle?', spiceHint: 'Set your tolerance—from cannot handle spice to any spice.', spiceCannot: 'Cannot handle spice', spiceLow: 'Low spice', spiceMedium: 'Medium spice', spiceAny: 'Any spice', otherPreferences: 'What else should we keep in mind?', preferenceHint: 'These help sort recommendations, not block every dish.', saveChanges: 'Save changes',
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

const stepLabel = (language: Language, step: number) => ({ en: `${step} of 3`, ko: `${step}단계 / 3`, ja: `${step} / 3`, ru: `${step} из 3`, es: `${step} de 3`, it: `${step} di 3` }[language])

type CopyKey = { [Key in keyof typeof copy.en]: (typeof copy.en)[Key] extends string ? Key : never }[keyof typeof copy.en]
const tFor = (language: Language, key: CopyKey): string => (copy[language][key] as string).replace(/CanIEatThis/g, 'Bitewise')

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

type OrderCopy = { nav: string; title: string; subtitle: string; current: string; past: string; inProgress: string; completed: string; openTable: string; items: string; total: string; splitBill: string; viewMenu: string; emptyCurrent: string; emptyPast: string }
const orderCopy: Record<Language, OrderCopy> = {
  en: { nav: 'Orders', title: 'Your orders', subtitle: 'Keep track of current and past restaurant orders.', current: 'Current order', past: 'Past orders', inProgress: 'In progress', completed: 'Completed', openTable: 'Table is open', items: 'items', total: 'Total', splitBill: 'Split the bill', viewMenu: 'View menu', emptyCurrent: 'No order yet. Scan the menu to start this dining session.', emptyPast: 'Past orders will appear here.' },
  ko: { nav: '주문', title: '주문 내역', subtitle: '현재 주문과 지난 식당 주문을 한곳에서 확인하세요.', current: '현재 주문', past: '지난 주문', inProgress: '진행 중', completed: '완료됨', openTable: '테이블이 열려 있어요', items: '개 메뉴', total: '합계', splitBill: '계산서 나누기', viewMenu: '메뉴 보기', emptyCurrent: '아직 주문이 없습니다. 메뉴를 스캔해 식사를 시작하세요.', emptyPast: '지난 주문이 여기에 표시됩니다.' },
  ja: { nav: '注文', title: '注文履歴', subtitle: '現在と過去のレストラン注文を確認できます。', current: '現在の注文', past: '過去の注文', inProgress: '進行中', completed: '完了', openTable: 'テーブルは開いています', items: '品', total: '合計', splitBill: '割り勘する', viewMenu: 'メニューを見る', emptyCurrent: 'まだ注文はありません。メニューをスキャンして食事を始めましょう。', emptyPast: '過去の注文はここに表示されます。' },
  ru: { nav: 'Заказы', title: 'Ваши заказы', subtitle: 'Следите за текущими и прошлыми заказами в ресторанах.', current: 'Текущий заказ', past: 'Прошлые заказы', inProgress: 'В процессе', completed: 'Завершён', openTable: 'Стол открыт', items: 'позиций', total: 'Итого', splitBill: 'Разделить счёт', viewMenu: 'Открыть меню', emptyCurrent: 'Заказов пока нет. Отсканируйте меню, чтобы начать.', emptyPast: 'Прошлые заказы появятся здесь.' },
  es: { nav: 'Pedidos', title: 'Tus pedidos', subtitle: 'Consulta tus pedidos actuales y anteriores.', current: 'Pedido actual', past: 'Pedidos anteriores', inProgress: 'En curso', completed: 'Completado', openTable: 'La mesa está abierta', items: 'platos', total: 'Total', splitBill: 'Dividir la cuenta', viewMenu: 'Ver menú', emptyCurrent: 'Aún no hay pedidos. Escanea el menú para empezar.', emptyPast: 'Tus pedidos anteriores aparecerán aquí.' },
  it: { nav: 'Ordini', title: 'I tuoi ordini', subtitle: 'Tieni sotto controllo gli ordini attuali e passati.', current: 'Ordine attuale', past: 'Ordini passati', inProgress: 'In corso', completed: 'Completato', openTable: 'Il tavolo è aperto', items: 'piatti', total: 'Totale', splitBill: 'Dividi il conto', viewMenu: 'Vedi menu', emptyCurrent: 'Non ci sono ancora ordini. Scansiona il menu per iniziare.', emptyPast: 'Gli ordini passati appariranno qui.' },
}

const dishes: Dish[] = [
  { id: 'kung-pao', name: 'Kung Pao Chicken', zh: '宫保鸡丁', localized: { en: 'Kung Pao Chicken', ko: '궁보계정', ja: '宮保鶏丁', ru: 'Курица гунбао', es: 'Pollo kung pao', it: 'Pollo kung pao' }, price: 38, imageSrc: '/dish-photos/kung-pao.png', className: 'visual-kungpao', ingredients: ['Chicken', 'Peanuts', 'Dried chilies', 'Scallions'], zhIngredients: ['鸡肉', '花生', '干辣椒', '葱'], allergens: ['peanut'], possibleAllergens: ['soy'], tags: ['Chicken', 'Peanut', 'Dried chili'], spicy: 2, vegetarian: false, vegan: false, hasPork: false, hasPoultry: true, hasCilantro: false, confidence: 0.98, taste: 'Sweet, savory, tangy and mildly numbing', texture: 'Tender chicken with crunchy peanuts', cooking: 'Quickly stir-fried over high heat', bestWith: 'Shared with rice and other dishes', culture: 'Kung Pao Chicken is a Sichuan stir-fry named after a historical official. Peanuts are normally part of the dish, not just a garnish.', reason: 'Peanuts are common in this dish, but this menu does not provide a complete ingredient list.' },
  { id: 'mapo-tofu', name: 'Mapo Tofu', zh: '麻婆豆腐', localized: { en: 'Mapo Tofu', ko: '마파두부', ja: '麻婆豆腐', ru: 'Мапо тофу', es: 'Tofu mapo', it: 'Tofu mapo' }, price: 28, imageSrc: '/dish-photos/mapo-tofu.png', className: 'visual-mapo', ingredients: ['Tofu', 'Chili bean paste', 'Minced pork', 'Sichuan pepper'], zhIngredients: ['豆腐', '豆瓣酱', '猪肉末', '花椒'], allergens: ['soy'], possibleAllergens: ['sesame'], tags: ['Tofu', 'Chili bean paste', 'Minced pork'], spicy: 3, vegetarian: false, vegan: false, hasPork: true, hasCilantro: false, confidence: 0.91, taste: 'Spicy, savory and numbing', texture: 'Soft tofu with aromatic sauce', cooking: 'Simmered in a chili-bean sauce', bestWith: 'Steamed rice and greens', culture: '“Mapo” refers to the pockmarked grandmother credited with creating this beloved Sichuan dish.', reason: 'The base recipe commonly includes minced pork and the menu does not mark this version vegetarian.' },
  { id: 'eggplant', name: 'Fish-fragrant Eggplant', zh: '鱼香茄子', localized: { en: 'Fish-fragrant Eggplant', ko: '어향 가지', ja: '魚香茄子', ru: 'Баклажаны в стиле юйсян', es: 'Berenjena yuxiang', it: 'Melanzane yuxiang' }, price: 42, imageSrc: '/dish-photos/eggplant.png', className: 'visual-eggplant', ingredients: ['Eggplant', 'Garlic', 'Pickled chili', 'Vinegar'], zhIngredients: ['茄子', '蒜', '泡椒', '醋'], allergens: [], possibleAllergens: ['soy'], tags: ['Vegetarian', 'Garlic', 'Sichuan'], spicy: 1, vegetarian: true, vegan: true, hasPork: false, hasCilantro: false, confidence: 0.95, taste: 'Sweet-sour, garlicky and gently spicy', texture: 'Silky eggplant with a glossy sauce', cooking: 'Braised until tender', bestWith: 'Rice and a crisp green dish', culture: '“Fish-fragrant” describes a Sichuan seasoning style; it does not necessarily mean the dish contains fish.', reason: 'This menu labels the version vegetarian, but sauce and kitchen cross-contact still need confirmation for allergies.' },
  { id: 'greens', name: 'Garlic Seasonal Greens', zh: '蒜蓉时蔬', localized: { en: 'Garlic Seasonal Greens', ko: '마늘 제철 채소', ja: '季節野菜のにんにく炒め', ru: 'Сезонные овощи с чесноком', es: 'Verduras de temporada al ajo', it: 'Verdure stagionali all’aglio' }, price: 28, imageSrc: '/dish-photos/seasonal-greens.png', className: 'visual-greens', ingredients: ['Seasonal greens', 'Garlic', 'Cooking oil'], zhIngredients: ['时蔬', '蒜', '食用油'], allergens: [], possibleAllergens: [], tags: ['Vegetarian', 'Fresh', 'Mild'], spicy: 0, vegetarian: true, vegan: true, hasPork: false, hasCilantro: false, confidence: 0.86, taste: 'Fresh, mild and garlicky', texture: 'Crisp-tender leaves', cooking: 'Flash-fried in a hot wok', bestWith: 'Balances spicy shared dishes', culture: 'A common Chinese table vegetable; the exact greens change with the season.', reason: 'No listed conflict, but the cooking oil and shared wok are not confirmed by this menu.' },
  { id: 'lotus', name: 'Sweet-sour Lotus Root', zh: '糖醋藕片', localized: { en: 'Sweet-sour Lotus Root', ko: '탕수 연근', ja: '甘酢れんこん', ru: 'Корень лотоса в кисло-сладком соусе', es: 'Raíz de loto agridulce', it: 'Radice di loto agrodolce' }, price: 34, imageSrc: '/dish-photos/lotus-root.png', className: 'visual-lotus', ingredients: ['Lotus root', 'Rice vinegar', 'Sugar', 'Sesame'], zhIngredients: ['莲藕', '米醋', '糖', '芝麻'], allergens: ['sesame'], possibleAllergens: ['wheat'], tags: ['Vegetarian', 'Crisp', 'Sweet-sour'], spicy: 0, vegetarian: true, vegan: true, hasPork: false, hasCilantro: false, confidence: 0.78, taste: 'Bright sweet-sour crunch', texture: 'Crisp and juicy', cooking: 'Quickly stir-fried with vinegar glaze', bestWith: 'A rich or spicy table', culture: 'Lotus root is loved for its connected slices, often associated with togetherness at the table.', reason: 'Sesame is listed; other sauce ingredients are not fully specified.' },
  { id: 'soup', name: 'Winter Melon Mushroom Soup', zh: '冬瓜菌菇汤', localized: { en: 'Winter Melon Mushroom Soup', ko: '동과 버섯 수프', ja: '冬瓜ときのこのスープ', ru: 'Суп из зимней дыни и грибов', es: 'Sopa de melón de invierno y setas', it: 'Zuppa di zucca invernale e funghi' }, price: 36, imageSrc: '/dish-photos/winter-melon-soup.png', className: 'visual-soup', ingredients: ['Winter melon', 'Mushrooms', 'Ginger', 'Stock'], zhIngredients: ['冬瓜', '菌菇', '姜', '高汤'], allergens: [], possibleAllergens: ['shellfish', 'soy'], tags: ['Vegetarian option', 'Warm', 'Mild'], spicy: 0, vegetarian: true, vegan: false, hasPork: false, hasCilantro: false, confidence: 0.59, taste: 'Light, savory and warming', texture: 'Soft melon with tender mushrooms', cooking: 'Slow-simmered broth', bestWith: 'Shared across the table', culture: 'A gentle soup often used to balance bolder dishes.', reason: 'The stock base is not specified, so the dish stays explicitly uncertain.' },
]

const emptyLocalized: Record<Language, string> = { en: '', ko: '', ja: '', ru: '', es: '', it: '' }
const mapBackendDish = (raw: BackendDish): Dish => {
  const local = dishes.find((dish) => dish.name.toLowerCase() === raw.name.toLowerCase() || dish.zh === raw.zh)
  const localized = { ...emptyLocalized, ...(local?.localized || {}), ...(raw.localized || {}), en: raw.localized?.en || raw.name }
  Object.keys(localized).forEach((key) => { if (!localized[key as Language]) localized[key as Language] = raw.name })
  return {
    ...(local || {
      imageSrc: '/bitewise-icon-192.png', className: 'visual-greens', taste: 'Not provided by the menu', texture: 'Not provided by the menu', cooking: 'Not provided by the menu', bestWith: 'Ask the restaurant', culture: 'No cultural context was returned.', reason: 'This dish was extracted from the uploaded menu and still needs restaurant confirmation.',
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
    confidence: raw.confidence,
  }
}
const serializeDish = (dish: Dish): BackendDish => ({ id: dish.id, name: dish.name, zh: dish.zh, price: dish.price, ingredients: dish.ingredients, allergens: dish.allergens, possibleAllergens: dish.possibleAllergens || [], confidence: dish.confidence, spicy: dish.spicy, vegetarian: dish.vegetarian, vegan: dish.vegan, tags: dish.tags, hasPork: dish.hasPork, hasBeef: dish.hasBeef, hasPoultry: dish.hasPoultry, hasSeafood: dish.hasSeafood, hasOffal: dish.hasOffal, hasCilantro: dish.hasCilantro, localized: dish.localized })

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
  { id: 'sichuan-table-past', restaurant: 'Sichuan Table', initials: 'ST', location: 'Shanghai · Jing’an', time: 'Sep 21 · 7:15 PM', status: 'completed', itemCount: 4, total: 128, preview: 'Eggplant · Lotus root · Seasonal greens · Soup', tone: 'order-tone-green', billItems: sichuanOrderBillItems, receiptItems: sichuanReceiptItems },
  { id: 'green-bamboo-past', restaurant: 'Green Bamboo House', initials: 'GB', location: 'Shanghai · French Concession', time: 'Sep 18 · 12:40 PM', status: 'completed', itemCount: 3, total: 84, preview: 'Mushroom soup · Seasonal greens · Lotus root', tone: 'order-tone-gold', billItems: bambooOrderBillItems, receiptItems: bambooReceiptItems },
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
  { id: 'less-oil', label: 'Less oil', icon: '💧' }, { id: 'less-salt', label: 'Less salt', icon: '🧂' }, { id: 'less-sugar', label: 'Less sugar', icon: '🍬' }, { id: 'no-cilantro', label: 'No cilantro', icon: '🌿' }, { id: 'no-scallion', label: 'No scallion', icon: '🧅' }, { id: 'no-garlic', label: 'No garlic', icon: '🧄' }, { id: 'no-raw', label: 'No raw food', icon: '🍣' }, { id: 'well-cooked', label: 'Well-cooked', icon: '🔥' }, { id: 'boneless', label: 'Prefer boneless', icon: '🍗' },
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
const initialPassport: Passport = { allergies: [], otherAllergen: '', allergyProfiles: {}, diets: [], dietStyle: 'none', faithDiet: 'none', faithOther: '', avoidFoods: [], otherDietary: '', preferences: [], spiceLevel: null, severity: 'severe', crossContact: true }
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
  return { ...initialPassport, ...saved, diets: legacyDiets, dietStyle: legacyDietStyle, faithDiet: saved.faithDiet || 'none', faithOther: saved.faithOther || '', avoidFoods: legacyAvoidFoods, otherDietary: saved.otherDietary || '', spiceLevel: legacySpiceLevel, allergyProfiles: { ...migratedProfiles, ...(saved.allergyProfiles || {}) } } as Passport
}
const normalizeStoredProfile = (profile?: Partial<UserProfile> | null): UserProfile | null => profile?.username && profile.email ? { username: String(profile.username), email: String(profile.email) } : null
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
  { id: 'old-town-kitchen', name: 'Old Town Kitchen', initials: 'OT', emoji: '🏮', cuisine: 'Local specialties · Vegetarian options', location: 'Shanghai · 1.2 km', why: 'Clear dishes and mild options', tone: 'photo-one' },
  { id: 'green-bamboo-house', name: 'Green Bamboo House', initials: 'GB', emoji: '🍵', cuisine: 'Tea house · Rice dishes · Quiet', location: 'Shanghai · 1.8 km', why: 'Lighter flavors for your passport', tone: 'photo-two' },
  { id: 'lotus-table', name: 'Lotus Table', initials: 'LT', emoji: '🥢', cuisine: 'Seasonal Chinese · Small plates', location: 'Shanghai · 2.4 km', why: 'Vegetarian dishes are clearly marked', tone: 'photo-three' },
]
const initialSavedRestaurants = restaurantCatalog.slice(0, 2)

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
    plus: <><path d="M12 5v14M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    check: <path d="m5 12 4.5 4.5L19 7"/>,
    crossContact: <><circle cx="7.5" cy="7.5" r="4"/><circle cx="16.5" cy="16.5" r="4"/><path d="m10.5 10.5 3 3"/><path d="m10.8 13.5 2.8-.2-.2-2.8"/></>,
    alert: <><path d="M12 3 2.7 19a1 1 0 0 0 .9 1.5h16.8a1 1 0 0 0 .9-1.5L12 3Z"/><path d="M12 8v5M12 16.5v.1"/></>,
    shield: <><path d="M12 3 19 6v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    upload: <><path d="M12 16V4M8 8l4-4 4 4M5 14v5h14v-5"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z"/><circle cx="12" cy="13" r="3.5"/></>,
    flash: <path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>,
    bookmark: <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-3.5L6 22V4Z"/>,
    volume: <><path d="M4 10v4h3l4 3V7L7 10H4Z"/><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10"/></>,
    copy: <><rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3"/></>,
    share: <><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.5-4.5M8 13l7.5 4.5"/></>,
    edit: <><path d="m4 20 4.2-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/><path d="m13.5 7.5 3 3"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.6-4L3 10M3 5v5h5M4 13a8 8 0 0 0 14.6 4L21 14m0 5v-5h-5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c.4-3.3 2.4-5 6-5s5.6 1.7 6 5M16 5.5a3 3 0 0 1 0 5.8M18 15c2.2.7 3.4 2.3 3.7 5"/></>,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6a2 2 0 0 1-2-2V6.5Z"/><path d="M4 7h16M16 13h4"/><circle cx="16" cy="13" r=".4" fill="currentColor"/></>,
    cart: <><path d="M4 5h2l1.5 10.2a2 2 0 0 0 2 1.8h7.8a2 2 0 0 0 1.9-1.4L21 9H7"/><circle cx="10" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/></>,
    dots: <><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></>,
    heart: <path d="M20.8 8.8c0 5.4-8.8 10.3-8.8 10.3S3.2 14.2 3.2 8.8A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.6Z"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    leaf: <><path d="M20 4C10 4 5 8 5 14c0 3.3 2.3 6 5.5 6C17 20 20 12 20 4Z"/><path d="M4 21c2-4 5.3-6.7 10-8.5"/></>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>
}

function LogoMark({ small = false }: { small?: boolean }) { return <img className={`brand-mark-image ${small ? 'brand-mark-small' : ''}`} src="/bitewise-icon-192.png" alt="" /> }

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
  const [capturedFiles, setCapturedFiles] = useState<File[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [sessionMenu, setSessionMenu] = useState<Dish[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cit:session-menu') || '') as Dish[]
      return Array.isArray(saved) ? saved : []
    } catch { return [] }
  })
  const [sessionRestaurant, setSessionRestaurant] = useState(() => localStorage.getItem('cit:session-restaurant') || '')
  const [sessionRisks, setSessionRisks] = useState<Record<string, BackendRisk>>({})
  const [analysisPassportKey, setAnalysisPassportKey] = useState('')
  const [sessionOrders, setSessionOrders] = useState<DiningOrder[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cit:session-orders') || '') as DiningOrder[]
      return Array.isArray(saved) ? saved : []
    } catch { return [] }
  })
  const [selectedSessionOrder, setSelectedSessionOrder] = useState<DiningOrder | null>(null)
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
  const [assistantAnswer, setAssistantAnswer] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const billInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const t = (key: CopyKey) => tFor(language, key)
  const currentCompanions = account ? companionViewsFor(account.email, accounts, companionInvites) : []
  const incomingCompanionInvites = account ? companionInvites.filter((invite) => invite.status === 'pending' && normalizeEmail(invite.toEmail) === normalizeEmail(account.email) && accounts.some((record) => normalizeEmail(record.profile.email) === normalizeEmail(invite.fromEmail))) : []
  const outgoingCompanionInvites = account ? companionInvites.filter((invite) => invite.status === 'pending' && normalizeEmail(invite.fromEmail) === normalizeEmail(account.email) && accounts.some((record) => normalizeEmail(record.profile.email) === normalizeEmail(invite.toEmail))) : []
  const selectedCompanion = selectedCompanionEmail ? currentCompanions.find((companion) => companion.email === selectedCompanionEmail) || null : null

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
    if (key === 'otherDietary') return { ...current, otherDietary: value as string }
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
    setLanguage('en')
    setOnboardingStep(2)
    track('profile_created')
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
      setCapturedFiles([])
    }
    setScreen(next)
    track(`${next}_open`)
  }
  const toggleSavedRestaurant = (restaurant: SavedRestaurant) => {
    setSavedRestaurants((current) => current.some((item) => item.id === restaurant.id) ? current.filter((item) => item.id !== restaurant.id) : [...current, restaurant])
    setToast(savedRestaurants.some((item) => item.id === restaurant.id) ? 'Restaurant removed from saved' : 'Restaurant saved to your profile')
    track('restaurant_save_toggled')
  }
  const addCompanion = (email: string): CompanionAddResult => {
    const normalizedEmail = normalizeEmail(email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { ok: false, message: 'Enter a valid email address.' }
    if (!account) return { ok: false, message: 'Log in before inviting a companion.' }
    if (normalizeEmail(account.email) === normalizedEmail) return { ok: false, message: 'You cannot invite yourself.' }
    const target = accounts.find((record) => normalizeEmail(record.profile.email) === normalizedEmail)
    if (!target) return { ok: false, message: 'No registered user uses this email yet.' }
    if (currentCompanions.some((companion) => companion.email === normalizedEmail)) return { ok: false, message: 'This companion is already connected.' }
    if (companionInvites.some((invite) => invite.status === 'pending' && ((normalizeEmail(invite.fromEmail) === normalizeEmail(account.email) && normalizeEmail(invite.toEmail) === normalizedEmail) || (normalizeEmail(invite.fromEmail) === normalizedEmail && normalizeEmail(invite.toEmail) === normalizeEmail(account.email))))) return { ok: false, message: 'An invitation is already waiting for this user.' }
    const invite: CompanionInvite = { id: `invite-${Date.now()}-${normalizedEmail}`, fromEmail: normalizeEmail(account.email), toEmail: normalizedEmail, status: 'pending', createdAt: Date.now() }
    setCompanionInvites((current) => [...current, invite])
    setToast(`Invitation sent to ${target.profile.username}`)
    track('companion_invited')
    return { ok: true, message: `Invitation sent to ${target.profile.username}. They can accept it from their Profile.` }
  }
  const updateInviteStatus = (inviteId: string, status: CompanionInvite['status']) => {
    setCompanionInvites((current) => current.map((invite) => invite.id === inviteId ? { ...invite, status } : invite))
    if (status === 'accepted') setToast('Companion connected')
    if (status === 'declined') setToast('Invitation declined')
    if (status === 'revoked') setToast('Companion unlinked')
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
    setToast('Receipt values applied')
    track('bill_scan_success')
    event.target.value = ''
  }
  const openCamera = () => {
    if (!sessionRestaurant.trim()) {
      setToast('Enter the restaurant name before scanning')
      return
    }
    setScreen('camera')
    track('camera_open')
  }
  const addCapturedPage = (file: File) => {
    setCapturedFiles((current) => [...current, file])
    setCapturedPages((current) => {
      const nextNumber = current.length ? Math.max(...current.map((page) => Number(page.title.replace(/\D/g, '')) || 0)) + 1 : 1
      return [...current, { id: Date.now(), title: `Page ${String(nextNumber).padStart(2, '0')}`, variant: current.length % 3 }]
    })
    track('camera_page_captured')
  }
  const undoCapturedPage = () => {
    setCapturedFiles((current) => current.slice(0, -1))
    setCapturedPages((current) => current.slice(0, -1))
    track('camera_page_undone')
  }
  const removeCapturedPage = (id: number) => {
    setCapturedPages((current) => {
      const index = current.findIndex((page) => page.id === id)
      if (index >= 0) setCapturedFiles((files) => files.filter((_file, fileIndex) => fileIndex !== index))
      return current.filter((page) => page.id !== id)
    })
  }
  const passportKey = JSON.stringify(passport)
  const finishMenuScan = () => {
    const name = sessionRestaurant.trim()
    if (!name) {
      setToast('Enter the restaurant name before scanning')
      openScreen('scan')
      return
    }
    const firstCapturedFile = capturedFiles[0]
    if (!firstCapturedFile) {
      setToast('Capture a menu page before finishing')
      return
    }
    void startScan(firstCapturedFile)
  }
  const startScan = async (file?: File) => {
    if (!sessionRestaurant.trim()) {
      setToast('Enter the restaurant name before scanning')
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
      const nextDishes = result.dishes.map(mapBackendDish)
      setSessionRestaurant(result.restaurantName || sessionRestaurant.trim())
      setSessionMenu(nextDishes)
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
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void startScan(file)
  }
  const handleCameraFile = (file: File) => { setScreen('scan'); void startScan(file) }
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
    if ((profile.faithDiet === 'halal' || profile.faithDiet === 'kosher') && dish.hasPork) return 'CONFLICT'
    if (profile.faithDiet === 'kosher' && dish.hasSeafood) return 'CONFLICT'
    if (dish.confidence < 0.7) return 'UNKNOWN'
    if (hasSevereAllergy && dish.possibleAllergens?.some((allergen) => profile.allergies.some((selected) => allergenMatchKeys(selected).includes(allergen)))) return 'WARNING'
    if (avoidsCrossContact && (dish.possibleAllergens?.length || dish.confidence < 0.9)) return 'WARNING'
    if (profile.preferences.includes('no-cilantro') && dish.hasCilantro) return 'WARNING'
    if (profile.spiceLevel !== null && dish.spicy > profile.spiceLevel) return 'WARNING'
    return 'MATCH'
  }
  const getStatus = (dish: Dish): Status => analysisPassportKey === passportKey ? sessionRisks[dish.id]?.status || getStatusForPassport(dish, passport) : getStatusForPassport(dish, passport)
  const getDiningStatus = (dish: Dish): Status => {
    const selectedPassports = currentCompanions.filter((companion) => activeCompanionIds.includes(companion.id)).map((companion) => companion.passport)
    const statuses = [getStatus(dish), ...selectedPassports.map((profile) => getStatusForPassport(dish, profile))]
    if (statuses.includes('CONFLICT')) return 'CONFLICT'
    if (statuses.includes('WARNING')) return 'WARNING'
    if (statuses.includes('UNKNOWN')) return 'UNKNOWN'
    return 'MATCH'
  }
  const statusInfo = (status: Status) => ({
    MATCH: { label: t('matchLabel'), detail: t('detailsMatch'), color: 'match', icon: 'check' },
    WARNING: { label: t('warningLabel'), detail: t('detailsUnknown'), color: 'warning', icon: 'alert' },
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
  const copyQuestion = async () => { await navigator.clipboard?.writeText(questionFor(selectedDish)); setToast('Question copied'); track('ask_restaurant_clicked') }
  const speak = (text: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); track('question_voice_play') } }
  const addToCart = (dish: Dish) => {
    if (getDiningStatus(dish) === 'CONFLICT') {
      setToast('This dish conflicts with your Food Passport')
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.dish.id === dish.id)
      return existing
        ? current.map((item) => item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { dish, quantity: 1 }]
    })
    setSelectedSessionOrder(null)
    setToast(`${dish.localized[language]} added to cart`)
    track('dish_added_to_cart')
  }
  const updateCartQuantity = (dishId: string, quantity: number) => setCart((current) => quantity <= 0
    ? current.filter((item) => item.dish.id !== dishId)
    : current.map((item) => item.dish.id === dishId ? { ...item, quantity } : item))
  const removeFromCart = (dishId: string) => setCart((current) => current.filter((item) => item.dish.id !== dishId))
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  const openSavedOrder = (order: DiningOrder) => {
    setSelectedSessionOrder(order)
    setCart(order.cartSnapshot || [])
    setSessionMenu(order.menuSnapshot?.length ? order.menuSnapshot : dishes)
    openScreen('order')
    track('saved_order_open')
  }
  const completeCartOrder = () => {
    const savedAt = Date.now()
    const savedRestaurantName = sessionRestaurant.trim() || 'Chengdu Garden'
    const orderItems = cart.map(({ dish, quantity }) => ({ id: `session-${savedAt}-${dish.id}`, label: dish.name, zh: dish.zh, amount: dish.price * quantity, dish }))
    const completedOrder: DiningOrder = {
      id: `session-${savedAt}`,
      restaurant: savedRestaurantName,
      initials: initialsForRestaurant(savedRestaurantName),
      location: 'Shanghai · 1.2 km',
      time: 'Just now',
      status: 'current',
      itemCount: cartItemCount,
      total: cartTotal,
      preview: cart.map(({ dish, quantity }) => `${dish.name} ×${quantity}`).join(' · '),
      tone: 'order-tone-red',
      billItems: orderItems,
      receiptItems: orderItems,
      menuSnapshot: sessionMenu,
      cartSnapshot: cart,
      passportSnapshot: passport,
      companionNames: currentCompanions.filter((companion) => activeCompanionIds.includes(companion.id)).map((companion) => companion.name),
      savedAt,
    }
    setSessionOrders((current) => [{ ...completedOrder }, ...current.map((order) => ({ ...order, status: 'completed' as const }))])
    setSessionMenu(sessionMenu)
    setSelectedSessionOrder(completedOrder)
    setCart([])
    setToast('Order saved to this dining session')
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
      <header className="topbar"><button className="brand" onClick={() => openScreen('home')} aria-label="Bitewise 食见 home"><LogoMark small /><span className="brand-lockup"><strong>BITEWISE</strong><small>食见</small></span></button></header>
      <main className="main-content">
        {screen === 'home' && <Home t={t} passport={passport} dishes={sessionMenu} sessionRestaurant={sessionRestaurant} currentOrder={currentSessionOrder} getStatus={getStatus} openScreen={openScreen} openBill={() => { if (currentSessionOrder) openBill(currentSessionOrder, 'home') }} onOpenOrder={openSavedOrder} setSelectedDish={setSelectedDish} setAskSheet={setAskSheet} cart={cart} />}
        {screen === 'scan' && <Scan t={t} restaurantName={sessionRestaurant} setRestaurantName={setSessionRestaurant} scanImage={scanImage} scanning={scanning} scanError={scanError} fileInputRef={fileInputRef} handleFile={handleFile} startScan={startScan} onRetry={() => { if (lastScanFile) void startScan(lastScanFile) }} onOpenCamera={openCamera} onBack={() => openScreen('home')} />}
        {screen === 'camera' && <CameraCapture t={t} pages={capturedPages} onCapture={addCapturedPage} onFallbackFile={handleCameraFile} onUndo={undoCapturedPage} onDelete={removeCapturedPage} onDone={finishMenuScan} onBack={() => openScreen('scan')} />}
        {screen === 'menu' && <MenuResults t={t} language={language} dishes={sessionMenu} allDishes={sessionMenu} getStatus={getDiningStatus} cart={cart} onAddToCart={addToCart} onOpenCart={() => openScreen('cart')} onBack={() => openScreen('home')} onDetail={(dish) => { setSelectedDish(dish); openScreen('detail'); track('dish_view') }} />}
        {screen === 'detail' && <DishDetail t={t} language={language} dish={selectedDish} passport={passport} status={getStatus(selectedDish)} onBack={() => openScreen('menu')} onAsk={() => { setAskSheet(true); track('ask_restaurant_clicked') }} onAddToCart={() => addToCart(selectedDish)} />}
        {screen === 'cart' && <Cart t={t} language={language} cart={cart} itemCount={cartItemCount} total={cartTotal} getStatus={getDiningStatus} onBack={() => openScreen('menu')} onIncrease={(dishId) => updateCartQuantity(dishId, (cart.find((item) => item.dish.id === dishId)?.quantity || 0) + 1)} onDecrease={(dishId) => updateCartQuantity(dishId, (cart.find((item) => item.dish.id === dishId)?.quantity || 0) - 1)} onRemove={removeFromCart} onClear={() => setCart([])} onConfirm={() => { setSelectedSessionOrder(null); track('cart_confirmed'); openScreen('order') }} />}
        {screen === 'order' && <OrderPage language={language} passport={selectedSessionOrder?.passportSnapshot || passport} cart={selectedSessionOrder?.cartSnapshot || cart} savedOrder={selectedSessionOrder} onBack={() => openScreen('cart')} onComplete={completeCartOrder} onViewMenu={() => { setSessionMenu(selectedSessionOrder?.menuSnapshot?.length ? selectedSessionOrder.menuSnapshot : sessionMenu); openScreen('menu') }} onHome={() => openScreen('home')} />}
        {screen === 'bill' && activeBillOrder && <Bill t={t} billInputRef={billInputRef} handleFile={handleBillFile} billMode={billMode} setBillMode={setBillMode} participants={participants} setParticipants={setParticipants} splitItems={splitItems} setSplitItems={setSplitItems} billItems={billItems} billTotal={billTotal} equalAmount={equalAmount} itemTotals={itemTotals} order={activeBillOrder} billSource={billSource} billReceiptName={billReceiptName} setBillSource={(source) => { setBillSource(source); if (source === 'order') setBillReceiptName('') }} onBack={() => openScreen(billReturnScreen)} onToast={setToast} />}
        {screen === 'find' && <FindFood t={t} restaurants={restaurantCatalog} savedRestaurants={savedRestaurants} onToggleRestaurant={toggleSavedRestaurant} onBack={() => openScreen('home')} onScan={() => openScreen('scan')} />}
        {screen === 'orders' && <Orders language={language} currentOrder={currentSessionOrder} pastOrders={pastSessionOrders} onOpenOrder={openSavedOrder} onSplitBill={(order) => openBill(order, 'orders')} />}
        {screen === 'profile' && account && <Profile t={t} language={language} user={account} passport={passport} restaurants={savedRestaurants} companions={currentCompanions} pendingInviteCount={incomingCompanionInvites.length} onOpenSavedRestaurants={() => openScreen('savedRestaurants')} onOpenCompanions={() => openCompanions('profile')} onOpenPassport={() => openScreen('passport')} onLanguageChange={setLanguage} onLogout={logOut} onReset={resetDemo} />}
        {screen === 'passport' && <PassportPage language={language} t={t} passport={passport} updatePassport={updatePassport} onBack={() => openScreen('profile')} />}
        {screen === 'savedRestaurants' && <SavedRestaurantsPage restaurants={savedRestaurants} onToggleRestaurant={toggleSavedRestaurant} onOpenFind={() => openScreen('find')} onBack={() => openScreen('profile')} />}
        {screen === 'companions' && account && <CompanionsPage account={account} accounts={accounts} companions={currentCompanions} incomingInvites={incomingCompanionInvites} outgoingInvites={outgoingCompanionInvites} onAddCompanion={addCompanion} onAcceptInvite={(inviteId) => updateInviteStatus(inviteId, 'accepted')} onDeclineInvite={(inviteId) => updateInviteStatus(inviteId, 'declined')} onRemoveCompanion={removeCompanion} onOpenCompanion={(email) => { setSelectedCompanionEmail(email); openScreen('companionDetail') }} onBack={() => openScreen(companionReturnScreen)} />}
        {screen === 'companionDetail' && selectedCompanion && <CompanionDetailPage companion={selectedCompanion} onUnlink={() => { removeCompanion(selectedCompanion.inviteId); openScreen('companions') }} onBack={() => openScreen('companions')} />}
      </main>
      {(['home', 'find', 'orders', 'profile'].includes(screen)) && <BottomNav language={language} screen={screen} openScreen={openScreen} t={t} />}
    </div>
    {askSheet && <AskSheet t={t} language={language} dish={selectedDish} question={questionFor(selectedDish)} loading={assistantLoading} onClose={() => setAskSheet(false)} onCopy={copyQuestion} onSpeak={() => speak(questionFor(selectedDish))} />}
    {toast && <div className="toast"><Icon name="check" size={16} /> {toast}</div>}
  </div>
}

function Onboarding({ language, setLanguage, step, setStep, passport, updatePassport, finish, onRegister, existingEmails, t }: { language: Language; setLanguage: (language: Language) => void; step: number; setStep: (step: number) => void; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void; finish: () => void; onRegister: (profile: UserProfile) => void; existingEmails: string[]; t: (key: CopyKey) => string }) {
  const text = onboardingCopy[language]
  return <div className="onboarding-root"><div className={`onboarding-frame ${step === 0 ? 'onboarding-frame-welcome' : ''}`}><div className="onboarding-progress"><LogoMark /><div className="onboarding-brand"><strong>BITEWISE</strong><small>食见</small></div>{step > 0 && <span className="onboarding-step">{stepLabel(language, step)}</span>}</div>{step === 0 ? <WelcomePage onContinue={() => setStep(1)} /> : step === 1 ? <RegisterPage language={language} existingEmails={existingEmails} onBack={() => setStep(0)} onContinue={onRegister} /> : step === 2 ? <section className="onboarding-card"><div className="eyebrow"><span className="orange-dot" /> {text.languageEyebrow}</div><h1>{t('selectLanguage')}</h1><p className="lead">{t('languageSub')}</p><div className="language-grid">{languages.map((item) => <button key={item.code} className={`language-card ${language === item.code ? 'selected' : ''}`} onClick={() => setLanguage(item.code)}><span>{item.label}</span><small>{item.native}</small>{language === item.code && <span className="selected-check"><Icon name="check" size={14} /></span>}</button>)}</div><Button className="full-button" onClick={() => setStep(3)} icon="arrow">{t('next')}</Button><p className="safe-note"><Icon name="shield" size={16} /> {text.clarityNote}</p></section> : <PassportEditor language={language} t={t} passport={passport} updatePassport={updatePassport} onBack={() => setStep(2)} onFinish={finish} />}</div></div>
}

function RegisterPage({ language, existingEmails, onBack, onContinue }: { language: Language; existingEmails: string[]; onBack: () => void; onContinue: (profile: UserProfile) => void }) {
  const text = accountCopy[language]
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
    <button className="back-link" onClick={onBack}><Icon name="back" size={18} /> Back</button>
    <div className="eyebrow"><span className="orange-dot" /> {text.registerEyebrow}</div>
    <h1>{text.registerTitle}</h1>
    <p className="lead">{text.registerSubtitle}</p>
    <label className="field-label" htmlFor="register-username">{text.usernameLabel}</label>
    <input className="auth-input" id="register-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={text.usernamePlaceholder} autoComplete="name" autoFocus />
    <label className="field-label" htmlFor="register-email">{text.emailLabel}</label>
    <input className={`auth-input ${emailTaken ? 'has-error' : ''}`} id="register-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailTaken(false) }} placeholder={text.emailPlaceholder} autoComplete="email" />
    {emailTaken && <p className="auth-error">This email is already registered in this demo. Log in instead.</p>}
    <Button className="full-button" disabled={!canContinue} onClick={submit} icon="arrow">{text.continueLabel}</Button>
  </section>
}

function Login({ language, onLogin, onRegister }: { language: Language; onLogin: (email: string) => boolean; onRegister: () => void }) {
  const text = accountCopy[language]
  const [email, setEmail] = useState('')
  const [error, setError] = useState(false)
  const submit = () => { const ok = onLogin(email); setError(!ok) }
  return <div className="onboarding-root"><div className="onboarding-frame"><div className="onboarding-progress"><LogoMark /><div className="onboarding-brand"><strong>BITEWISE</strong><small>食见</small></div><span className="onboarding-step">{language.toUpperCase()}</span></div><section className="onboarding-card auth-card"><div className="eyebrow"><span className="orange-dot" /> {text.loginEyebrow}</div><h1>{text.loginTitle}</h1><p className="lead">{text.loginSubtitle}</p><label className="field-label" htmlFor="login-email">{text.emailLabel}</label><input className={`auth-input ${error ? 'has-error' : ''}`} id="login-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(false) }} placeholder={text.loginEmailPlaceholder} autoComplete="email" autoFocus onKeyDown={(event) => { if (event.key === 'Enter') submit() }} />{error && <p className="auth-error">{text.loginError}</p>}<Button className="full-button" disabled={!email.trim()} onClick={submit} icon="arrow">{text.loginButton}</Button><button type="button" className="auth-register-link" onClick={onRegister}><Icon name="plus" size={15} /> {text.registerNewUser}</button></section></div></div>
}

function WelcomePage({ onContinue }: { onContinue: () => void }) {
  const content = onboardingCopy.en
  return <section className="onboarding-welcome">
    <div className="welcome-art" aria-hidden="true">
      <div className="welcome-orbit welcome-orbit-one" />
      <div className="welcome-orbit welcome-orbit-two" />
      <div className="welcome-plate"><span>🍜</span><i>食</i></div>
      <div className="welcome-note welcome-note-menu"><Icon name="scan" size={16} /><span>{content.welcomeMenuNote}</span></div>
      <div className="welcome-note welcome-note-safe"><Icon name="shield" size={16} /><span>{content.welcomeFitNote}</span></div>
    </div>
    <div className="welcome-copy">
      <div className="eyebrow"><span className="orange-dot" /> {content.welcomeEyebrow}</div>
      <span className="welcome-language">English</span>
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
  const selectedCount = passport.allergies.length + (otherVisible ? 1 : 0)
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
      <div><span className="passport-section-kicker">{text.safetyFlags}</span><label className="field-label">{t('allergies')}</label><p>{text.selectAllToAvoid}</p></div>
      <span>{text.selected(selectedCount)}</span>
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
  const [showOtherDiet, setShowOtherDiet] = useState(Boolean(passport.otherDietary))
  const otherDietVisible = showOtherDiet || Boolean(passport.otherDietary)
  const savedCount = (passport.dietStyle !== 'none' ? 1 : 0) + (passport.faithDiet !== 'none' ? 1 : 0) + passport.avoidFoods.length + (passport.otherDietary ? 1 : 0)
  const text = onboardingCopy[language]
  const localizedDietStyles = dietStyleOptions.map((item) => ({ ...item, ...passportOptionTranslations[language].dietStyle[item.id] }))
  const localizedFaithDiets = faithDietOptions.map((item) => ({ ...item, ...passportOptionTranslations[language].faithDiet[item.id] }))
  const localizedAvoidFoods = avoidFoodOptions.map((item) => ({ ...item, label: passportOptionTranslations[language].avoidFood[item.id] }))

  return <section className="diet-preference-section">
    <div className="passport-section-heading">
      <div><span className="passport-section-kicker">{text.profileBuilder}</span><label className="field-label">{text.dietaryProfile}</label><p>{text.dietaryProfileHint}</p></div>
      <span>{text.saved(savedCount)}</span>
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

      <div className="passport-question passport-other-question">
        <button type="button" className={`passport-other-button ${otherDietVisible ? 'selected' : ''}`} onClick={() => { if (otherDietVisible) { setShowOtherDiet(false); updatePassport('otherDietary', '') } else setShowOtherDiet(true) }}>
          <span className="passport-other-icon">＋</span><span><strong>{text.otherDietRequirement}</strong><small>{text.otherDietHint}</small></span><span className="passport-other-mark">{otherDietVisible ? '✓' : '＋'}</span>
        </button>
        {otherDietVisible && <div className="passport-inline-input"><label htmlFor="other-dietary">{text.otherRequirementLabel}</label><input id="other-dietary" value={passport.otherDietary} onChange={(event) => updatePassport('otherDietary', event.target.value)} placeholder={text.otherRequirementPlaceholder} autoFocus /></div>}
      </div>
    </div>
  </section>
}

function EverydayPreferenceSection({ language, passport, updatePassport }: { language: Language; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void }) {
  const spiceValue = passport.spiceLevel ?? 2
  const savedCount = (passport.spiceLevel === null ? 0 : 1) + passport.preferences.length
  const text = onboardingCopy[language]
  const localizedPreferences = preferenceOptions.map((item) => ({ ...item, label: passportOptionTranslations[language].preference[item.id] }))

  return <section className="everyday-preference-section">
    <div className="passport-section-heading">
      <div><span className="passport-section-kicker">{text.everydayKicker}</span><label className="field-label">{text.everydayTitle}</label><p>{text.everydayHint}</p></div>
      <span>{text.saved(savedCount)}</span>
    </div>

    <div className="passport-section-body everyday-preference-body">
      <div className="passport-question">
        <div className="passport-question-heading"><strong>{text.spiceQuestion}</strong><small>{text.spiceHint}</small></div>
        <div className="spice-control">
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
  return <section className="onboarding-card passport-onboarding"><button className="back-link" onClick={onBack}><Icon name="back" size={18} /> {text.back}</button><div className="eyebrow"><span className="orange-dot" /> {text.passportEyebrow}</div><h1>{t('anything')}</h1><p className="lead">{t('passportSub')}</p><div className="assistant-note"><span className="assistant-face">•ᴗ•</span><span>{text.assistantNote}</span></div><AllergenSection language={language} t={t} passport={passport} updatePassport={updatePassport} /><DietPreferenceSection language={language} passport={passport} updatePassport={updatePassport} /><EverydayPreferenceSection language={language} passport={passport} updatePassport={updatePassport} /><Button className="full-button" onClick={onFinish} icon={finishIcon}>{finishLabel || t('save')}</Button></section>
}

function Home({ t, passport, dishes, sessionRestaurant, currentOrder, getStatus, openScreen, openBill, onOpenOrder, setSelectedDish, setAskSheet, cart }: { t: (key: CopyKey) => string; passport: Passport; dishes: Dish[]; sessionRestaurant: string; currentOrder: DiningOrder | null; getStatus: (dish: Dish) => Status; openScreen: (screen: Screen) => void; openBill: () => void; onOpenOrder: (order: DiningOrder) => void; setSelectedDish: (dish: Dish) => void; setAskSheet: (open: boolean) => void; cart: CartItem[] }) {
  const flagged = dishes.filter((dish) => getStatus(dish) === 'CONFLICT').length
  const hasSavedOrder = Boolean(currentOrder?.cartSnapshot?.length)
  const hasScannedMenu = dishes.length > 0
  const savedMenuCount = currentOrder?.menuSnapshot?.length || dishes.length
  const restaurantName = currentOrder?.restaurant || sessionRestaurant
  const restaurantInitials = currentOrder?.initials || initialsForRestaurant(sessionRestaurant)
  return <div className="page page-home"><section className="welcome-row"><div><div className="eyebrow"><span className="orange-dot" /> Evidence-aware dining in China</div><h1>{t('hello')}<span className="olive-dot">.</span></h1><p>{t('subtitle')}</p></div></section><section className="hero-card"><div className="hero-copy"><span className="hero-kicker">Decision-first dining</span><h2>{t('scanSub')}</h2><p>{t('scanSub')}<br />Scan, understand and choose with confidence.</p><Button onClick={() => openScreen('scan')} icon="scan">{t('scanMenu')}</Button></div><div className="hero-visual"><div className="hero-plate"><span>🥢</span><b>菜</b></div><div className="floating-pill pill-one"><Icon name="shield" size={15} /> {flagged ? `${flagged} conflict${flagged > 1 ? 's' : ''} flagged` : 'Evidence-aware'}</div><div className="floating-pill pill-two"><Icon name="spark" size={15} /> {savedMenuCount} dishes ready</div></div></section>{hasScannedMenu && <section className="session-section"><div className="section-heading"><div><span className="eyebrow"><span className="orange-dot" /> {t('recentSession')}</span><h2>{restaurantName}</h2></div><span className={`status-chip ${hasSavedOrder || hasScannedMenu ? 'match' : ''}`}><span className="status-dot" /> {hasSavedOrder ? 'Order saved' : hasScannedMenu ? t('menuReady') : t('scanMenu')}</span></div><div className="session-card"><div className="session-meta"><span className="restaurant-avatar">{restaurantInitials}</span><span><strong>{hasSavedOrder && currentOrder ? currentOrder.time : 'Tonight · 7:42 PM'}</strong><small>{hasSavedOrder && currentOrder ? `${currentOrder.itemCount} dishes ordered · ¥${currentOrder.total}` : hasScannedMenu ? `${savedMenuCount} menu dishes · ${passport.diets.includes('vegetarian') ? 'Vegetarian' : 'Food Passport active'}` : t('scanMenu')}</small></span><button className="more-button"><Icon name="dots" size={20} /></button></div><div className="progress-line"><span style={{ width: hasSavedOrder ? '100%' : hasScannedMenu ? (cart.length ? '82%' : '45%') : '0%' }} /></div><div className="session-actions">{hasScannedMenu ? <><button onClick={() => openScreen('menu')}><Icon name="menu" size={17} /> {hasSavedOrder ? 'View menu' : t('openSession')}</button>{hasSavedOrder && currentOrder ? <><button onClick={() => onOpenOrder(currentOrder)}><Icon name="receipt" size={17} /> View order</button></> : <button onClick={() => { setSelectedDish(dishes[0]); setAskSheet(true) }}><Icon name="alert" size={17} /> Review flags</button>}</> : <button onClick={() => openScreen('scan')}><Icon name="scan" size={17} /> {t('scanMenu')}</button>}</div></div></section>}</div>
}

function Scan({ t, restaurantName, setRestaurantName, scanImage, scanning, scanError, fileInputRef, handleFile, startScan, onRetry, onOpenCamera, onBack }: { t: (key: CopyKey) => string; restaurantName: string; setRestaurantName: (value: string) => void; scanImage: string | null; scanning: boolean; scanError: string; fileInputRef: RefObject<HTMLInputElement>; handleFile: (event: ChangeEvent<HTMLInputElement>) => void; startScan: (file?: File) => void | Promise<void>; onRetry: () => void; onOpenCamera: () => void; onBack: () => void }) {
  const hasRestaurantName = restaurantName.trim().length > 0
  return <div className="page page-narrow page-scan"><PageHeader title={t('scanMenu')} kicker="Step 01 · Capture" onBack={onBack} action={<button className="icon-button soft"><Icon name="spark" size={18} /></button>} /><div className="scan-intro"><h1>{t('scanTitle')}</h1><p>{t('scanSubTitle')}</p></div><div className="restaurant-name-field"><label htmlFor="restaurant-name">Where are you eating today?</label><input id="restaurant-name" value={restaurantName} onChange={(event) => setRestaurantName(event.target.value)} placeholder="e.g. Chengdu Garden" disabled={scanning} required /><small>We’ll use this name to record today’s dining session.</small></div><div className={`scan-frame ${scanImage ? 'has-image' : ''}`}>{scanImage ? <img src={scanImage} alt="Uploaded menu preview" /> : <><div className="scan-corners" /><div className="scan-placeholder"><span className="menu-paper"><b>今日菜单</b><span>宫保鸡丁　　 ¥38</span><span>麻婆豆腐　　 ¥28</span><span>清炒时蔬　　 ¥22</span><span>酸辣汤　　　 ¥18</span></span><div className="scan-line" /></div></>}</div><div className="tip-grid"><div><Icon name="spark" size={17} /><span>{t('avoidGlare')}</span></div><div><Icon name="scan" size={17} /><span>{t('keepFlat')}</span></div><div><Icon name="copy" size={17} /><span>{t('everyPage')}</span></div></div><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} hidden />{scanning ? <div className="analysis-card"><span className="loader" /><span><strong>{t('analyzing')}</strong><small>{t('analysisSub')}</small></span></div> : scanError ? <div className="analysis-error"><strong>Menu analysis failed</strong><p>{scanError}</p><div className="analysis-error-actions"><Button onClick={onRetry} icon="refresh">Retry</Button><Button variant="secondary" onClick={() => fileInputRef.current?.click()} icon="upload">Choose another image</Button></div></div> : <><Button className="full-button" onClick={onOpenCamera} icon="camera" disabled={!hasRestaurantName}>{t('capture')}</Button><Button className="full-button" variant="secondary" onClick={() => fileInputRef.current?.click()} icon="upload" disabled={!hasRestaurantName}>{scanImage ? 'Choose another photo' : t('upload')}</Button><button className="demo-link" onClick={() => void startScan()} disabled={!hasRestaurantName}><Icon name="spark" size={16} /> {t('sampleMenu')}</button></>}</div>
}

function CameraCapture({ t, pages, onCapture, onFallbackFile, onUndo, onDelete, onDone, onBack }: { t: (key: CopyKey) => string; pages: CapturedPage[]; onCapture: (file: File) => void; onFallbackFile: (file: File) => void; onUndo: () => void; onDelete: (id: number) => void; onDone: () => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const [reviewing, setReviewing] = useState(false)
  const [showCapturedPages, setShowCapturedPages] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [reviewFile, setReviewFile] = useState<File | null>(null)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const hasPages = pages.length > 0
  useEffect(() => {
    let stream: MediaStream | null = null
    let active = true
    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setCameraError('This browser does not provide camera access.'); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
        if (!active || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      } catch { setCameraError('Camera permission was denied or no camera is available. You can upload a photo instead.') }
    }
    void openCamera()
    return () => { active = false; stream?.getTracks().forEach((track) => track.stop()) }
  }, [])
  useEffect(() => () => { if (reviewUrl) URL.revokeObjectURL(reviewUrl) }, [reviewUrl])
  const captureFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !cameraReady || video.videoWidth === 0) { setCameraError('The camera preview is not ready yet. Please try again or upload a photo.'); return }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) { setCameraError('The captured image could not be created. Please try again.'); return }
      const file = new File([blob], `menu-${Date.now()}.jpg`, { type: 'image/jpeg' })
      if (reviewUrl) URL.revokeObjectURL(reviewUrl)
      setReviewFile(file)
      setReviewUrl(URL.createObjectURL(file))
      setReviewing(true)
      setShowCapturedPages(false)
    }, 'image/jpeg', 0.9)
  }
  const confirmCapture = () => { if (reviewFile) onCapture(reviewFile); setReviewing(false); setReviewFile(null); setShowCapturedPages(false) }
  const fallbackFileSelected = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onFallbackFile(file) }
  const focusViewfinder = () => { setShowCapturedPages(false); document.querySelector<HTMLElement>('.camera-viewport')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }

  return <div className="page page-narrow page-camera">
    <PageHeader title={t('capture')} kicker="Step 01 · Camera" onBack={onBack} />
    <div className="camera-intro"><strong>Keep the whole menu in frame</strong><small>{cameraReady ? 'Rear camera ready · the image is sent only for analysis' : 'Requesting rear camera access…'}</small></div>
    <div className={`camera-stage ${reviewing ? 'camera-stage-review' : ''}`}>
      <div className="camera-viewport">
        <div className={`camera-scene ${reviewing ? 'camera-scene-review' : ''}`}>
          {reviewing && reviewUrl ? <img className="camera-review-image" src={reviewUrl} alt="Captured menu preview" /> : <video ref={videoRef} className="camera-video" playsInline muted aria-label="Live menu camera preview" />}
          {cameraError && !reviewing && <div className="camera-fallback"><strong>Camera unavailable</strong><small>{cameraError}</small><Button variant="secondary" onClick={() => fallbackInputRef.current?.click()} icon="upload">Choose a photo</Button><input ref={fallbackInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={fallbackFileSelected} hidden /></div>}
          {!cameraReady && !reviewing && <div className="camera-menu-sheet"><b>今日菜单</b><span>宫保鸡丁　　 ¥38</span><span>麻婆豆腐　　 ¥28</span><span>清炒时蔬　　 ¥22</span><span>酸辣汤　　　 ¥18</span><span>香煎茄子　　 ¥26</span></div>}
          <div className="camera-boundary"><i /><i /><i /><i /></div>
          {!reviewing && <div className="camera-scan-line" />}
        </div>
        {!reviewing && <span className="camera-hint">Move closer until all four corners are visible</span>}
        {!reviewing && hasPages && <Button className="camera-preview-done" onClick={onDone} icon="check">Done scanning</Button>}
      </div>
      {reviewing ? <div className="camera-controls camera-review-controls">
        <Button className="camera-review-action" variant="secondary" onClick={() => setReviewing(false)} icon="refresh">Retake</Button>
        <Button className="camera-review-action" onClick={confirmCapture} icon="check">Use photo</Button>
      </div> : <div className={`camera-controls ${hasPages ? 'camera-controls-ready' : 'camera-controls-first'}`}>
        {hasPages ? <button type="button" className="camera-control camera-undo" aria-label="Undo last captured page" onClick={onUndo}><Icon name="undo" size={23} /><small>Undo</small></button> : <span aria-hidden="true" />}
        <div className="camera-center-control">
          <button type="button" className="shutter-button" aria-label="Capture menu page" onClick={captureFrame}><span /></button>
        </div>
        {hasPages ? <button type="button" className={`camera-pages-trigger ${showCapturedPages ? 'active' : ''}`} aria-label="Show captured pages" aria-expanded={showCapturedPages} onClick={() => setShowCapturedPages((current) => !current)}><span className="camera-pages-thumb"><span>{pages.length}</span></span><small>Pages</small></button> : <span aria-hidden="true" />}
      </div>}
      {!reviewing && showCapturedPages && hasPages && <section className="captured-pages camera-pages-popover"><div className="captured-heading"><div><strong>Captured pages</strong><small>{pages.length} page{pages.length === 1 ? '' : 's'} · keep scanning</small></div><span>{t('everyPage')}</span></div><div className="page-thumbnails">{pages.map((page) => <div className={`page-thumbnail page-thumbnail-${page.variant}`} key={page.id}><div className="thumbnail-paper"><b>{page.title}</b><span>今日菜单</span><em>¥38</em><em>¥28</em><em>¥22</em></div><button type="button" className="thumbnail-delete" aria-label={`Delete ${page.title}`} onClick={() => onDelete(page.id)}><Icon name="close" size={11} /></button></div>)}<button type="button" className="thumbnail-add" aria-label="Add another page" onClick={focusViewfinder}><Icon name="plus" size={20} /></button></div></section>}
    </div>
    <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />
  </div>
}

function PageHeader({ title, kicker, hideKicker, onBack, action }: { title: string; kicker?: string; hideKicker?: boolean; onBack?: () => void; action?: ReactNode }) { return <div className="page-header"><button className="icon-button soft" onClick={onBack}><Icon name="back" size={20} /></button><div className="page-title">{!hideKicker && <span><span className="orange-dot" /> {kicker || 'BITEWISE · 食见'}</span>}<strong>{title}</strong></div>{action || <span className="header-spacer" />}</div> }

function MenuResults({ t, language, dishes: visibleDishes, allDishes, getStatus, cart, onAddToCart, onOpenCart, onBack, onDetail }: { t: (key: CopyKey) => string; language: Language; dishes: Dish[]; allDishes: Dish[]; getStatus: (dish: Dish) => Status; cart: CartItem[]; onAddToCart: (dish: Dish) => void; onOpenCart: () => void; onBack: () => void; onDetail: (dish: Dish) => void }) {
  const conflictCount = allDishes.filter((dish) => getStatus(dish) === 'CONFLICT').length
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  return <div className="page page-narrow page-menu"><PageHeader title={t('menuResults')} kicker="Step 02 · Decide" onBack={onBack} /><div className="menu-notice"><Icon name="shield" size={19} /><span>{t('checking')}<small>{conflictCount ? ' Clear conflicts are excluded from the cart.' : ' Unknown information stays visible and uncertain.'}</small></span></div><div className="menu-list">{visibleDishes.map((dish) => <DishCard key={dish.id} dish={dish} language={language} status={getStatus(dish)} t={t} onDetail={onDetail} onAddToCart={onAddToCart} cartQuantity={cart.find((item) => item.dish.id === dish.id)?.quantity || 0} />)}</div><div className={`sticky-cta ${cartCount ? 'has-items' : 'empty'}`}><button type="button" className="cart-floating-button" onClick={onOpenCart}><span className="cart-floating-icon"><Icon name="cart" size={19} />{cartCount > 0 && <b>{cartCount}</b>}</span><span className="cart-floating-copy"><strong>{cartCount ? 'View cart' : 'Cart'}</strong><small>{cartCount ? `${cartCount} ${cartCount === 1 ? 'dish' : 'dishes'} selected` : 'Choose dishes as you browse'}</small></span><strong className="cart-floating-total">{cartCount ? `¥${cartTotal}` : '¥0'}</strong><Icon name="arrow" size={17} /></button></div></div>
}

function DishVisual({ dish, small = false }: { dish: Dish; small?: boolean }) { return <div className={`dish-visual ${dish.className} ${small ? 'dish-visual-small' : ''}`}><img className="dish-photo" src={dish.imageSrc} alt={dish.name} loading="lazy" /></div> }
function StatusBadge({ status, t }: { status: Status; t: (key: CopyKey) => string }) { const map = { MATCH: ['match', t('matchLabel'), 'check'], WARNING: ['warning', t('warningLabel'), 'alert'], CONFLICT: ['conflict', t('conflictLabel'), 'close'], UNKNOWN: ['unknown', t('unknownLabel'), 'alert'] } as const; const [color, label, icon] = map[status]; return <span className={`status-badge ${color}`}><Icon name={icon} size={14} /> {label}</span> }
function DishCard({ dish, language, status, t, onDetail, onAddToCart, cartQuantity }: { dish: Dish; language: Language; status: Status; t: (key: CopyKey) => string; onDetail: (dish: Dish) => void; onAddToCart: (dish: Dish) => void; cartQuantity: number }) { const info = status === 'CONFLICT' ? t('detailsConflict') : status === 'WARNING' ? t('detailsUnknown') : status === 'UNKNOWN' ? t('detailsUnknown') : t('detailsMatch'); const inCart = cartQuantity > 0; return <article className={`dish-card card-status-${status.toLowerCase()}`}><button className="dish-card-main" onClick={() => onDetail(dish)}><DishVisual dish={dish} /><div className="dish-card-content"><div className="dish-card-title"><div><h3>{dish.localized[language]}</h3><span>{dish.zh}</span></div><strong>¥{dish.price}</strong></div><div className="tag-row dish-tags">{dish.tags.map((tag) => <span key={tag} className="tiny-tag">{tag}</span>)}<span className="tiny-tag spicy">{dish.spicy ? '🌶️'.repeat(dish.spicy) : '○'} {dish.spicy ? dish.spicy === 1 ? 'Mild' : dish.spicy === 2 ? 'Medium' : 'Spicy' : 'Mild'}</span></div><div className="status-line"><StatusBadge status={status} t={t} /><span>{info}</span></div></div></button><div className="dish-card-actions"><button className="dish-detail-button" onClick={() => onDetail(dish)}>{t('viewDetails')} <Icon name="arrow" size={16} /></button><button className={`dish-cart-button ${inCart ? 'is-in-cart' : ''}`} disabled={status === 'CONFLICT'} aria-pressed={inCart} onClick={() => onAddToCart(dish)}>{status === 'CONFLICT' ? <><Icon name="close" size={15} /> Excluded</> : inCart ? <><span className="cart-button-check"><Icon name="check" size={13} /></span><span>In cart</span><b className="cart-button-count">{cartQuantity}</b></> : <><Icon name="plus" size={15} /> Add to cart</>}</button></div></article> }

type IngredientRisk = 'clear' | 'conflict' | 'possible' | 'unknown'
type IngredientCheck = { label: string; risk: IngredientRisk }

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
  return passport.faithDiet === 'kosher' && dish.hasSeafood && has('fish', 'seafood', 'shrimp', 'prawn', 'shellfish')
}

function buildIngredientChecks(dish: Dish, passport: Passport, status: Status): IngredientCheck[] {
  const checks = dish.ingredients.map<IngredientCheck>((label) => {
    const explicitConflict = passport.allergies.some((selected) => dish.allergens.some((allergen) => allergenMatchKeys(selected).includes(allergen)) && ingredientMatchesAllergen(label, selected))
    const dietaryConflict = ingredientDietConflict(label, dish, passport)
    if (explicitConflict || dietaryConflict) return { label, risk: 'conflict' }
    const possibleConflict = (dish.possibleAllergens || []).some((allergen) => passport.allergies.some((selected) => allergenMatchKeys(selected).includes(allergen)) && ingredientMatchesAllergen(label, allergen))
    return { label, risk: possibleConflict ? 'possible' : 'clear' }
  })

  const carrierIndex = checks.findIndex((item) => ingredientCarrier(item.label) && item.risk === 'clear')
  const relevantPossible = (dish.possibleAllergens || []).some((allergen) => passport.allergies.some((selected) => allergenMatchKeys(selected).includes(allergen)))
  if (relevantPossible && !checks.some((item) => item.risk === 'possible')) {
    if (carrierIndex >= 0) checks[carrierIndex].risk = 'possible'
    else checks.push({ label: 'Unspecified recipe detail', risk: 'possible' })
  }
  if (status === 'UNKNOWN' && !checks.some((item) => item.risk === 'unknown')) {
    const unknownIndex = checks.findIndex((item) => ingredientCarrier(item.label) && item.risk === 'clear')
    if (unknownIndex >= 0) checks[unknownIndex].risk = 'unknown'
    else checks.push({ label: 'Unspecified recipe detail', risk: 'unknown' })
  }
  if (status === 'CONFLICT' && !checks.some((item) => item.risk === 'conflict')) checks.push({ label: 'Passport conflict', risk: 'conflict' })
  return checks
}

function ingredientRiskLabel(risk: IngredientRisk, t: (key: CopyKey) => string) {
  if (risk === 'conflict') return t('conflictLabel')
  if (risk === 'possible') return t('warningLabel')
  if (risk === 'unknown') return t('unknownLabel')
  return t('matchLabel')
}

function DishDetail({ t, language, dish, passport, status, onBack, onAsk, onAddToCart }: { t: (key: CopyKey) => string; language: Language; dish: Dish; passport: Passport; status: Status; onBack: () => void; onAsk: () => void; onAddToCart: () => void }) {
  const ingredientChecks = buildIngredientChecks(dish, passport, status)
  const statusDetail = status === 'CONFLICT' ? t('detailsConflict') : status === 'WARNING' || status === 'UNKNOWN' ? t('detailsUnknown') : t('detailsMatch')
  return <div className="page page-narrow page-detail">
    <PageHeader title={t('mainIngredients')} kicker="Step 03 · Understand" onBack={onBack} action={<button className="icon-button soft"><Icon name="bookmark" size={18} /></button>} />
    <div className="detail-hero"><DishVisual dish={dish} /></div>
    <div className="detail-heading"><div><h1>{dish.localized[language]}</h1><span>{dish.zh}</span></div><strong>¥{dish.price}</strong></div>
    <div className="detail-status-row"><StatusBadge status={status} t={t} /><span className="spice-chip">{dish.spicy ? '🌶️'.repeat(dish.spicy) : '○'} {dish.spicy ? dish.spicy === 1 ? 'Mild' : dish.spicy === 2 ? 'Medium spicy' : 'Spicy' : 'Not spicy'}</span></div>
    <section className="detail-passport-check">
      <div className="detail-passport-title"><Icon name="shield" size={17} /><strong>{t('checking')}</strong></div>
      <p>{statusDetail}</p>
      <div className="detail-evidence-legend"><span className="evidence-known"><i /> {t('conflictLabel')}</span><span className="evidence-possible"><i /> {t('warningLabel')}</span><span className="evidence-unknown"><i /> {t('unknownLabel')}</span></div>
    </section>
    <section className="detail-ingredients-section">
      <div className="detail-section-heading"><SectionTitle>{t('mainIngredients')}</SectionTitle><span>Swipe to explore</span></div>
      <div className="ingredient-scroller" role="list" aria-label={t('mainIngredients')}>
        {ingredientChecks.map((item) => <div className={`ingredient-card ingredient-card-${item.risk}`} key={`${item.label}-${item.risk}`} role="listitem"><span className="ingredient-card-icon"><i /></span><strong>{item.label}</strong><small>{ingredientRiskLabel(item.risk, t)}</small></div>)}
      </div>
    </section>
    <p className="illustrative"><Icon name="alert" size={15} /> {t('illustrative')}</p>
    <div className="fact-grid"><Fact title={t('taste')} value={dish.taste} /><Fact title={t('texture')} value={dish.texture} /><Fact title={t('cooking')} value={dish.cooking} /><Fact title={t('bestWith')} value={dish.bestWith} /></div>
    <SectionTitle>{t('culturalNote')}</SectionTitle><div className="culture-card"><p>{dish.culture}</p></div>
    <div className="comparison-card"><Icon name="spark" size={18} /><p><strong>Helpful context</strong><br />This is a short cultural explanation to make the dish easier to decide on, not a promise that recipes are identical everywhere.</p></div>
    <div className="why-card"><span>{t('whySeeing')}</span><p>{statusDetail}</p></div>
    <div className="detail-actions"><Button variant="secondary" onClick={onAsk} icon="alert">{t('askRestaurant')}</Button><Button disabled={status === 'CONFLICT'} onClick={onAddToCart} icon={status === 'CONFLICT' ? 'close' : 'cart'}>{status === 'CONFLICT' ? 'Excluded' : 'Add to cart'}</Button></div>
  </div>
}
function Cart({ t, language, cart, itemCount, total, getStatus, onBack, onIncrease, onDecrease, onRemove, onClear, onConfirm }: { t: (key: CopyKey) => string; language: Language; cart: CartItem[]; itemCount: number; total: number; getStatus: (dish: Dish) => Status; onBack: () => void; onIncrease: (dishId: string) => void; onDecrease: (dishId: string) => void; onRemove: (dishId: string) => void; onClear: () => void; onConfirm: () => void }) {
  return <div className="page page-narrow page-cart">
    <PageHeader title="Your cart" kicker="Step 03 · Choose" onBack={onBack} action={cart.length ? <button type="button" className="text-link" onClick={onClear}>Clear</button> : undefined} />
    {!cart.length ? <div className="cart-empty"><div className="cart-empty-icon"><Icon name="cart" size={28} /></div><h1>Your cart is empty</h1><p>Select dishes from your matched menu and they’ll appear here.</p><Button className="full-button" onClick={onBack} icon="menu">Back to menu</Button></div> : <>
      <div className="cart-safety-note"><Icon name="shield" size={18} /><span><strong>Passport checks stay visible</strong><small>Only dishes without a clear conflict can be added. Warnings and unknowns stay attached to each dish.</small></span></div>
      <div className="cart-list">{cart.map(({ dish, quantity }) => <article className="cart-item" key={dish.id}><div className="cart-item-main"><DishVisual dish={dish} small /><div className="cart-item-copy"><strong>{dish.localized[language]}</strong><small>{dish.zh} · ¥{dish.price} each</small></div><div className="cart-item-aside"><b className="cart-item-price">¥{dish.price * quantity}</b><StatusBadge status={getStatus(dish)} t={t} /></div></div><div className="cart-item-footer"><div className="cart-quantity"><button type="button" onClick={() => onDecrease(dish.id)} aria-label={`Decrease ${dish.name}`}><Icon name="minus" size={13} /></button><strong>{quantity}</strong><button type="button" onClick={() => onIncrease(dish.id)} aria-label={`Increase ${dish.name}`}><Icon name="plus" size={13} /></button></div><button type="button" className="cart-remove" onClick={() => onRemove(dish.id)}>Remove dish</button><span className="cart-item-subtotal">{quantity > 1 ? `${quantity} × ¥${dish.price}` : 'Single dish'}</span></div></article>)}</div>
      <div className="cart-total"><span>Total · {itemCount} {itemCount === 1 ? 'dish' : 'dishes'}</span><strong>¥{total}</strong></div>
      <Button className="full-button" onClick={onConfirm} icon="check">Confirm selections</Button>
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

function orderRequirements(passport: Passport, language: Language, t: (key: CopyKey) => string): OrderRequirement[] {
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
  if (passport.otherDietary.trim()) requirements.push({ user: passport.otherDietary.trim(), chinese: passport.otherDietary.trim(), tone: 'note' })
  if (passport.spiceLevel !== null) requirements.push({ user: `Spice level ${passport.spiceLevel} or below`, chinese: `辣度不超过${passport.spiceLevel}级`, tone: 'note' })
  const needsCrossContactCare = (passport.crossContact && (passport.allergies.length > 0 || Boolean(passport.otherAllergen))) || passport.allergies.some((id) => (passport.allergyProfiles[id] || defaultAllergyProfile).crossContact) || Boolean(passport.otherAllergen)
  if (needsCrossContactCare) requirements.push({ user: 'Avoid cross-contact', chinese: '请避免交叉接触', tone: 'alert' })
  return requirements
}

function OrderPage({ language, passport, cart, savedOrder, onBack, onComplete, onViewMenu, onHome }: { language: Language; passport: Passport; cart: CartItem[]; savedOrder: DiningOrder | null; onBack: () => void; onComplete: () => void; onViewMenu: () => void; onHome: () => void }) {
  const t = (key: CopyKey) => tFor(language, key)
  const isSavedOrder = Boolean(savedOrder)
  const requirements = orderRequirements(passport, language, t)
  const total = cart.reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  return <div className="page page-narrow page-order-brief">
    <PageHeader title="Order brief" kicker="Step 04 · Order" onBack={isSavedOrder ? onHome : onBack} />
    <div className="order-brief-heading"><span className="eyebrow"><span className="orange-dot" /> Bilingual order page</span><h1>Show this to your waiter.</h1><p>Your selected dishes and Food Passport requirements are kept together in your language and Chinese.</p></div>
    <section className="order-brief-card order-brief-user"><div className="order-brief-card-heading"><div><span className="order-brief-kicker">For you</span><h2>Your selected dishes</h2></div><span className="order-brief-language">{count} {count === 1 ? 'dish' : 'dishes'}</span></div><div className="order-brief-dishes">{cart.map(({ dish, quantity }) => <div className="order-brief-dish" key={dish.id}><DishVisual dish={dish} small /><div><strong>{dish.localized[language]}</strong><small>{dish.zh} · ×{quantity}</small></div><b>¥{dish.price * quantity}</b></div>)}</div><div className="order-brief-total"><span>Total</span><strong>¥{total}</strong></div><div className="order-brief-translation order-brief-user-notes"><div className="order-brief-card-heading"><div><span className="order-brief-kicker">Dietary notes</span><h2>Your requirements</h2></div><Icon name="shield" size={20} /></div>{requirements.length ? <div className="order-requirements">{requirements.map((requirement) => <div className={`order-requirement ${requirement.tone === 'alert' ? 'is-alert' : ''}`} key={`${requirement.user}-${requirement.chinese}`}><Icon name={requirement.tone === 'alert' ? 'alert' : 'check'} size={15} /><span>{requirement.user}</span></div>)}</div> : <p className="order-no-requirements">No additional dietary requirements.</p>}</div></section>
    <section className="order-brief-card order-brief-waiter"><div className="order-brief-card-heading"><div><span className="order-brief-kicker">For waiter</span><h2>点餐信息</h2></div><Icon name="users" size={20} /></div><div className="waiter-order-section"><h3>需要的菜品</h3><div className="waiter-order-list">{cart.map(({ dish, quantity }) => <div key={dish.id}><span><strong>{dish.zh}</strong></span><b>×{quantity}</b></div>)}</div></div><div className="waiter-order-section"><h3>忌口与注意事项</h3>{requirements.length ? <div className="order-requirements">{requirements.map((requirement) => <div className={`order-requirement ${requirement.tone === 'alert' ? 'is-alert' : ''}`} key={`${requirement.chinese}-${requirement.user}`}><Icon name={requirement.tone === 'alert' ? 'alert' : 'check'} size={15} /><span>{requirement.chinese}</span></div>)}</div> : <p className="order-no-requirements">暂无额外忌口要求，请按菜单正常出餐。</p>}</div></section>
    <div className="order-brief-actions">{isSavedOrder ? <><Button className="full-button" onClick={onViewMenu} icon="menu">View scanned menu</Button><Button variant="secondary" className="full-button" onClick={onHome} icon="home">Back to home</Button></> : <><Button className="full-button" onClick={onBack} icon="cart">返回购物车继续修改</Button><Button variant="secondary" className="full-button" onClick={onComplete} icon="check">完成点单返回主页</Button></>}</div>
    <p className="order-brief-disclaimer"><Icon name="alert" size={14} /> This page translates your saved requirements for communication. The restaurant must still confirm ingredients and cross-contact.</p>
  </div>
}

function SectionTitle({ children }: { children: ReactNode }) { return <h2 className="section-title">{children}</h2> }
function Fact({ title, value }: { title: string; value: string }) { return <div className="fact-card"><span>{title}</span><strong>{value}</strong></div> }

function AskSheet({ t, language, dish, question, loading, onClose, onCopy, onSpeak }: { t: (key: CopyKey) => string; language: Language; dish: Dish; question: string; loading: boolean; onClose: () => void; onCopy: () => void; onSpeak: () => void }) { return <div className="sheet-backdrop" onClick={onClose}><section className="ask-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-top"><div className="eyebrow"><span className="orange-dot" /> Step 04 · Ask</div><button className="icon-button soft" onClick={onClose}><Icon name="close" size={18} /></button></div><span className="safety-label"><Icon name="shield" size={15} /> {t('askWarning')}</span><h2>{t('askTitle')}</h2><div className="question-card"><strong>中文 · Show first</strong>{loading ? <p className="assistant-loading"><span className="loader" /> Preparing a restaurant question…</p> : <p>{question}</p>}<hr /><strong>{dish.name}</strong><small>{dish.zh} · {dish.price} CNY</small></div><div className="sheet-actions"><Button onClick={onSpeak} icon="volume" disabled={loading}>{t('playChinese')}</Button><Button variant="secondary" onClick={onCopy} icon="copy" disabled={loading}>{t('copyQuestion')}</Button></div><p className="sheet-disclaimer">If the restaurant cannot confirm, keep this dish excluded from recommendations. Menu evidence cannot determine kitchen cross-contact.</p></section></div> }


function Bill({ t, billInputRef, handleFile, billMode, setBillMode, participants, setParticipants, splitItems, setSplitItems, billItems, billTotal, equalAmount, itemTotals, order, billSource, billReceiptName, setBillSource, onBack, onToast }: { t: (key: CopyKey) => string; billInputRef: React.RefObject<HTMLInputElement>; handleFile: (event: React.ChangeEvent<HTMLInputElement>) => void; billMode: BillMode; setBillMode: (mode: BillMode) => void; participants: string[]; setParticipants: (people: string[]) => void; splitItems: Record<string, string>; setSplitItems: (items: Record<string, string>) => void; billItems: BillItem[]; billTotal: number; equalAmount: string; itemTotals: Record<string, number>; order: DiningOrder; billSource: 'order' | 'receipt'; billReceiptName: string; setBillSource: (source: 'order' | 'receipt') => void; onBack: () => void; onToast: (toast: string) => void }) {
  const [editingParticipant, setEditingParticipant] = useState<number | null>(null)
  const [draftParticipant, setDraftParticipant] = useState('')
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
  const addParticipant = () => { const name = `Guest ${participants.length + 1}`; setParticipants([...participants, name]); setDraftParticipant(name); setEditingParticipant(participants.length) }
  const removeParticipant = (index: number) => {
    const removedName = participants[index]
    setParticipants(participants.filter((_, personIndex) => personIndex !== index))
    setSplitItems(Object.fromEntries(Object.entries(splitItems).map(([itemId, owner]) => [itemId, owner === removedName ? 'Everyone' : owner])))
    setEditingParticipant(null)
  }

  return <div className="page page-narrow page-bill">
    <PageHeader title={t('billTitle')} hideKicker onBack={onBack} action={<button className="icon-button soft"><Icon name="share" size={18} /></button>} />
    <div className="bill-context-card"><span className="bill-context-icon"><Icon name="receipt" size={20} /></span><div><strong>{order.restaurant}</strong><small>{order.time} · {billItems.length} items</small></div><span className={`bill-source-badge ${billSource === 'receipt' ? 'is-receipt' : ''}`}>{billSource === 'receipt' ? 'Receipt updated' : 'From order'}</span></div>
    <div className="bill-source-actions"><input ref={billInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden /><Button variant="secondary" onClick={() => billInputRef.current?.click()} icon="camera">{billSource === 'receipt' ? 'Replace receipt' : 'Upload receipt to update'}</Button>{billSource === 'receipt' && <button className="text-link" onClick={() => { setBillSource('order'); onToast('Using order totals again') }}>Use order totals</button>}</div>
    <p className="bill-source-note"><Icon name="shield" size={14} /> {billSource === 'receipt' ? `Line items and total updated from ${billReceiptName || 'the uploaded receipt'}.` : 'Using the prices captured when this order was placed. Upload a receipt if the final bill changed.'}</p>
    <div className="bill-summary"><div><span>{t('verified')}</span><strong>¥{billTotal.toFixed(2)}</strong></div><span className="status-chip match"><span className="status-dot" /> {billSource === 'receipt' ? 'Receipt total' : 'Order total'}</span></div>
    <div className="bill-tabs segmented">{([['equal', t('equal')], ['item', t('byItem')]] as Array<[BillMode, string]>).map(([value, label]) => <button key={value} className={billMode === value ? 'active' : ''} onClick={() => setBillMode(value)}>{label}</button>)}</div>
    <div className="bill-section"><div className="section-heading compact-heading"><h2>{t('participants')}</h2><span className="muted-small">Names are editable</span><button className="text-link" onClick={addParticipant}><Icon name="plus" size={14} /> Add</button></div><div className="participant-row">{participants.map((person, index) => { const isEditing = editingParticipant === index; return <div className={`participant-chip ${isEditing ? 'is-editing' : ''}`} key={`${index}-${person}`}>{isEditing ? <input className="participant-name-input" value={draftParticipant} onChange={(event) => setDraftParticipant(event.target.value)} onBlur={() => commitParticipant(index)} onKeyDown={(event) => { if (event.key === 'Enter') commitParticipant(index); if (event.key === 'Escape') { setDraftParticipant(person); setEditingParticipant(null) } }} autoFocus aria-label={`Edit participant ${person}`} /> : <><button className="participant-name" onClick={() => editParticipant(index)} aria-label={`Edit participant ${person}`}><span>{person.trim().charAt(0).toUpperCase() || '?'}</span>{person}</button><button className="participant-edit" onClick={() => editParticipant(index)} aria-label={`Edit participant ${person}`}><Icon name="edit" size={11} /></button></>}{index > 0 && <button className="participant-remove" onClick={() => removeParticipant(index)} aria-label={`Remove participant ${person}`}><Icon name="close" size={12} /></button>}</div> })}</div></div>
    {billMode !== 'equal' && <div className="bill-section"><div className="section-heading compact-heading"><h2>{t('billItems')}</h2><span className="muted-small">Tap an item to assign</span></div><div className="bill-item-list">{billItems.map((item) => <div className="bill-item" key={item.id}><DishVisual dish={item.dish} small /><span><strong>{item.label}</strong><small>{item.zh}</small></span><select value={splitItems[item.id] || 'Everyone'} onChange={(event) => setSplitItems({ ...splitItems, [item.id]: event.target.value })}>{['Everyone', ...participants].map((person) => <option key={person}>{person}</option>)}</select><b>¥{item.amount.toFixed(2)}</b></div>)}</div></div>}
    <div className="split-result"><div className="result-heading"><h2>Everyone pays</h2><span>Exact total check <Icon name="check" size={15} /></span></div>{billMode === 'equal' ? participants.map((person) => <div className="person-result" key={person}><span><span className="participant-initial">{person.trim().charAt(0).toUpperCase() || '?'}</span>{person}</span><strong>¥{equalAmount}</strong></div>) : participants.map((person) => <div className="person-result" key={person}><span><span className="participant-initial">{person.trim().charAt(0).toUpperCase() || '?'}</span>{person}</span><strong>¥{itemTotals[person].toFixed(2)}</strong></div>)}<div className="split-total"><span>{t('verified')}</span><strong>¥{billTotal.toFixed(2)}</strong></div></div><Button className="full-button" onClick={() => { onToast('Share sheet ready'); navigator.share?.({ title: 'Bitewise bill split', text: `Everyone pays from ¥${billTotal.toFixed(2)}` }) }} icon="share">{t('share')}</Button>{billSource === 'receipt' && <button className="reset-bill" onClick={() => { setBillSource('order'); onToast('Using order totals again') }}>Use order totals</button>}</div>
}

function FindFood({ t, restaurants, savedRestaurants, onToggleRestaurant, onBack, onScan }: { t: (key: CopyKey) => string; restaurants: SavedRestaurant[]; savedRestaurants: SavedRestaurant[]; onToggleRestaurant: (restaurant: SavedRestaurant) => void; onBack: () => void; onScan: () => void }) { return <div className="page page-narrow page-find"><PageHeader title={t('findFood')} kicker="P1 · Explore" onBack={onBack} action={<button className="icon-button soft"><Icon name="compass" size={19} /></button>} /><div className="find-heading"><h1>{t('findTitle')}</h1><p>{t('findSub')}</p></div><div className="intent-grid">{[['🥟', 'Dumplings'], ['🍜', 'Noodles'], ['🌿', 'Vegetarian'], ['🌶️', 'Not spicy'], ['🍲', 'Hot pot'], ['✨', 'Surprise me']].map(([emoji, label]) => <button key={label} onClick={onScan}><span>{emoji}</span><strong>{label}</strong><small>{t('whyFits')} · Food Passport</small></button>)}</div><div className="nearby-heading"><h2>{t('nearby')}</h2><span>{savedRestaurants.length} saved · Shanghai · 1.2 km radius</span></div><div className="restaurant-list">{restaurants.map((restaurant, index) => { const saved = savedRestaurants.some((item) => item.id === restaurant.id); return <article className="restaurant-card" key={restaurant.id}><div className={`restaurant-photo ${restaurant.tone}`}>{restaurant.emoji}</div><div><div className="restaurant-top"><strong>{restaurant.name}</strong><button type="button" className={`restaurant-save-toggle ${saved ? 'saved' : ''}`} aria-label={saved ? `Remove ${restaurant.name} from saved restaurants` : `Save ${restaurant.name}`} onClick={() => onToggleRestaurant(restaurant)}><Icon name="bookmark" size={17} /></button></div><p>{restaurant.cuisine}</p><small><Icon name="shield" size={14} /> Why it fits: {restaurant.why}</small><div className="restaurant-meta"><span>{restaurant.location}</span><span>{index === 0 ? '4.8' : index === 1 ? '4.6' : '4.7'} ★</span></div></div></article> })}</div></div> }

function Orders({ language, currentOrder, pastOrders, onOpenOrder, onSplitBill }: { language: Language; currentOrder: DiningOrder | null; pastOrders: DiningOrder[]; onOpenOrder: (order: DiningOrder) => void; onSplitBill: (order: DiningOrder) => void }) {
  const text = orderCopy[language]
  return <div className="page page-narrow page-orders">
    <div className="orders-heading"><div><span className="eyebrow"><span className="orange-dot" /> {text.nav}</span><h1>{text.title}</h1><p>{text.subtitle}</p></div><span className="orders-count"><Icon name="receipt" size={17} /> {pastOrders.length + (currentOrder ? 1 : 0)}</span></div>
    <section className="orders-section"><div className="orders-section-heading"><h2>{text.current}</h2>{currentOrder && <span className="status-chip match"><span className="status-dot" /> {text.inProgress}</span>}</div>{currentOrder ? <OrderCard text={text} order={currentOrder} onOpenOrder={onOpenOrder} onSplitBill={onSplitBill} /> : <div className="orders-empty"><Icon name="receipt" size={22} /><span>{text.emptyCurrent}</span></div>}</section>
    <section className="orders-section"><div className="orders-section-heading"><h2>{text.past}</h2><span className="muted-small">{pastOrders.length} {text.items}</span></div><div className="past-order-list">{pastOrders.length ? pastOrders.map((order) => <OrderCard key={order.id} text={text} order={order} onOpenOrder={onOpenOrder} onSplitBill={onSplitBill} />) : <div className="orders-empty"><Icon name="receipt" size={22} /><span>{text.emptyPast}</span></div>}</div></section>
  </div>
}

function OrderCard({ text, order, onOpenOrder, onSplitBill }: { text: OrderCopy; order: DiningOrder; onOpenOrder?: (order: DiningOrder) => void; onSplitBill?: (order: DiningOrder) => void }) {
  const isCurrent = order.status === 'current'
  return <article className={`order-record ${isCurrent ? 'order-record-current' : 'order-record-past'}`}>
    <div className="order-record-top"><span className={`order-restaurant-mark ${order.tone}`}>{order.initials}</span><div className="order-record-restaurant"><div className="order-record-name"><strong>{order.restaurant}</strong><span className={`order-status ${isCurrent ? 'order-status-active' : 'order-status-complete'}`}><span className="status-dot" /> {isCurrent ? text.inProgress : text.completed}</span></div><small>{order.location}</small><span className="order-record-time">{order.time}</span></div><strong className="order-record-total">¥{order.total}</strong></div>
    <div className="order-record-divider" />
    <div className="order-record-summary"><span>{order.itemCount} {text.items}</span><span>{text.total} <strong>¥{order.total}</strong></span></div><p className="order-record-preview">{order.preview}</p>
    {(onOpenOrder && order.cartSnapshot?.length || onSplitBill) && <div className={`order-record-actions ${onOpenOrder && order.cartSnapshot?.length ? '' : 'single'}`}>{onOpenOrder && order.cartSnapshot?.length ? <Button variant="secondary" onClick={() => onOpenOrder(order)} icon="menu">View order</Button> : null}{onSplitBill && <Button className="full-button" onClick={() => onSplitBill(order)} icon="receipt">{text.splitBill}</Button>}</div>}
  </article>
}

function PassportPage({ language, t, passport, updatePassport, onBack }: { language: Language; t: (key: CopyKey) => string; passport: Passport; updatePassport: (key: keyof Passport | string, value: string | boolean | number | null) => void; onBack: () => void }) {
  return <div className="page page-narrow page-profile profile-passport-page">
    <div className="profile-passport-frame">
      <PassportEditor language={language} t={t} passport={passport} updatePassport={updatePassport} onBack={onBack} onFinish={onBack} finishLabel={onboardingCopy[language].saveChanges} finishIcon="check" />
    </div>
  </div>
}

function SavedRestaurantsPage({ restaurants, onToggleRestaurant, onOpenFind, onBack }: { restaurants: SavedRestaurant[]; onToggleRestaurant: (restaurant: SavedRestaurant) => void; onOpenFind: () => void; onBack: () => void }) {
  return <div className="page page-narrow page-profile profile-subpage">
    <PageHeader title="Saved restaurants" kicker="Profile · Find food" onBack={onBack} action={<button type="button" className="icon-button soft" onClick={onOpenFind} aria-label="Open Find food"><Icon name="compass" size={19} /></button>} />
    <div className="subpage-heading"><span className="eyebrow"><span className="orange-dot" /> Find food</span><h1>Places worth coming back to.</h1><p>Your saved restaurants stay here, ready for the next meal.</p></div>
    <div className="subpage-summary"><span><Icon name="bookmark" size={16} /> {restaurants.length} saved {restaurants.length === 1 ? 'restaurant' : 'restaurants'}</span><button type="button" className="text-link" onClick={onOpenFind}>Explore Find food <Icon name="arrow" size={15} /></button></div>
    <div className="saved-restaurant-grid saved-restaurant-grid-full">{restaurants.length ? restaurants.map((restaurant) => <article className="saved-restaurant-card" key={restaurant.id}><div className={`saved-restaurant-photo ${restaurant.tone}`}>{restaurant.emoji}</div><div className="saved-restaurant-body"><div className="saved-restaurant-top"><strong>{restaurant.name}</strong><button type="button" className="saved-restaurant-remove" aria-label={`Remove ${restaurant.name} from saved restaurants`} onClick={() => onToggleRestaurant(restaurant)}><Icon name="close" size={15} /></button></div><span>{restaurant.cuisine}</span><small>{restaurant.location}</small><p className="saved-restaurant-why"><Icon name="shield" size={13} /> {restaurant.why}</p></div></article>) : <div className="profile-empty-card"><Icon name="bookmark" size={21} /><span>No saved restaurants yet.</span></div>}<button type="button" className="profile-explore-card" onClick={onOpenFind}><span className="profile-explore-icon"><Icon name="plus" size={18} /></span><span><strong>Explore Find food</strong><small>Save a restaurant from the feed</small></span><Icon name="arrow" size={17} /></button></div>
  </div>
}

function CompanionsPage({ account, accounts, companions, incomingInvites, outgoingInvites, onAddCompanion, onAcceptInvite, onDeclineInvite, onRemoveCompanion, onOpenCompanion, onBack }: { account: UserProfile; accounts: StoredAccount[]; companions: Companion[]; incomingInvites: CompanionInvite[]; outgoingInvites: CompanionInvite[]; onAddCompanion: (email: string) => CompanionAddResult; onAcceptInvite: (id: string) => void; onDeclineInvite: (id: string) => void; onRemoveCompanion: (id: string) => void; onOpenCompanion: (email: string) => void; onBack: () => void }) {
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
    <PageHeader title="Companions" kicker="Profile · At the table" onBack={onBack} />
    <div className="subpage-heading"><span className="eyebrow"><span className="orange-dot" /> At the table</span><h1>Make the menu work for everyone.</h1><p>Connect a friend’s Food Passport once, then use it whenever you share a table.</p></div>
    <div className="subpage-summary"><span><Icon name="users" size={16} /> {connectedCompanions.length} connected</span><span className="subpage-summary-muted">{incomingInvites.length ? `${incomingInvites.length} invitation${incomingInvites.length === 1 ? '' : 's'} to review` : 'Private food settings stay with each person.'}</span></div>
    {incomingInvites.length > 0 && <section className="companion-inbox"><div className="companion-section-heading"><div><span className="eyebrow"><span className="orange-dot" /> New invitation</span><h2>Someone wants to dine with you.</h2></div><span className="companion-count-badge">{incomingInvites.length}</span></div><div className="companion-inbox-list">{incomingInvites.map((invite) => { const sender = profileForEmail(invite.fromEmail); if (!sender) return null; return <article className="companion-inbox-card" key={invite.id}><span className="companion-avatar companion-avatar-pending">{initialsForProfile(sender)}</span><div className="companion-copy"><strong>{sender.username}</strong><small>{sender.email}</small><p>They want to share their Food Passport connection with you.</p></div><div className="companion-inbox-actions"><Button variant="primary" onClick={() => onAcceptInvite(invite.id)} icon="check">Accept</Button><button type="button" className="text-link companion-decline" onClick={() => onDeclineInvite(invite.id)}>Decline</button></div></article> })}</div></section>}
    {outgoingInvites.length > 0 && <section className="companion-outbox"><div className="companion-section-heading"><div><span className="eyebrow"><span className="orange-dot" /> Waiting for them</span><h2>Invitations you sent</h2></div></div><div className="companion-outbox-list">{outgoingInvites.map((invite) => { const recipient = profileForEmail(invite.toEmail); if (!recipient) return null; return <article className="companion-outbox-card" key={invite.id}><span className="companion-avatar companion-avatar-pending">{initialsForProfile(recipient)}</span><div className="companion-copy"><strong>{recipient.username}</strong><small>{recipient.email}</small></div><span className="companion-status companion-status-pending">Pending</span></article> })}</div></section>}
    <div className="companion-add-card"><div className="companion-add-heading"><span className="profile-setting-icon profile-setting-icon-coral"><Icon name="users" size={20} /></span><div><strong>Add a companion</strong><small>Invite someone who has registered with Bitewise</small></div></div><form className="companion-add-form" onSubmit={(event) => { event.preventDefault(); submitCompanion() }}><input aria-label="Companion email" type="email" value={companionEmail} onChange={(event) => setCompanionEmail(event.target.value)} placeholder="friend@example.com" /><Button type="submit" icon="plus" disabled={!companionEmail.trim()}>Invite</Button></form><p className="companion-add-hint"><Icon name="shield" size={14} /> Only registered accounts can receive an invitation. Their Food Passport stays private until they accept.</p>{companionNotice && <p className={`companion-notice ${companionNotice.includes('valid') || companionNotice.includes('already') || companionNotice.includes('registered') || companionNotice.includes('cannot') ? 'error' : ''}`}>{companionNotice}</p>}</div>
    <div className="companion-list">{connectedCompanions.length ? connectedCompanions.map((companion) => <article className="companion-card" key={companion.id}><span className="companion-avatar companion-avatar-connected">{companion.initials}</span><div className="companion-copy"><div className="companion-name-row"><strong>{companion.name}</strong><span className="companion-status companion-status-connected">Connected</span></div><small>{companion.email}</small><p>{companion.note}</p></div><div className="companion-card-actions"><Button variant="secondary" onClick={() => onOpenCompanion(companion.email)}>View Food Passport</Button></div></article>) : <div className="companion-empty-state"><Icon name="users" size={22} /><strong>No companions yet.</strong><span>Invite a registered user to build a shared table profile.</span></div>}</div>
    {connectedCompanions.length > 0 && <div className="companion-flow-note"><Icon name="check" size={16} /><span>After scanning a menu, choose companions to filter dishes for the whole table.</span></div>}
  </div>
}

function CompanionDetailPage({ companion, onUnlink, onBack }: { companion: Companion; onUnlink: () => void; onBack: () => void }) {
  const passport = companion.passport
  const allergyText = [...passport.allergies, ...(passport.otherAllergen ? [passport.otherAllergen] : [])].join(', ') || 'None shared'
  const dietText = passport.dietStyle !== 'none' ? passport.dietStyle : 'No dietary style shared'
  const avoidText = passport.avoidFoods.length ? passport.avoidFoods.join(', ') : 'No food rules shared'
  const preferenceText = passport.preferences.length ? passport.preferences.join(', ') : 'No everyday preferences shared'
  const crossContactText = Object.values(passport.allergyProfiles).some((profile) => profile.crossContact) || passport.crossContact ? 'Avoid cross-contact' : 'Not specified'
  return <div className="page page-narrow page-profile profile-subpage companion-detail-page">
    <PageHeader title={companion.name} kicker="Companion · Read only" onBack={onBack} />
    <div className="subpage-heading"><span className="eyebrow"><span className="orange-dot" /> Shared Food Passport</span><h1>{companion.name}’s table profile.</h1><p>{companion.email} · You can use these settings to filter a scanned menu, but only {companion.name} can edit them.</p></div>
    <section className="companion-readonly-card"><div className="companion-readonly-heading"><span className="companion-avatar companion-avatar-connected">{companion.initials}</span><div><strong>{companion.name}</strong><small>{companion.note}</small></div><span className="companion-status companion-status-connected">Read only</span></div><div className="readonly-passport-grid"><div className="readonly-passport-row"><span>Allergens</span><strong>{allergyText}</strong></div><div className="readonly-passport-row"><span>Dietary style</span><strong>{dietText}</strong></div><div className="readonly-passport-row"><span>Foods to avoid</span><strong>{avoidText}</strong></div><div className="readonly-passport-row"><span>Everyday preferences</span><strong>{preferenceText}</strong></div><div className="readonly-passport-row"><span>Spice preference</span><strong>{passport.spiceLevel === null ? 'Not set' : `Up to level ${passport.spiceLevel}`}</strong></div><div className="readonly-passport-row"><span>Kitchen safety</span><strong>{crossContactText}</strong></div></div><div className="companion-detail-note"><Icon name="shield" size={16} /><span>This is a read-only view. The account owner remains in control of their Food Passport.</span></div></section>
    <Button variant="danger" className="full-button" onClick={onUnlink} icon="close">Unlink companion</Button>
  </div>
}

function Profile({ t, language, user, passport, restaurants, companions, pendingInviteCount, onOpenSavedRestaurants, onOpenCompanions, onOpenPassport, onLanguageChange, onLogout, onReset }: { t: (key: CopyKey) => string; language: Language; user: UserProfile; passport: Passport; restaurants: SavedRestaurant[]; companions: Companion[]; pendingInviteCount: number; onOpenSavedRestaurants: () => void; onOpenCompanions: () => void; onOpenPassport: () => void; onLanguageChange: (language: Language) => void; onLogout: () => void; onReset: () => void }) {
  const text = accountCopy[language]
  const [languageOpen, setLanguageOpen] = useState(false)
  const passportCount = passport.allergies.length + (passport.otherAllergen ? 1 : 0) + passport.avoidFoods.length + (passport.dietStyle !== 'none' ? 1 : 0)
  const connectedCompanions = companions.length
  return <div className="page page-narrow page-profile profile-dashboard">
    <div className="profile-heading"><div><span className="eyebrow"><span className="orange-dot" /> {text.profileEyebrow}</span><h1>{text.profileTitle}</h1><p className="profile-heading-subtitle">Keep your passport, saved places and table companions in one place.</p></div></div>
    <section className="profile-section profile-section-spaced"><div className="profile-section-label">{text.basicInfo}</div><div className="profile-info-row"><span className="profile-info-icon"><Icon name="user" size={19} /></span><div><strong>{user.username}</strong><small>{user.email}</small></div></div></section>
    <section className="profile-section"><div className="profile-section-label">Your food profile</div><div className="profile-entry-list"><button className="profile-setting-card profile-passport-entry" onClick={onOpenPassport}><span className="profile-setting-icon profile-setting-icon-green"><Icon name="shield" size={21} /></span><span className="profile-setting-copy"><strong>{text.foodPassportTitle}</strong><small>{text.foodPassportDesc}</small></span><span className="profile-setting-meta">{passportCount}<small>{text.passportSummary}</small></span><Icon name="arrow" size={18} /></button><button className="profile-setting-card profile-entry-card" onClick={onOpenCompanions}><span className="profile-setting-icon profile-setting-icon-green"><Icon name="users" size={20} /></span><span className="profile-setting-copy"><strong>My companions</strong><small>Shared Food Passports for the table</small></span><span className="profile-setting-meta">{connectedCompanions}<small>{pendingInviteCount ? `${pendingInviteCount} new` : 'connected'}</small></span>{pendingInviteCount > 0 && <span className="profile-entry-alert"><Icon name="alert" size={14} /> {pendingInviteCount}</span>}<Icon name="arrow" size={18} /></button></div></section>
    <section className="profile-section"><div className="profile-section-label">Your table toolkit</div><div className="profile-entry-list"><button className="profile-setting-card profile-entry-card" onClick={onOpenSavedRestaurants}><span className="profile-setting-icon profile-setting-icon-coral"><Icon name="bookmark" size={20} /></span><span className="profile-setting-copy"><strong>Saved restaurants</strong><small>Places you want to try next</small></span><span className="profile-setting-meta">{restaurants.length}<small>saved</small></span><Icon name="arrow" size={18} /></button></div></section>
    <section className="profile-section"><div className="profile-section-label">{text.otherSettings}</div>
      <button className="profile-setting-card" onClick={() => setLanguageOpen((open) => !open)}><span className="profile-setting-icon"><Icon name="compass" size={20} /></span><span className="profile-setting-copy"><strong>{text.languagePreference}</strong><small>{text.languagePreferenceDesc}</small></span><span className="profile-language-value">{language.toUpperCase()}</span><Icon name="chevron" size={17} /></button>
      {languageOpen && <div className="profile-language-panel"><div className="language-select-grid">{languages.map((item) => <button key={item.code} className={language === item.code ? 'active' : ''} onClick={() => { onLanguageChange(item.code); setLanguageOpen(false) }}><strong>{item.label}</strong><span>{item.native}</span></button>)}</div></div>}
      <button className="profile-setting-card" onClick={onLogout}><span className="profile-setting-icon"><Icon name="back" size={20} /></span><span className="profile-setting-copy"><strong>{text.signOut}</strong><small>{text.signOutDesc}</small></span><Icon name="arrow" size={18} /></button>
      <button className="profile-setting-card profile-danger-row" onClick={onReset}><span className="profile-setting-icon"><Icon name="refresh" size={20} /></span><span className="profile-setting-copy"><strong>{text.resetDemo}</strong><small>{text.resetDemoDesc}</small></span><Icon name="arrow" size={18} /></button>
    </section>
  </div>
}

function BottomNav({ language, screen, openScreen, t }: { language: Language; screen: Screen; openScreen: (screen: Screen) => void; t: (key: CopyKey) => string }) { return <nav className="bottom-nav"><button className={screen === 'home' ? 'active' : ''} onClick={() => openScreen('home')}><Icon name="home" size={19} /><span>{t('home')}</span></button><button className={screen === 'find' ? 'active' : ''} onClick={() => openScreen('find')}><Icon name="compass" size={19} /><span>{t('findFood')}</span></button><button className={screen === 'orders' ? 'active' : ''} onClick={() => openScreen('orders')}><Icon name="receipt" size={19} /><span>{orderCopy[language].nav}</span></button><button className={screen === 'profile' || screen === 'passport' || screen === 'savedRestaurants' || screen === 'companions' || screen === 'companionDetail' ? 'active' : ''} onClick={() => openScreen('profile')}><Icon name="user" size={19} /><span>{t('foodPassport')}</span></button></nav> }

export default App
