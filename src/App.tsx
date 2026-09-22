import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode, RefObject } from 'react'
import * as React from 'react'

type Language = 'en' | 'ko' | 'ja' | 'ru' | 'es' | 'it'
type Screen = 'home' | 'scan' | 'menu' | 'detail' | 'assistant' | 'order' | 'waiter' | 'bill' | 'find' | 'profile'
type Status = 'MATCH' | 'WARNING' | 'CONFLICT' | 'UNKNOWN'
type Filter = 'all' | 'forMe' | 'vegetarian' | 'notSpicy'
type BillMode = 'equal' | 'item' | 'mixed'

type Passport = {
  allergies: string[]
  diets: string[]
  preferences: string[]
  severity: 'mild' | 'moderate' | 'severe'
  crossContact: boolean
}

type Dish = {
  id: string
  name: string
  zh: string
  localized: Record<Language, string>
  price: number
  emoji: string
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
  hasCilantro?: boolean
  confidence: number
  taste: string
  texture: string
  cooking: string
  bestWith: string
  culture: string
  reason: string
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
    scanSubTitle: 'Hold steady so dish names and ingredient notes stay readable.',
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
    mixed: 'Mixed Mode',
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
    hello: '여행자님, 안녕하세요', subtitle: '메뉴를 이해하고, 나에게 맞는 음식을 알고, 자신 있게 주문하세요.', scanMenu: '메뉴 스캔', scanSub: '중국어 메뉴를 이해해요.', foodPassport: '푸드 패스포트', anything: '먹을 수 없는 음식이 있나요?', splitBill: '계산서 나누기', findFood: '음식 찾기', recentSession: '현재 식사 세션', menuReady: '메뉴를 살펴볼 준비가 됐어요', dishes: '가지 메뉴', openSession: '세션 열기', home: '홈', profile: '프로필', menu: '메뉴', scan: '스캔', passport: '패스포트', next: '계속', save: '저장하고 메뉴 스캔', selectLanguage: '언어를 선택하세요', languageSub: '앱과 메뉴 설명에 사용할 언어입니다. 직원에게 보여주는 문장은 중국어로 유지됩니다.', avoid: '주의할 음식은 무엇인가요?', passportSub: '가능한 충돌을 알려드리는 데만 사용합니다. 언제든 바꿀 수 있어요.', allergies: '알레르기', diet: '식단 제한', preferences: '일상 선호', severe: '심각', moderate: '보통', mild: '가벼움', noAllergens: '아직 알레르기를 추가하지 않았어요', scanTitle: '메뉴 전체를 화면 안에 맞춰주세요', scanSubTitle: '메뉴 이름과 재료가 선명하게 보이도록 고정하세요.', capture: '메뉴 촬영', upload: '사진 업로드', sampleMenu: '샘플 메뉴 사용', avoidGlare: '빛 반사 피하기', keepFlat: '평평하게', everyPage: '모든 페이지', analyzing: '메뉴를 읽는 중…', analysisSub: '이름, 가격, 푸드 패스포트를 연결하고 있어요', menuResults: '메뉴 결과', checking: '푸드 패스포트와 메뉴를 확인하는 중', all: '전체', forMe: '나에게 맞는 메뉴', vegetarian: '채식', notSpicy: '맵지 않게', viewDetails: '상세 보기', mainIngredients: '주요 재료', taste: '맛', texture: '식감', cooking: '조리법', bestWith: '함께 먹기', culturalNote: '문화 메모', illustrative: '참고용 이미지 · 알레르기 판단에 사용하지 않습니다', askRestaurant: '식당에 확인하기', whySeeing: '이 상태인 이유', noConflict: '현재 선호와 충돌 없음', possibleConflict: '식당에 확인해 주세요', confirmedConflict: '선택한 식단과 맞지 않아요', unable: '이 메뉴를 확실히 인식하지 못했어요', detailsUnknown: '재료를 확정할 근거가 메뉴에 충분하지 않습니다.', detailsConflict: '푸드 패스포트와 충돌하는 재료가 포함되었거나 포함될 수 있습니다.', detailsMatch: '현재 메뉴 정보에서 충돌을 찾지 못했습니다. 알레르기 안전을 보장하지는 않습니다.', askTitle: '식당에 보여주세요', askWarning: '심각한 알레르기', playChinese: '중국어 재생', copyQuestion: '질문 복사', assistant: '다이닝 어시스턴트', helpOrder: '주문 도와줘', planTitle: '테이블을 계획해요', planSub: '식당, 메뉴, 푸드 패스포트를 알고 있어요. 이번 식사에 필요한 것만 알려주세요.', people: '몇 명인가요?', budget: '총 예산', temporary: '이번 식사 선호', planMeal: '식사 계획하기', tablePlan: '테이블 플랜', ruleChecked: '규칙 검증 완료. 모든 메뉴와 가격을 다시 확인했습니다.', total: '합계', edit: '편집', regenerate: '다시 추천', orderThese: '이대로 주문', orderSaved: '이 테이블에 주문을 저장했어요', showWaiter: '직원에게 보여주기', specialRequest: '특별 요청 · 给餐厅', waiterText: '모든 요리를 채식으로 만들고 고수를 넣지 말아 주세요. 확인할 수 없는 재료가 있다면 먼저 알려 주세요.', waiterSub: '직원이 바로 이해할 수 있도록 중국어 요청을 먼저 보여줍니다.', play: '중국어 재생', atTable: '테이블에서', currentOrder: '현재 테이블에 있어요', questions: ['이건 무엇인가요?', '어떻게 먹나요?', '소스는 무엇인가요?', '매운가요?'], askAbout: '이 테이블의 음식 질문하기', answerFrom: '현재 메뉴와 확정된 주문으로 답변합니다', mustEscalate: '모든 소스와 주방 교차 접촉을 메뉴만으로 확인할 수 없습니다. 알레르기가 중요하다면 식당에 물어보세요.', billTitle: '계산서 나누기', billSub: '모든 금액이 원래 CNY 합계와 일치해야 합니다.', scanReceipt: '영수증 스캔', useReceipt: '샘플 영수증 사용', equal: '균등 분할', byItem: '메뉴별', mixed: '혼합', participants: '참여자', billItems: '계산서 항목', share: '결과 공유', verified: '검증된 합계', mismatch: '합계를 맞출 수 없습니다. 강조된 항목을 확인하세요.', findTitle: '나에게 맞는 음식 찾기', findSub: '식당 평점보다 의도에서 시작하세요.', nearby: '내 주변', whyFits: '맞는 이유', profileTitle: '푸드 패스포트', profileSub: '중요한 제한은 직접 관리합니다. 과거 기록으로 알레르기를 추측하지 않습니다.', language: '언어', crossContact: '교차 접촉 피하기', reset: '데모 데이터 초기화', disclaimer: 'CanIEatThis는 메뉴 정보와 사용자의 입력을 바탕으로 판단을 돕습니다. 심각한 알레르기는 식당에 반드시 확인하세요.', matchLabel: '충돌 없음', warningLabel: '확인 필요', conflictLabel: '충돌', unknownLabel: '알 수 없음',
  },
  ja: {
    hello: 'こんにちは、旅人さん', subtitle: '料理を理解し、自分に合うか知って、自信を持って注文しましょう。', scanMenu: 'メニューをスキャン', scanSub: '中国語メニューを理解できます。', foodPassport: 'フードパスポート', anything: '食べられないものはありますか？', splitBill: '割り勘する', findFood: '料理を探す', recentSession: '現在の食事セッション', menuReady: 'メニューを見る準備ができました', dishes: '品', openSession: 'セッションを開く', home: 'ホーム', profile: 'プロフィール', menu: 'メニュー', scan: 'スキャン', passport: 'パスポート', next: '続ける', save: '保存してメニューをスキャン', selectLanguage: '言語を選択', languageSub: 'アプリと料理説明の言語です。スタッフへのメッセージは中国語のままです。', avoid: '避けたいものはありますか？', passportSub: '可能性のある衝突を示すためだけに使います。いつでも変更できます。', allergies: 'アレルギー', diet: '食事制限', preferences: '好み', severe: '重度', moderate: '中程度', mild: '軽度', noAllergens: 'アレルギーはまだありません', scanTitle: 'メニュー全体を画面に収めて', scanSubTitle: '料理名と食材が読めるようにしっかり構えてください。', capture: 'メニューを撮影', upload: '写真をアップロード', sampleMenu: 'サンプルメニューを使う', avoidGlare: '反射を避ける', keepFlat: '平らにする', everyPage: '全ページ', analyzing: 'メニューを読み取り中…', analysisSub: '料理名、価格、パスポート情報を結びつけています', menuResults: 'メニュー結果', checking: 'フードパスポートとメニューを確認中', all: 'すべて', forMe: '自分向け', vegetarian: 'ベジタリアン', notSpicy: '辛くない', viewDetails: '料理の詳細', mainIngredients: '主な食材', taste: '味', texture: '食感', cooking: '調理法', bestWith: 'おすすめの組み合わせ', culturalNote: '文化メモ', illustrative: '参考画像のみ · アレルギー判断には使いません', askRestaurant: 'お店に確認する', whySeeing: 'この状態の理由', noConflict: '好みとの衝突なし', possibleConflict: 'お店に確認してください', confirmedConflict: '選択した食事制限に合いません', unable: '料理を確実に認識できませんでした', detailsUnknown: '食材を確定する情報がメニューに足りません。', detailsConflict: 'フードパスポートと衝突する食材が含まれる、または可能性があります。', detailsMatch: '利用できるメニュー情報から衝突は見つかりませんでした。安全を保証するものではありません。', askTitle: 'お店に見せる', askWarning: '重度のアレルギー', playChinese: '中国語を再生', copyQuestion: '質問をコピー', assistant: 'ダイニングアシスタント', helpOrder: '注文を手伝って', planTitle: 'テーブルを計画しましょう', planSub: 'お店、メニュー、パスポートは把握しています。今回必要な情報だけ入力してください。', people: '何人ですか？', budget: '合計予算', temporary: '今回の好み', planMeal: '食事を計画', tablePlan: 'テーブルプラン', ruleChecked: 'ルール検証済み。メニューと価格を確認しました。', total: '合計', edit: '編集', regenerate: '再生成', orderThese: 'これを注文', orderSaved: 'テーブルに注文を保存しました', showWaiter: 'スタッフに見せる', specialRequest: '特別な要望 · 给餐厅', waiterText: 'すべての料理をベジタリアンにし、パクチーを入れないでください。確認できない場合は先に教えてください。', waiterSub: 'スタッフがすぐ行動できるよう、中国語の要望を先に表示します。', play: '中国語を再生', atTable: 'テーブルで', currentOrder: '現在テーブルにあります', questions: ['これは何ですか？', 'どう食べますか？', 'ソースは何ですか？', 'とても辛いですか？'], askAbout: 'テーブルの料理について質問', answerFrom: 'このメニューと確定した注文から回答します', mustEscalate: 'すべてのソースや厨房の交差接触はメニューだけでは確認できません。アレルギーに関わる場合はお店に確認してください。', billTitle: '割り勘', billSub: 'すべての金額を元のCNY合計に合わせます。', scanReceipt: 'レシートをスキャン', useReceipt: 'サンプルレシートを使う', equal: '均等割り', byItem: '品目ごと', mixed: '混合', participants: '参加者', billItems: '明細', share: '結果を共有', verified: '確認済み合計', mismatch: '合計が一致しません。強調された項目を確認してください。', findTitle: '自分に合う料理を探す', findSub: 'お店の評価ではなく、目的から始めましょう。', nearby: '近く', whyFits: '合う理由', profileTitle: 'フードパスポート', profileSub: '重要な制限は自分で管理します。履歴からアレルギーを推測しません。', language: '言語', crossContact: '交差接触を避ける', reset: 'デモデータをリセット', disclaimer: 'CanIEatThisはメニュー情報と入力内容から判断を支援します。重度のアレルギーは必ずお店に確認してください。', matchLabel: '衝突なし', warningLabel: '要確認', conflictLabel: '衝突', unknownLabel: '不明',
  },
  ru: {
    hello: 'Здравствуйте, путешественник', subtitle: 'Поймите блюдо, узнайте, подходит ли оно вам, и заказывайте уверенно.', scanMenu: 'Сканировать меню', scanSub: 'Поймите любое китайское меню.', foodPassport: 'Пищевой паспорт', anything: 'Есть ли продукты, которые вы не едите?', splitBill: 'Разделить счёт', findFood: 'Найти еду', recentSession: 'Текущая сессия', menuReady: 'Меню готово к изучению', dishes: 'блюд', openSession: 'Открыть сессию', home: 'Главная', profile: 'Профиль', menu: 'Меню', scan: 'Скан', passport: 'Паспорт', next: 'Продолжить', save: 'Сохранить и сканировать', selectLanguage: 'Выберите язык', languageSub: 'Язык приложения и описаний блюд. Сообщения для персонала остаются на китайском.', avoid: 'Что нужно учитывать?', passportSub: 'Используем только для предупреждений о возможных конфликтах. Можно изменить в любое время.', allergies: 'Аллергены', diet: 'Ограничения питания', preferences: 'Предпочтения', severe: 'Сильная', moderate: 'Средняя', mild: 'Лёгкая', noAllergens: 'Аллергены пока не добавлены', scanTitle: 'Поместите всё меню в кадр', scanSubTitle: 'Держите телефон ровно, чтобы названия и ингредиенты были читаемы.', capture: 'Снять меню', upload: 'Загрузить фото', sampleMenu: 'Использовать пример', avoidGlare: 'Без бликов', keepFlat: 'Ровно', everyPage: 'Все страницы', analyzing: 'Читаем меню…', analysisSub: 'Связываем блюда, цены и ваш пищевой паспорт', menuResults: 'Результаты меню', checking: 'Проверяем меню по вашему пищевому паспорту', all: 'Все', forMe: 'Для меня', vegetarian: 'Вегетарианское', notSpicy: 'Не острое', viewDetails: 'Подробнее', mainIngredients: 'Основные ингредиенты', taste: 'Вкус', texture: 'Текстура', cooking: 'Приготовление', bestWith: 'Лучше с', culturalNote: 'Культурная заметка', illustrative: 'Только иллюстрация · фото не определяет аллергены', askRestaurant: 'Спросить ресторан', whySeeing: 'Почему вы это видите', noConflict: 'Конфликтов не найдено', possibleConflict: 'Уточните в ресторане', confirmedConflict: 'Не подходит выбранной диете', unable: 'Не удалось надёжно определить блюдо', detailsUnknown: 'В меню недостаточно данных для уверенного решения об ингредиентах.', detailsConflict: 'Блюдо содержит или может содержать ингредиент, конфликтующий с паспортом.', detailsMatch: 'В доступных данных меню конфликтов нет. Это не гарантия безопасности.', askTitle: 'Покажите это ресторану', askWarning: 'При сильной аллергии', playChinese: 'Воспроизвести на китайском', copyQuestion: 'Скопировать вопрос', assistant: 'Помощник по ужину', helpOrder: 'Помогите заказать', planTitle: 'Составим стол', planSub: 'Я знаю ресторан, меню и ваш паспорт. Укажите только то, чего не хватает для этого ужина.', people: 'Сколько человек?', budget: 'Общий бюджет', temporary: 'Предпочтения на этот раз', planMeal: 'Спланировать ужин', tablePlan: 'План стола', ruleChecked: 'Проверено правилами. Все блюда и цены есть в меню.', total: 'Итого', edit: 'Изменить', regenerate: 'Сгенерировать ещё', orderThese: 'Заказать это', orderSaved: 'Заказ сохранён для этого стола', showWaiter: 'Показать официанту', specialRequest: 'Особая просьба · 给餐厅', waiterText: 'Пожалуйста, приготовьте все блюда без мяса и морепродуктов и не добавляйте кинзу. Если состав нельзя подтвердить, сначала сообщите нам.', waiterSub: 'Сначала показываем китайскую просьбу, чтобы персонал понял её сразу.', play: 'Воспроизвести китайский', atTable: 'За столом', currentOrder: 'сейчас на вашем столе', questions: ['Что это?', 'Как это есть?', 'Что в соусе?', 'Очень остро?'], askAbout: 'Спросить о блюдах на столе', answerFrom: 'Ответ на основе меню и подтверждённого заказа', mustEscalate: 'Меню не подтверждает каждый соус и перекрёстный контакт на кухне. Для аллергии уточните это у ресторана.', billTitle: 'Разделить счёт', billSub: 'Все суммы должны совпасть с исходным счётом в CNY.', scanReceipt: 'Сканировать чек', useReceipt: 'Использовать пример чека', equal: 'Поровну', byItem: 'По блюдам', mixed: 'Смешанный', participants: 'Участники', billItems: 'Позиции счёта', share: 'Поделиться', verified: 'Проверенная сумма', mismatch: 'Не удалось сопоставить итог. Проверьте выделенные позиции.', findTitle: 'Найдите подходящую еду', findSub: 'Начните с намерения, а не с рейтинга ресторана.', nearby: 'Рядом', whyFits: 'Почему подходит', profileTitle: 'Ваш пищевой паспорт', profileSub: 'Важные ограничения задаёте вы. Мы не выводим аллергию из истории.', language: 'Язык', crossContact: 'Избегать перекрёстного контакта', reset: 'Сбросить демо-данные', disclaimer: 'CanIEatThis помогает принять решение на основе меню и ввода пользователя. При серьёзной аллергии всегда уточняйте у ресторана.', matchLabel: 'Без конфликта', warningLabel: 'Нужно уточнить', conflictLabel: 'Конфликт', unknownLabel: 'Неизвестно',
  },
  es: {
    hello: 'Hola, viajero', subtitle: 'Entiende el plato, descubre si encaja contigo y pide con confianza.', scanMenu: 'Escanear menú', scanSub: 'Entiende cualquier menú chino.', foodPassport: 'Pasaporte de comida', anything: '¿Hay algo que no puedas comer?', splitBill: 'Dividir la cuenta', findFood: 'Buscar comida', recentSession: 'Sesión actual', menuReady: 'Menú listo para explorar', dishes: 'platos', openSession: 'Abrir sesión', home: 'Inicio', profile: 'Perfil', menu: 'Menú', scan: 'Escanear', passport: 'Pasaporte', next: 'Continuar', save: 'Guardar y escanear menú', selectLanguage: 'Elige tu idioma', languageSub: 'Controla la app y las explicaciones. Los mensajes para el personal permanecen en chino.', avoid: '¿Qué debemos vigilar?', passportSub: 'Solo lo usamos para señalar posibles conflictos. Puedes cambiarlo cuando quieras.', allergies: 'Alérgenos', diet: 'Restricciones', preferences: 'Preferencias', severe: 'Grave', moderate: 'Moderada', mild: 'Leve', noAllergens: 'Aún no has añadido alérgenos', scanTitle: 'Encuadra todo el menú', scanSubTitle: 'Mantén el móvil estable para que nombres e ingredientes se lean bien.', capture: 'Capturar menú', upload: 'Subir una foto', sampleMenu: 'Usar menú de ejemplo', avoidGlare: 'Evita reflejos', keepFlat: 'Mantén plano', everyPage: 'Cada página', analyzing: 'Leyendo tu menú…', analysisSub: 'Relacionando platos, precios y tu pasaporte', menuResults: 'Resultados del menú', checking: 'Comprobando el menú con tu pasaporte', all: 'Todo', forMe: 'Para mí', vegetarian: 'Vegetariano', notSpicy: 'Sin picante', viewDetails: 'Ver detalles', mainIngredients: 'Ingredientes principales', taste: 'Sabor', texture: 'Textura', cooking: 'Cocción', bestWith: 'Combina con', culturalNote: 'Nota cultural', illustrative: 'Solo ilustrativo · las fotos no determinan alérgenos', askRestaurant: 'Preguntar al restaurante', whySeeing: 'Por qué aparece esto', noConflict: 'Sin conflicto encontrado', possibleConflict: 'Confirma con el restaurante', confirmedConflict: 'No encaja con tu dieta', unable: 'No pudimos identificar este plato con fiabilidad', detailsUnknown: 'El menú no aporta pruebas suficientes para decidir los ingredientes.', detailsConflict: 'Contiene o puede contener un ingrediente que entra en conflicto con tu pasaporte.', detailsMatch: 'No hay conflicto en la información disponible. No es una garantía de seguridad.', askTitle: 'Muéstralo al restaurante', askWarning: 'Para una alergia grave', playChinese: 'Reproducir en chino', copyQuestion: 'Copiar pregunta', assistant: 'Asistente de mesa', helpOrder: 'Ayúdame a pedir', planTitle: 'Planifiquemos la mesa', planSub: 'Ya conozco el restaurante, el menú y tu pasaporte. Completa solo lo que falta para esta comida.', people: '¿Cuántas personas?', budget: 'Presupuesto total', temporary: 'Preferencias temporales', planMeal: 'Planificar comida', tablePlan: 'Plan de mesa', ruleChecked: 'Verificado por reglas. Todos los platos y precios existen en este menú.', total: 'Total', edit: 'Editar', regenerate: 'Regenerar', orderThese: 'Pedir esto', orderSaved: 'Pedido guardado para esta mesa', showWaiter: 'Mostrar al camarero', specialRequest: 'Solicitud especial · 给餐厅', waiterText: 'Por favor, preparen todos los platos vegetarianos y no añadan cilantro. Avísennos primero si no pueden confirmar algún ingrediente.', waiterSub: 'Mostramos primero el mensaje en chino para que el personal actúe rápido.', play: 'Reproducir chino', atTable: 'En la mesa', currentOrder: 'ahora en tu mesa', questions: ['¿Qué es esto?', '¿Cómo se come?', '¿Qué lleva la salsa?', '¿Pica mucho?'], askAbout: 'Preguntar por los platos de esta mesa', answerFrom: 'Respuesta basada en este menú y tu pedido confirmado', mustEscalate: 'El menú no confirma todas las salsas ni el contacto cruzado en cocina. Pregunta al restaurante si es importante para una alergia.', billTitle: 'Dividir la cuenta', billSub: 'Cada importe debe coincidir con el total original en CNY.', scanReceipt: 'Escanear recibo', useReceipt: 'Usar recibo de ejemplo', equal: 'A partes iguales', byItem: 'Por plato', mixed: 'Mixto', participants: 'Participantes', billItems: 'Elementos de la cuenta', share: 'Compartir resultado', verified: 'Total verificado', mismatch: 'No pudimos cuadrar el total. Revisa los elementos destacados.', findTitle: 'Encuentra comida que encaje', findSub: 'Empieza por tu intención, no por la valoración.', nearby: 'Cerca de ti', whyFits: 'Por qué encaja', profileTitle: 'Tu pasaporte de comida', profileSub: 'Tú controlas las restricciones importantes. Nunca inferimos alergias del historial.', language: 'Idioma', crossContact: 'Evitar contacto cruzado', reset: 'Restablecer demo', disclaimer: 'CanIEatThis ayuda a decidir con la información del menú y tus datos. Para alergias graves, confirma siempre con el restaurante.', matchLabel: 'Sin conflicto', warningLabel: 'Necesita confirmación', conflictLabel: 'Conflicto', unknownLabel: 'Desconocido',
  },
  it: {
    hello: 'Ciao, viaggiatore', subtitle: 'Capisci il piatto, scopri cosa fa per te e ordina con fiducia.', scanMenu: 'Scansiona il menu', scanSub: 'Capisci qualsiasi menu cinese.', foodPassport: 'Food Passport', anything: 'C’è qualcosa che non puoi mangiare?', splitBill: 'Dividi il conto', findFood: 'Trova cibo', recentSession: 'Sessione attuale', menuReady: 'Menu pronto da esplorare', dishes: 'piatti', openSession: 'Apri sessione', home: 'Home', profile: 'Profilo', menu: 'Menu', scan: 'Scansiona', passport: 'Passport', next: 'Continua', save: 'Salva e scansiona un menu', selectLanguage: 'Scegli la lingua', languageSub: 'Controlla app e spiegazioni dei piatti. I messaggi per il personale restano in cinese.', avoid: 'Cosa dobbiamo controllare?', passportSub: 'Lo usiamo solo per segnalare possibili conflitti. Puoi cambiarlo quando vuoi.', allergies: 'Allergeni', diet: 'Restrizioni alimentari', preferences: 'Preferenze', severe: 'Grave', moderate: 'Moderata', mild: 'Lieve', noAllergens: 'Nessun allergene aggiunto', scanTitle: 'Inquadra tutto il menu', scanSubTitle: 'Tieni fermo il telefono per mantenere leggibili nomi e ingredienti.', capture: 'Acquisisci menu', upload: 'Carica una foto', sampleMenu: 'Usa menu di esempio', avoidGlare: 'Evita riflessi', keepFlat: 'Tieni piatto', everyPage: 'Ogni pagina', analyzing: 'Leggiamo il menu…', analysisSub: 'Colleghiamo piatti, prezzi e Food Passport', menuResults: 'Risultati del menu', checking: 'Controlliamo il menu con il tuo passport', all: 'Tutti', forMe: 'Per me', vegetarian: 'Vegetariano', notSpicy: 'Non piccante', viewDetails: 'Vedi dettagli', mainIngredients: 'Ingredienti principali', taste: 'Gusto', texture: 'Consistenza', cooking: 'Cottura', bestWith: 'Da gustare con', culturalNote: 'Nota culturale', illustrative: 'Solo illustrativo · le foto non determinano gli allergeni', askRestaurant: 'Chiedi al ristorante', whySeeing: 'Perché lo vedi', noConflict: 'Nessun conflitto trovato', possibleConflict: 'Verifica al ristorante', confirmedConflict: 'Non adatto alla dieta scelta', unable: 'Non abbiamo identificato il piatto con certezza', detailsUnknown: 'Il menu non offre prove sufficienti per decidere gli ingredienti.', detailsConflict: 'Contiene o potrebbe contenere un ingrediente in conflitto con il tuo passport.', detailsMatch: 'Nessun conflitto nei dati disponibili. Non è una garanzia di sicurezza.', askTitle: 'Mostralo al ristorante', askWarning: 'Per allergia grave', playChinese: 'Riproduci in cinese', copyQuestion: 'Copia domanda', assistant: 'Assistente a tavola', helpOrder: 'Aiutami a ordinare', planTitle: 'Pianifichiamo il tavolo', planSub: 'Conosco ristorante, menu e passport. Inserisci solo ciò che manca per questo pasto.', people: 'Quante persone?', budget: 'Budget totale', temporary: 'Preferenze temporanee', planMeal: 'Pianifica il pasto', tablePlan: 'Piano del tavolo', ruleChecked: 'Verificato dalle regole. Piatti e prezzi sono presenti nel menu.', total: 'Totale', edit: 'Modifica', regenerate: 'Rigenera', orderThese: 'Ordina questi', orderSaved: 'Ordine salvato per questo tavolo', showWaiter: 'Mostra al cameriere', specialRequest: 'Richiesta speciale · 给餐厅', waiterText: 'Preparate tutti i piatti vegetariani e non aggiungete coriandolo. Avvisateci prima se qualche ingrediente non può essere confermato.', waiterSub: 'Mostriamo prima la richiesta in cinese per aiutare il personale.', play: 'Riproduci cinese', atTable: 'A tavola', currentOrder: 'ora sul tuo tavolo', questions: ['Cos’è questo?', 'Come si mangia?', 'Cosa c’è nella salsa?', 'È molto piccante?'], askAbout: 'Chiedi dei piatti sul tavolo', answerFrom: 'Risposta basata su questo menu e sull’ordine confermato', mustEscalate: 'Il menu non conferma ogni salsa né il contatto crociato in cucina. Chiedi al ristorante se è importante per un’allergia.', billTitle: 'Dividi il conto', billSub: 'Ogni importo deve corrispondere al totale originale in CNY.', scanReceipt: 'Scansiona ricevuta', useReceipt: 'Usa ricevuta di esempio', equal: 'In parti uguali', byItem: 'Per piatto', mixed: 'Misto', participants: 'Partecipanti', billItems: 'Voci del conto', share: 'Condividi risultato', verified: 'Totale verificato', mismatch: 'Non abbiamo potuto verificare il totale. Controlla le voci evidenziate.', findTitle: 'Trova cibo adatto a te', findSub: 'Parti dall’intento, non dalla valutazione.', nearby: 'Vicino a te', whyFits: 'Perché fa per te', profileTitle: 'Il tuo Food Passport', profileSub: 'Gestisci tu le restrizioni importanti. Non deduciamo allergie dalla cronologia.', language: 'Lingua', crossContact: 'Evita il contatto crociato', reset: 'Reimposta demo', disclaimer: 'CanIEatThis aiuta a decidere usando il menu e i dati inseriti. Per allergie gravi, verifica sempre con il ristorante.', matchLabel: 'Nessun conflitto', warningLabel: 'Da confermare', conflictLabel: 'Conflitto', unknownLabel: 'Sconosciuto',
  },
} as const

type CopyKey = { [Key in keyof typeof copy.en]: (typeof copy.en)[Key] extends string ? Key : never }[keyof typeof copy.en]
const tFor = (language: Language, key: CopyKey): string => copy[language][key] as string

const dishes: Dish[] = [
  { id: 'kung-pao', name: 'Kung Pao Chicken', zh: '宫保鸡丁', localized: { en: 'Kung Pao Chicken', ko: '궁보계정', ja: '宮保鶏丁', ru: 'Курица гунбао', es: 'Pollo kung pao', it: 'Pollo kung pao' }, price: 38, emoji: '🥜', className: 'visual-kungpao', ingredients: ['Chicken', 'Peanuts', 'Dried chilies', 'Scallions'], zhIngredients: ['鸡肉', '花生', '干辣椒', '葱'], allergens: ['peanut'], possibleAllergens: ['soy'], tags: ['Chicken', 'Peanut', 'Dried chili'], spicy: 2, vegetarian: false, vegan: false, hasPork: false, hasCilantro: false, confidence: 0.98, taste: 'Sweet, savory, tangy and mildly numbing', texture: 'Tender chicken with crunchy peanuts', cooking: 'Quickly stir-fried over high heat', bestWith: 'Shared with rice and other dishes', culture: 'Kung Pao Chicken is a Sichuan stir-fry named after a historical official. Peanuts are normally part of the dish, not just a garnish.', reason: 'Peanuts are common in this dish, but this menu does not provide a complete ingredient list.' },
  { id: 'mapo-tofu', name: 'Mapo Tofu', zh: '麻婆豆腐', localized: { en: 'Mapo Tofu', ko: '마파두부', ja: '麻婆豆腐', ru: 'Мапо тофу', es: 'Tofu mapo', it: 'Tofu mapo' }, price: 28, emoji: '🌶️', className: 'visual-mapo', ingredients: ['Tofu', 'Chili bean paste', 'Minced pork', 'Sichuan pepper'], zhIngredients: ['豆腐', '豆瓣酱', '猪肉末', '花椒'], allergens: ['soy'], possibleAllergens: ['sesame'], tags: ['Tofu', 'Chili bean paste', 'Minced pork'], spicy: 3, vegetarian: false, vegan: false, hasPork: true, hasCilantro: false, confidence: 0.91, taste: 'Spicy, savory and numbing', texture: 'Soft tofu with aromatic sauce', cooking: 'Simmered in a chili-bean sauce', bestWith: 'Steamed rice and greens', culture: '“Mapo” refers to the pockmarked grandmother credited with creating this beloved Sichuan dish.', reason: 'The base recipe commonly includes minced pork and the menu does not mark this version vegetarian.' },
  { id: 'eggplant', name: 'Fish-fragrant Eggplant', zh: '鱼香茄子', localized: { en: 'Fish-fragrant Eggplant', ko: '어향 가지', ja: '魚香茄子', ru: 'Баклажаны в стиле юйсян', es: 'Berenjena yuxiang', it: 'Melanzane yuxiang' }, price: 42, emoji: '🍆', className: 'visual-eggplant', ingredients: ['Eggplant', 'Garlic', 'Pickled chili', 'Vinegar'], zhIngredients: ['茄子', '蒜', '泡椒', '醋'], allergens: [], possibleAllergens: ['soy'], tags: ['Vegetarian', 'Garlic', 'Sichuan'], spicy: 1, vegetarian: true, vegan: true, hasPork: false, hasCilantro: false, confidence: 0.95, taste: 'Sweet-sour, garlicky and gently spicy', texture: 'Silky eggplant with a glossy sauce', cooking: 'Braised until tender', bestWith: 'Rice and a crisp green dish', culture: '“Fish-fragrant” describes a Sichuan seasoning style; it does not necessarily mean the dish contains fish.', reason: 'This menu labels the version vegetarian, but sauce and kitchen cross-contact still need confirmation for allergies.' },
  { id: 'greens', name: 'Garlic Seasonal Greens', zh: '蒜蓉时蔬', localized: { en: 'Garlic Seasonal Greens', ko: '마늘 제철 채소', ja: '季節野菜のにんにく炒め', ru: 'Сезонные овощи с чесноком', es: 'Verduras de temporada al ajo', it: 'Verdure stagionali all’aglio' }, price: 28, emoji: '🥬', className: 'visual-greens', ingredients: ['Seasonal greens', 'Garlic', 'Cooking oil'], zhIngredients: ['时蔬', '蒜', '食用油'], allergens: [], possibleAllergens: [], tags: ['Vegetarian', 'Fresh', 'Mild'], spicy: 0, vegetarian: true, vegan: true, hasPork: false, hasCilantro: false, confidence: 0.86, taste: 'Fresh, mild and garlicky', texture: 'Crisp-tender leaves', cooking: 'Flash-fried in a hot wok', bestWith: 'Balances spicy shared dishes', culture: 'A common Chinese table vegetable; the exact greens change with the season.', reason: 'No listed conflict, but the cooking oil and shared wok are not confirmed by this menu.' },
  { id: 'lotus', name: 'Sweet-sour Lotus Root', zh: '糖醋藕片', localized: { en: 'Sweet-sour Lotus Root', ko: '탕수 연근', ja: '甘酢れんこん', ru: 'Корень лотоса в кисло-сладком соусе', es: 'Raíz de loto agridulce', it: 'Radice di loto agrodolce' }, price: 34, emoji: '🪷', className: 'visual-lotus', ingredients: ['Lotus root', 'Rice vinegar', 'Sugar', 'Sesame'], zhIngredients: ['莲藕', '米醋', '糖', '芝麻'], allergens: ['sesame'], possibleAllergens: ['wheat'], tags: ['Vegetarian', 'Crisp', 'Sweet-sour'], spicy: 0, vegetarian: true, vegan: true, hasPork: false, hasCilantro: false, confidence: 0.78, taste: 'Bright sweet-sour crunch', texture: 'Crisp and juicy', cooking: 'Quickly stir-fried with vinegar glaze', bestWith: 'A rich or spicy table', culture: 'Lotus root is loved for its connected slices, often associated with togetherness at the table.', reason: 'Sesame is listed; other sauce ingredients are not fully specified.' },
  { id: 'soup', name: 'Winter Melon Mushroom Soup', zh: '冬瓜菌菇汤', localized: { en: 'Winter Melon Mushroom Soup', ko: '동과 버섯 수프', ja: '冬瓜ときのこのスープ', ru: 'Суп из зимней дыни и грибов', es: 'Sopa de melón de invierno y setas', it: 'Zuppa di zucca invernale e funghi' }, price: 36, emoji: '🍲', className: 'visual-soup', ingredients: ['Winter melon', 'Mushrooms', 'Ginger', 'Stock'], zhIngredients: ['冬瓜', '菌菇', '姜', '高汤'], allergens: [], possibleAllergens: ['shellfish', 'soy'], tags: ['Vegetarian option', 'Warm', 'Mild'], spicy: 0, vegetarian: true, vegan: false, hasPork: false, hasCilantro: false, confidence: 0.59, taste: 'Light, savory and warming', texture: 'Soft melon with tender mushrooms', cooking: 'Slow-simmered broth', bestWith: 'Shared across the table', culture: 'A gentle soup often used to balance bolder dishes.', reason: 'The stock base is not specified, so the dish stays explicitly uncertain.' },
]

const allergyOptions = [
  { id: 'peanut', label: 'Peanut', icon: '🥜' }, { id: 'tree-nut', label: 'Tree nuts', icon: '🌰' }, { id: 'milk', label: 'Milk / dairy', icon: '🥛' }, { id: 'egg', label: 'Egg', icon: '🥚' }, { id: 'fish', label: 'Fish', icon: '🐟' }, { id: 'shellfish', label: 'Shellfish', icon: '🦐' }, { id: 'wheat', label: 'Wheat / gluten', icon: '🌾' }, { id: 'soy', label: 'Soy', icon: '🫘' }, { id: 'sesame', label: 'Sesame', icon: '🌻' },
]
const dietOptions = [
  { id: 'vegetarian', label: 'Vegetarian' }, { id: 'vegan', label: 'Vegan' }, { id: 'no-pork', label: 'No pork' }, { id: 'no-beef', label: 'No beef' },
]
const preferenceOptions = [
  { id: 'mild', label: 'Keep it mild' }, { id: 'no-offal', label: 'No offal' }, { id: 'no-cilantro', label: 'No cilantro' }, { id: 'no-raw', label: 'No raw food' }, { id: 'boneless', label: 'Prefer boneless' },
]

const choiceTranslations: Record<Language, Record<string, string>> = {
  en: { peanut: 'Peanut', 'tree-nut': 'Tree nuts', milk: 'Milk / dairy', egg: 'Egg', fish: 'Fish', shellfish: 'Shellfish', wheat: 'Wheat / gluten', soy: 'Soy', sesame: 'Sesame', vegetarian: 'Vegetarian', vegan: 'Vegan', 'no-pork': 'No pork', 'no-beef': 'No beef', mild: 'Keep it mild', 'no-offal': 'No offal', 'no-cilantro': 'No cilantro', 'no-raw': 'No raw food', boneless: 'Prefer boneless' },
  ko: { peanut: '땅콩', 'tree-nut': '견과류', milk: '우유 / 유제품', egg: '달걀', fish: '생선', shellfish: '갑각류', wheat: '밀 / 글루텐', soy: '대두', sesame: '참깨', vegetarian: '채식', vegan: '비건', 'no-pork': '돼지고기 없음', 'no-beef': '소고기 없음', mild: '맵지 않게', 'no-offal': '내장 없음', 'no-cilantro': '고수 없음', 'no-raw': '생식 없음', boneless: '뼈 없는 음식' },
  ja: { peanut: 'ピーナッツ', 'tree-nut': '木の実', milk: '乳製品', egg: '卵', fish: '魚', shellfish: '甲殻類', wheat: '小麦 / グルテン', soy: '大豆', sesame: 'ごま', vegetarian: 'ベジタリアン', vegan: 'ヴィーガン', 'no-pork': '豚肉なし', 'no-beef': '牛肉なし', mild: '辛さ控えめ', 'no-offal': '内臓なし', 'no-cilantro': 'パクチーなし', 'no-raw': '生ものなし', boneless: '骨なし希望' },
  ru: { peanut: 'Арахис', 'tree-nut': 'Орехи', milk: 'Молоко / молочные продукты', egg: 'Яйца', fish: 'Рыба', shellfish: 'Моллюски', wheat: 'Пшеница / глютен', soy: 'Соя', sesame: 'Кунжут', vegetarian: 'Вегетарианское', vegan: 'Веганское', 'no-pork': 'Без свинины', 'no-beef': 'Без говядины', mild: 'Не острое', 'no-offal': 'Без субпродуктов', 'no-cilantro': 'Без кинзы', 'no-raw': 'Без сырого', boneless: 'Лучше без костей' },
  es: { peanut: 'Cacahuete', 'tree-nut': 'Frutos secos', milk: 'Leche / lácteos', egg: 'Huevo', fish: 'Pescado', shellfish: 'Marisco', wheat: 'Trigo / gluten', soy: 'Soja', sesame: 'Sésamo', vegetarian: 'Vegetariano', vegan: 'Vegano', 'no-pork': 'Sin cerdo', 'no-beef': 'Sin ternera', mild: 'Suave', 'no-offal': 'Sin vísceras', 'no-cilantro': 'Sin cilantro', 'no-raw': 'Sin alimentos crudos', boneless: 'Preferible sin huesos' },
  it: { peanut: 'Arachidi', 'tree-nut': 'Frutta a guscio', milk: 'Latte / latticini', egg: 'Uovo', fish: 'Pesce', shellfish: 'Crostacei', wheat: 'Grano / glutine', soy: 'Soia', sesame: 'Sesamo', vegetarian: 'Vegetariano', vegan: 'Vegano', 'no-pork': 'Senza maiale', 'no-beef': 'Senza manzo', mild: 'Poco piccante', 'no-offal': 'Senza frattaglie', 'no-cilantro': 'Senza coriandolo', 'no-raw': 'Niente crudo', boneless: 'Preferibilmente senza ossa' },
}
const choiceLabel = (language: Language, id: string, fallback: string) => choiceTranslations[language][id] || fallback

const initialPassport: Passport = { allergies: [], diets: [], preferences: [], severity: 'severe', crossContact: true }

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
    plus: <><path d="M12 5v14M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    check: <path d="m5 12 4.5 4.5L19 7"/>,
    alert: <><path d="M12 3 2.7 19a1 1 0 0 0 .9 1.5h16.8a1 1 0 0 0 .9-1.5L12 3Z"/><path d="M12 8v5M12 16.5v.1"/></>,
    shield: <><path d="M12 3 19 6v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>,
    upload: <><path d="M12 16V4M8 8l4-4 4 4M5 14v5h14v-5"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z"/><circle cx="12" cy="13" r="3.5"/></>,
    bookmark: <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-3.5L6 22V4Z"/>,
    volume: <><path d="M4 10v4h3l4 3V7L7 10H4Z"/><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10"/></>,
    copy: <><rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3"/></>,
    share: <><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.5-4.5M8 13l7.5 4.5"/></>,
    edit: <><path d="m4 20 4.2-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"/><path d="m13.5 7.5 3 3"/></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.6-4L3 10M3 5v5h5M4 13a8 8 0 0 0 14.6 4L21 14m0 5v-5h-5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c.4-3.3 2.4-5 6-5s5.6 1.7 6 5M16 5.5a3 3 0 0 1 0 5.8M18 15c2.2.7 3.4 2.3 3.7 5"/></>,
    wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6a2 2 0 0 1-2-2V6.5Z"/><path d="M4 7h16M16 13h4"/><circle cx="16" cy="13" r=".4" fill="currentColor"/></>,
    dots: <><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/></>,
    heart: <path d="M20.8 8.8c0 5.4-8.8 10.3-8.8 10.3S3.2 14.2 3.2 8.8A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.6Z"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    leaf: <><path d="M20 4C10 4 5 8 5 14c0 3.3 2.3 6 5.5 6C17 20 20 12 20 4Z"/><path d="M4 21c2-4 5.3-6.7 10-8.5"/></>,
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>
}

function LogoMark({ small = false }: { small?: boolean }) { return <div className={`logo-mark ${small ? 'logo-mark-small' : ''}`}><span>◒</span></div> }

function Button({ children, onClick, variant = 'primary', icon, className = '', type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: string; className?: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} disabled={disabled} className={`button button-${variant} ${className}`} onClick={onClick}>{icon && <Icon name={icon} size={18} />}{children}</button>
}

function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('cit:language') as Language) || 'en')
  const [passport, setPassport] = useState<Passport>(() => { try { return JSON.parse(localStorage.getItem('cit:passport') || '') as Passport } catch { return initialPassport } })
  const [ready, setReady] = useState(() => localStorage.getItem('cit:ready') === 'true')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [screen, setScreen] = useState<Screen>('home')
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedDish, setSelectedDish] = useState<Dish>(dishes[0])
  const [askSheet, setAskSheet] = useState(false)
  const [scanImage, setScanImage] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [plan, setPlan] = useState<Dish[] | null>(null)
  const [partySize, setPartySize] = useState(3)
  const [budget, setBudget] = useState(300)
  const [tempPreference, setTempPreference] = useState('')
  const [billReady, setBillReady] = useState(false)
  const [billMode, setBillMode] = useState<BillMode>('equal')
  const [participants, setParticipants] = useState(['You', 'Maya', 'Leo'])
  const [splitItems, setSplitItems] = useState<Record<string, string>>({ rice: 'You', tea: 'Maya', greens: 'Everyone', tofu: 'Everyone', chicken: 'Everyone' })
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const billInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>
  const t = (key: CopyKey) => tFor(language, key)

  useEffect(() => { localStorage.setItem('cit:language', language); document.documentElement.lang = language }, [language])
  useEffect(() => { localStorage.setItem('cit:passport', JSON.stringify(passport)) }, [passport])
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 2600); return () => window.clearTimeout(timer) } }, [toast])

  const track = (event: string) => { console.info(`[CanIEatThis] ${event}`, { language, session_id: 'demo-session-001' }) }
  const updatePassport = (key: keyof Passport, value: string | boolean) => setPassport((current) => {
    if (key === 'crossContact') return { ...current, crossContact: value as boolean }
    if (key === 'severity') return { ...current, severity: value as Passport['severity'] }
    const values = current[key] as string[]
    return { ...current, [key]: values.includes(value as string) ? values.filter((item) => item !== value) : [...values, value as string] }
  })
  const finishOnboarding = () => { localStorage.setItem('cit:ready', 'true'); setReady(true); setScreen('home'); track('food_profile_completed') }
  const openScreen = (next: Screen) => { setScreen(next); track(`${next}_open`) }
  const startScan = (file?: File) => { if (file) setScanImage(URL.createObjectURL(file)); setScanning(true); track('menu_scan_start'); window.setTimeout(() => { setScanning(false); openScreen('menu'); track('menu_scan_success') }, 1100) }
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) startScan(file) }
  const getStatus = (dish: Dish): Status => {
    if (dish.confidence < 0.7) return 'UNKNOWN'
    if (passport.allergies.some((allergen) => dish.allergens.includes(allergen))) return 'CONFLICT'
    if (passport.diets.includes('vegetarian') && !dish.vegetarian) return 'CONFLICT'
    if (passport.diets.includes('vegan') && !dish.vegan) return 'CONFLICT'
    if (passport.diets.includes('no-pork') && dish.hasPork) return 'CONFLICT'
    if (passport.diets.includes('no-beef') && dish.hasBeef) return 'CONFLICT'
    if (passport.severity === 'severe' && dish.possibleAllergens?.some((allergen) => passport.allergies.includes(allergen))) return 'WARNING'
    if (passport.crossContact && (dish.possibleAllergens?.length || dish.confidence < 0.9)) return 'WARNING'
    if (passport.preferences.includes('no-cilantro') && dish.hasCilantro) return 'WARNING'
    return 'MATCH'
  }
  const statusInfo = (status: Status) => ({
    MATCH: { label: t('matchLabel'), detail: t('detailsMatch'), color: 'match', icon: 'check' },
    WARNING: { label: t('warningLabel'), detail: t('detailsUnknown'), color: 'warning', icon: 'alert' },
    CONFLICT: { label: t('conflictLabel'), detail: t('detailsConflict'), color: 'conflict', icon: 'close' },
    UNKNOWN: { label: t('unknownLabel'), detail: t('detailsUnknown'), color: 'unknown', icon: 'alert' },
  }[status])
  const filteredDishes = useMemo(() => dishes.filter((dish) => {
    if (filter === 'vegetarian') return dish.vegetarian
    if (filter === 'notSpicy') return dish.spicy === 0
    if (filter === 'forMe') return getStatus(dish) !== 'CONFLICT'
    return true
  }), [filter, passport, language])
  const dishName = (dish: Dish) => dish.localized[language]
  const questionFor = (dish: Dish) => passport.allergies.includes('peanut') || dish.allergens.includes('peanut')
    ? '我对花生严重过敏。请问这道菜是否含有花生、花生油或花生酱？制作时是否会接触花生？如果无法确认，请不要为我制作。'
    : `请问${dish.zh}是否含有未列出的过敏原？制作时会与其他食材共用锅具或炸油吗？`
  const copyQuestion = async () => { await navigator.clipboard?.writeText(questionFor(selectedDish)); setToast('Question copied'); track('ask_restaurant_clicked') }
  const speak = (text: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); track('waiter_voice_play') } }
  const generatePlan = () => {
    const candidates = dishes.filter((dish) => getStatus(dish) !== 'CONFLICT' && !(passport.severity === 'severe' && getStatus(dish) === 'UNKNOWN') && dish.price < budget)
    const picks: Dish[] = []
    const target = Math.max(3, Math.min(5, partySize + 1))
    for (const dish of candidates.sort((a, b) => Number(a.vegetarian) - Number(b.vegetarian) || a.spicy - b.spicy)) {
      if (!picks.some((pick) => pick.id === dish.id)) picks.push(dish)
      if (picks.length === target) break
    }
    setPlan(picks.length >= 2 ? picks : candidates.slice(0, 2)); track('ai_order_generated'); setScreen('order')
  }
  const planTotal = (plan || []).reduce((sum, dish) => sum + dish.price, 0)
  const billItems = [{ id: 'rice', label: 'Steamed rice × 3', zh: '米饭', amount: 18 }, { id: 'tea', label: 'Jasmine tea', zh: '茉莉花茶', amount: 24 }, { id: 'greens', label: 'Garlic seasonal greens', zh: '蒜蓉时蔬', amount: 28 }, { id: 'tofu', label: 'Mapo tofu', zh: '麻婆豆腐', amount: 38 }, { id: 'chicken', label: 'Kung Pao chicken', zh: '宫保鸡丁', amount: 48 }]
  const billTotal = billItems.reduce((sum, item) => sum + item.amount, 0)
  const equalAmount = (billTotal / participants.length).toFixed(2)
  const itemTotals = participants.reduce<Record<string, number>>((acc, person) => { acc[person] = 0; return acc }, {})
  billItems.forEach((item) => { const owner = splitItems[item.id]; if (owner === 'Everyone') participants.forEach((person) => { itemTotals[person] += item.amount / participants.length }); else itemTotals[owner] += item.amount })
  const resetDemo = () => { localStorage.clear(); window.location.reload() }

  if (!ready) return <Onboarding language={language} setLanguage={setLanguage} step={onboardingStep} setStep={setOnboardingStep} passport={passport} updatePassport={updatePassport} finish={finishOnboarding} t={t} />

  return <div className="app-root">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <div className="app-shell">
      <header className="topbar"><button className="brand" onClick={() => openScreen('home')}><LogoMark small /><span>CanIEatThis</span></button><div className="topbar-actions"><span className="session-pill"><span className="live-dot" /> {language.toUpperCase()} · DEMO</span><button className="icon-button" aria-label="Open profile" onClick={() => openScreen('profile')}><Icon name="user" size={19} /></button></div></header>
      <main className="main-content">
        {screen === 'home' && <Home t={t} passport={passport} dishes={dishes} getStatus={getStatus} openScreen={openScreen} setSelectedDish={setSelectedDish} setAskSheet={setAskSheet} plan={plan} />}
        {screen === 'scan' && <Scan t={t} scanImage={scanImage} scanning={scanning} fileInputRef={fileInputRef} handleFile={handleFile} startScan={startScan} onBack={() => openScreen('home')} />}
        {screen === 'menu' && <MenuResults t={t} language={language} filter={filter} setFilter={setFilter} dishes={filteredDishes} allDishes={dishes} getStatus={getStatus} onBack={() => openScreen('home')} onDetail={(dish) => { setSelectedDish(dish); openScreen('detail'); track('dish_view') }} onAssistant={() => openScreen('assistant')} />}
        {screen === 'detail' && <DishDetail t={t} language={language} dish={selectedDish} status={getStatus(selectedDish)} onBack={() => openScreen('menu')} onAsk={() => { setAskSheet(true); track('ask_restaurant_clicked') }} onAdd={() => { setToast('Added to your table plan'); setPlan((current) => [...(current || []), selectedDish]); track('dish_saved') }} />}
        {screen === 'assistant' && <Assistant t={t} passport={passport} partySize={partySize} setPartySize={setPartySize} budget={budget} setBudget={setBudget} tempPreference={tempPreference} setTempPreference={setTempPreference} onBack={() => openScreen('menu')} onGenerate={generatePlan} />}
        {screen === 'order' && <OrderPlan t={t} plan={plan || dishes.slice(2, 5)} total={planTotal || dishes.slice(2, 5).reduce((sum, dish) => sum + dish.price, 0)} onBack={() => openScreen('assistant')} onConfirm={() => { track('ai_order_confirm'); setToast('Order saved to this dining session'); openScreen('waiter') }} onRegenerate={generatePlan} />}
        {screen === 'waiter' && <Waiter t={t} plan={plan || dishes.slice(2, 5)} onBack={() => openScreen('order')} onSpeak={() => speak('请把这些菜做成素食，不要放香菜。如果任何配方无法确认，请先告诉我们。')} />}
        {screen === 'bill' && <Bill t={t} billReady={billReady} setBillReady={setBillReady} billInputRef={billInputRef} handleFile={(event) => { if (event.target.files?.[0]) setBillReady(true); track('bill_scan_success') }} billMode={billMode} setBillMode={setBillMode} participants={participants} setParticipants={setParticipants} splitItems={splitItems} setSplitItems={setSplitItems} billItems={billItems} billTotal={billTotal} equalAmount={equalAmount} itemTotals={itemTotals} onBack={() => openScreen('home')} onToast={setToast} />}
        {screen === 'find' && <FindFood t={t} onBack={() => openScreen('home')} onScan={() => openScreen('scan')} />}
        {screen === 'profile' && <Profile t={t} language={language} setLanguage={setLanguage} passport={passport} updatePassport={updatePassport} onBack={() => openScreen('home')} onReset={resetDemo} />}
      </main>
      {(['home', 'find', 'profile'].includes(screen)) && <BottomNav screen={screen} openScreen={openScreen} t={t} />}
    </div>
    {askSheet && <AskSheet t={t} language={language} dish={selectedDish} question={questionFor(selectedDish)} onClose={() => setAskSheet(false)} onCopy={copyQuestion} onSpeak={() => speak(questionFor(selectedDish))} />}
    {toast && <div className="toast"><Icon name="check" size={16} /> {toast}</div>}
  </div>
}

function Onboarding({ language, setLanguage, step, setStep, passport, updatePassport, finish, t }: { language: Language; setLanguage: (language: Language) => void; step: number; setStep: (step: number) => void; passport: Passport; updatePassport: (key: keyof Passport, value: string | boolean) => void; finish: () => void; t: (key: CopyKey) => string }) {
  return <div className="onboarding-root"><div className="onboarding-frame"><div className="onboarding-progress"><LogoMark /><div><strong>CanIEatThis</strong><span>{step + 1} of 2</span></div></div>{step === 0 ? <section className="onboarding-card"><div className="eyebrow"><span className="orange-dot" /> Welcome to your dining companion</div><h1>{t('selectLanguage')}</h1><p className="lead">{t('languageSub')}</p><div className="language-grid">{languages.map((item) => <button key={item.code} className={`language-card ${language === item.code ? 'selected' : ''}`} onClick={() => setLanguage(item.code)}><span>{item.label}</span><small>{item.native}</small>{language === item.code && <span className="selected-check"><Icon name="check" size={14} /></span>}</button>)}</div><Button className="full-button" onClick={() => setStep(1)} icon="arrow">{t('next')}</Button><p className="safe-note"><Icon name="shield" size={16} /> Built around clarity, not false certainty.</p></section> : <PassportEditor language={language} t={t} passport={passport} updatePassport={updatePassport} onBack={() => setStep(0)} onFinish={finish} />}</div></div>
}

function PassportEditor({ language, t, passport, updatePassport, onBack, onFinish }: { language: Language; t: (key: CopyKey) => string; passport: Passport; updatePassport: (key: keyof Passport, value: string | boolean) => void; onBack: () => void; onFinish: () => void }) {
  return <section className="onboarding-card passport-onboarding"><button className="back-link" onClick={onBack}><Icon name="back" size={18} /> Back</button><div className="eyebrow"><span className="orange-dot" /> Food Passport</div><h1>{t('anything')}</h1><p className="lead">{t('passportSub')}</p><div className="assistant-note"><span className="assistant-face">•ᴗ•</span><span>I’ll help spot ingredients that may need a closer look.</span></div><label className="field-label">{t('allergies')}</label><div className="choice-grid">{allergyOptions.slice(0, 6).map((item) => <button key={item.id} className={`choice-card ${passport.allergies.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('allergies', item.id)}><span className="choice-icon">{item.icon}</span><span>{choiceLabel(language, item.id, item.label)}</span></button>)}</div><div className="choice-more">{allergyOptions.slice(6).map((item) => <button key={item.id} className={`tag-button ${passport.allergies.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('allergies', item.id)}>{choiceLabel(language, item.id, item.label)}</button>)}</div><label className="field-label">{t('diet')}</label><div className="tag-row">{dietOptions.map((item) => <button key={item.id} className={`tag-button ${passport.diets.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('diets', item.id)}>{choiceLabel(language, item.id, item.label)}</button>)}</div><label className="field-label">{t('preferences')}</label><div className="tag-row">{preferenceOptions.map((item) => <button key={item.id} className={`tag-button ${passport.preferences.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('preferences', item.id)}>{choiceLabel(language, item.id, item.label)}</button>)}</div><div className="severity-row"><div><span className="field-label">Severity</span><small>How serious is it?</small></div><div className="segmented compact">{(['mild', 'moderate', 'severe'] as const).map((value) => <button key={value} className={passport.severity === value ? 'active' : ''} onClick={() => updatePassport('severity', value)}>{t(value)}</button>)}</div></div><div className="toggle-row" onClick={() => updatePassport('crossContact', !passport.crossContact)}><div><strong>{t('crossContact')}</strong><small>Shared oil, wok or utensils</small></div><span className={`toggle ${passport.crossContact ? 'on' : ''}`}><span /></span></div><Button className="full-button" onClick={onFinish} icon="scan">{t('save')}</Button></section>
}

function Home({ t, passport, dishes, getStatus, openScreen, setSelectedDish, setAskSheet, plan }: { t: (key: CopyKey) => string; passport: Passport; dishes: Dish[]; getStatus: (dish: Dish) => Status; openScreen: (screen: Screen) => void; setSelectedDish: (dish: Dish) => void; setAskSheet: (open: boolean) => void; plan: Dish[] | null }) {
  const flagged = dishes.filter((dish) => getStatus(dish) === 'CONFLICT').length
  return <div className="page page-home"><section className="welcome-row"><div><div className="eyebrow"><span className="orange-dot" /> Your AI dining companion in China</div><h1>{t('hello')}<span className="olive-dot">.</span></h1><p>{t('subtitle')}</p></div><div className="passport-avatar" onClick={() => openScreen('profile')}><span>{passport.allergies.length ? passport.allergies.length : '—'}</span><small>{passport.allergies.length ? 'flags' : 'passport'}</small></div></section><section className="hero-card"><div className="hero-copy"><span className="hero-kicker">Decision-first dining</span><h2>{t('scanSub')}</h2><p>{t('scanSub')}<br />Scan, understand and ask with confidence.</p><Button onClick={() => openScreen('scan')} icon="scan">{t('scanMenu')}</Button></div><div className="hero-visual"><div className="hero-plate"><span>🥢</span><b>菜</b></div><div className="floating-pill pill-one"><Icon name="shield" size={15} /> {flagged ? `${flagged} conflict${flagged > 1 ? 's' : ''} flagged` : 'Evidence-aware'}</div><div className="floating-pill pill-two"><Icon name="spark" size={15} /> {dishes.length} dishes ready</div></div></section><div className="quick-grid"><button className="quick-card passport-card" onClick={() => openScreen('profile')}><span className="quick-icon"><Icon name="shield" size={20} /></span><span><strong>{t('foodPassport')}</strong><small>{passport.allergies.length ? `${passport.allergies.length} allergen${passport.allergies.length > 1 ? 's' : ''} saved` : t('anything')}</small></span><Icon name="arrow" size={18} /></button><button className="quick-card bill-card" onClick={() => openScreen('bill')}><span className="quick-icon"><Icon name="receipt" size={20} /></span><span><strong>{t('splitBill')}</strong><small>Equal, by item or mixed</small></span><Icon name="arrow" size={18} /></button></div><section className="session-section"><div className="section-heading"><div><span className="eyebrow"><span className="orange-dot" /> {t('recentSession')}</span><h2>Chengdu Garden</h2></div><span className="status-chip match"><span className="status-dot" /> {t('menuReady')}</span></div><div className="session-card"><div className="session-meta"><span className="restaurant-avatar">CG</span><span><strong>Tonight · 7:42 PM</strong><small>42 menu dishes · {passport.diets.includes('vegetarian') ? 'Vegetarian' : 'Food Passport active'}</small></span><button className="more-button"><Icon name="dots" size={20} /></button></div><div className="progress-line"><span style={{ width: plan ? '82%' : '45%' }} /></div><div className="session-actions"><button onClick={() => openScreen('menu')}><Icon name="menu" size={17} /> {t('openSession')}</button><button onClick={() => { setSelectedDish(dishes[0]); setAskSheet(true) }}><Icon name="alert" size={17} /> Review flags</button></div></div></section><section className="intent-section"><div className="section-heading"><div><span className="eyebrow"><span className="orange-dot" /> Explore by intent</span><h2>{t('findFood')}</h2></div><button className="text-link" onClick={() => openScreen('find')}>View all <Icon name="arrow" size={15} /></button></div><div className="intent-row"><button onClick={() => openScreen('find')}>🥟 <span>Dumplings</span></button><button onClick={() => openScreen('find')}>🌶️ <span>Not spicy</span></button><button onClick={() => openScreen('find')}>🌿 <span>Vegetarian</span></button><button onClick={() => openScreen('find')}>✨ <span>Surprise me</span></button></div></section></div>
}

function Scan({ t, scanImage, scanning, fileInputRef, handleFile, startScan, onBack }: { t: (key: CopyKey) => string; scanImage: string | null; scanning: boolean; fileInputRef: RefObject<HTMLInputElement>; handleFile: (event: ChangeEvent<HTMLInputElement>) => void; startScan: (file?: File) => void; onBack: () => void }) {
  return <div className="page page-narrow page-scan"><PageHeader title={t('scanMenu')} kicker="Step 01 · Capture" onBack={onBack} action={<button className="icon-button soft"><Icon name="spark" size={18} /></button>} /><div className="scan-intro"><h1>{t('scanTitle')}</h1><p>{t('scanSubTitle')}</p></div><div className={`scan-frame ${scanImage ? 'has-image' : ''}`}>{scanImage ? <img src={scanImage} alt="Uploaded menu preview" /> : <><div className="scan-corners" /><div className="scan-placeholder"><span className="menu-paper"><b>今日菜单</b><span>宫保鸡丁　　 ¥38</span><span>麻婆豆腐　　 ¥28</span><span>清炒时蔬　　 ¥22</span><span>酸辣汤　　　 ¥18</span></span><div className="scan-line" /></div></>}</div><div className="tip-grid"><div><Icon name="spark" size={17} /><span>{t('avoidGlare')}</span></div><div><Icon name="scan" size={17} /><span>{t('keepFlat')}</span></div><div><Icon name="copy" size={17} /><span>{t('everyPage')}</span></div></div><input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />{scanning ? <div className="analysis-card"><span className="loader" /><span><strong>{t('analyzing')}</strong><small>{t('analysisSub')}</small></span></div> : <><Button className="full-button" onClick={() => fileInputRef.current?.click()} icon="camera">{t('capture')}</Button><Button className="full-button" variant="secondary" onClick={() => fileInputRef.current?.click()} icon="upload">{scanImage ? 'Choose another photo' : t('upload')}</Button><button className="demo-link" onClick={() => startScan()}><Icon name="spark" size={16} /> {t('sampleMenu')} <span>Uses a local, offline demo parser</span></button></>}</div>
}

function PageHeader({ title, kicker, onBack, action }: { title: string; kicker?: string; onBack?: () => void; action?: ReactNode }) { return <div className="page-header"><button className="icon-button soft" onClick={onBack}><Icon name="back" size={20} /></button><div className="page-title"><span><span className="orange-dot" /> {kicker || 'CanIEatThis'}</span><strong>{title}</strong></div>{action || <span className="header-spacer" />}</div> }

function MenuResults({ t, language, filter, setFilter, dishes: visibleDishes, allDishes, getStatus, onBack, onDetail, onAssistant }: { t: (key: CopyKey) => string; language: Language; filter: Filter; setFilter: (filter: Filter) => void; dishes: Dish[]; allDishes: Dish[]; getStatus: (dish: Dish) => Status; onBack: () => void; onDetail: (dish: Dish) => void; onAssistant: () => void }) {
  return <div className="page page-narrow page-menu"><PageHeader title={t('menuResults')} kicker="Step 02 · Decide" onBack={onBack} action={<button className="icon-button soft"><Icon name="dots" size={20} /></button>} /><div className="menu-notice"><Icon name="shield" size={19} /><span>{t('checking')}<small>{allDishes.filter((dish) => getStatus(dish) === 'CONFLICT').length ? ' Clear conflicts are excluded from AI recommendations.' : ' Unknown information stays visible and uncertain.'}</small></span></div><div className="filter-tabs">{([['all', t('all')], ['forMe', t('forMe')], ['vegetarian', t('vegetarian')], ['notSpicy', t('notSpicy')]] as Array<[Filter, string]>).map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); }}><span>{label}</span></button>)}</div><div className="menu-list">{visibleDishes.map((dish) => <DishCard key={dish.id} dish={dish} language={language} status={getStatus(dish)} t={t} onDetail={onDetail} />)}</div><div className="sticky-cta"><Button className="full-button" onClick={onAssistant} icon="spark">{t('helpOrder')}</Button></div></div>
}

function DishVisual({ dish, small = false }: { dish: Dish; small?: boolean }) { return <div className={`dish-visual ${dish.className} ${small ? 'dish-visual-small' : ''}`}><span className="dish-glow" /><span className="dish-emoji">{dish.emoji}</span><span className="dish-bowl" /></div> }
function StatusBadge({ status, t }: { status: Status; t: (key: CopyKey) => string }) { const map = { MATCH: ['match', t('matchLabel'), 'check'], WARNING: ['warning', t('warningLabel'), 'alert'], CONFLICT: ['conflict', t('conflictLabel'), 'close'], UNKNOWN: ['unknown', t('unknownLabel'), 'alert'] } as const; const [color, label, icon] = map[status]; return <span className={`status-badge ${color}`}><Icon name={icon} size={14} /> {label}</span> }
function DishCard({ dish, language, status, t, onDetail }: { dish: Dish; language: Language; status: Status; t: (key: CopyKey) => string; onDetail: (dish: Dish) => void }) { const info = status === 'CONFLICT' ? t('detailsConflict') : status === 'WARNING' ? t('detailsUnknown') : status === 'UNKNOWN' ? t('detailsUnknown') : t('detailsMatch'); return <article className={`dish-card card-status-${status.toLowerCase()}`}><button className="dish-card-main" onClick={() => onDetail(dish)}><DishVisual dish={dish} /><div className="dish-card-content"><div className="dish-card-title"><div><h3>{dish.localized[language]}</h3><span>{dish.zh}</span></div><strong>¥{dish.price}</strong></div><div className="tag-row dish-tags">{dish.tags.map((tag) => <span key={tag} className="tiny-tag">{tag}</span>)}<span className="tiny-tag spicy">{dish.spicy ? '🌶️'.repeat(dish.spicy) : '○'} {dish.spicy ? dish.spicy === 1 ? 'Mild' : dish.spicy === 2 ? 'Medium' : 'Spicy' : 'Mild'}</span></div><div className="status-line"><StatusBadge status={status} t={t} /><span>{info}</span></div></div></button><button className="dish-detail-button" onClick={() => onDetail(dish)}>{t('viewDetails')} <Icon name="arrow" size={16} /></button></article> }

function DishDetail({ t, language, dish, status, onBack, onAsk, onAdd }: { t: (key: CopyKey) => string; language: Language; dish: Dish; status: Status; onBack: () => void; onAsk: () => void; onAdd: () => void }) { return <div className="page page-narrow page-detail"><PageHeader title={t('mainIngredients')} kicker="Step 03 · Understand" onBack={onBack} action={<button className="icon-button soft"><Icon name="bookmark" size={18} /></button>} /><div className="detail-heading"><div><h1>{dish.localized[language]}</h1><span>{dish.zh}</span></div><strong>¥{dish.price}</strong></div><div className="detail-status-row"><StatusBadge status={status} t={t} /><span className="spice-chip">{dish.spicy ? '🌶️'.repeat(dish.spicy) : '○'} {dish.spicy ? dish.spicy === 1 ? 'Mild' : dish.spicy === 2 ? 'Medium spicy' : 'Spicy' : 'Not spicy'}</span></div><div className="detail-gallery"><DishVisual dish={dish} /><DishVisual dish={dish} small /><DishVisual dish={dish} small /></div><p className="illustrative"><Icon name="alert" size={15} /> {t('illustrative')}</p><SectionTitle>{t('mainIngredients')}</SectionTitle><div className="tag-row detail-ingredients">{dish.ingredients.map((ingredient) => <span className="ingredient-pill" key={ingredient}>{ingredient}</span>)}</div><div className="fact-grid"><Fact title={t('taste')} value={dish.taste} /><Fact title={t('texture')} value={dish.texture} /><Fact title={t('cooking')} value={dish.cooking} /><Fact title={t('bestWith')} value={dish.bestWith} /></div><SectionTitle>{t('culturalNote')}</SectionTitle><div className="culture-card"><p>{dish.culture}</p></div><div className="comparison-card"><Icon name="spark" size={18} /><p><strong>Helpful context</strong><br />This is a short cultural explanation to make the dish easier to decide on, not a promise that recipes are identical everywhere.</p></div><div className="why-card"><span>{t('whySeeing')}</span><p>{status === 'CONFLICT' ? t('detailsConflict') : status === 'WARNING' ? t('detailsUnknown') : status === 'UNKNOWN' ? t('detailsUnknown') : t('detailsMatch')}</p></div><div className="detail-actions"><Button variant="secondary" onClick={onAsk} icon="alert">{t('askRestaurant')}</Button><Button onClick={onAdd} icon="plus">Add to table plan</Button></div></div> }
function SectionTitle({ children }: { children: ReactNode }) { return <h2 className="section-title">{children}</h2> }
function Fact({ title, value }: { title: string; value: string }) { return <div className="fact-card"><span>{title}</span><strong>{value}</strong></div> }

function AskSheet({ t, language, dish, question, onClose, onCopy, onSpeak }: { t: (key: CopyKey) => string; language: Language; dish: Dish; question: string; onClose: () => void; onCopy: () => void; onSpeak: () => void }) { return <div className="sheet-backdrop" onClick={onClose}><section className="ask-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-top"><div className="eyebrow"><span className="orange-dot" /> Step 04 · Ask</div><button className="icon-button soft" onClick={onClose}><Icon name="close" size={18} /></button></div><span className="safety-label"><Icon name="shield" size={15} /> {t('askWarning')}</span><h2>{t('askTitle')}</h2><div className="question-card"><strong>中文 · Show first</strong><p>{question}</p><hr /><strong>{dish.name}</strong><small>{dish.zh} · {dish.price} CNY</small></div><div className="sheet-actions"><Button onClick={onSpeak} icon="volume">{t('playChinese')}</Button><Button variant="secondary" onClick={onCopy} icon="copy">{t('copyQuestion')}</Button></div><p className="sheet-disclaimer">If the restaurant cannot confirm, keep this dish excluded from recommendations. Menu evidence cannot determine kitchen cross-contact.</p></section></div> }

function Assistant({ t, passport, partySize, setPartySize, budget, setBudget, tempPreference, setTempPreference, onBack, onGenerate }: { t: (key: CopyKey) => string; passport: Passport; partySize: number; setPartySize: (value: number) => void; budget: number; setBudget: (value: number) => void; tempPreference: string; setTempPreference: (value: string) => void; onBack: () => void; onGenerate: () => void }) { return <div className="page page-narrow page-assistant"><PageHeader title={t('assistant')} kicker="Step 04 · Compose" onBack={onBack} action={<button className="icon-button soft"><Icon name="dots" size={20} /></button>} /><div className="assistant-heading"><span className="assistant-spark">✦</span><h1>{t('planTitle')}</h1><p>{t('planSub')}</p></div><div className="inherited-card"><div className="inherited-title"><Icon name="shield" size={18} /> <strong>Inherited from this Dining Session</strong></div><div className="session-tags"><span>🏮 Chengdu Garden</span><span>▤ 42 menu dishes</span>{passport.diets.map((diet) => <span className="green" key={diet}>◌ {diet === 'vegetarian' ? 'Vegetarian' : diet}</span>)}<span>♡ {passport.allergies.length} food flags</span></div></div><label className="form-label"><span>{t('people')}</span><small>Required</small></label><div className="stepper"><button onClick={() => setPartySize(Math.max(1, partySize - 1))}><Icon name="minus" size={20} /></button><strong>{partySize} people</strong><button onClick={() => setPartySize(Math.min(12, partySize + 1))}><Icon name="plus" size={20} /></button></div><label className="form-label"><span>{t('budget')}</span><small>Required</small></label><div className="budget-options">{[200, 300, 400].map((value) => <button key={value} className={budget === value ? 'active' : ''} onClick={() => setBudget(value)}>Up to ¥{value}</button>)}</div><label className="form-label"><span>{t('temporary')}</span><small>Optional</small></label><div className="preference-options">{['No cilantro', 'Not too oily', 'One soup'].map((value) => <button key={value} className={tempPreference === value ? 'active' : ''} onClick={() => setTempPreference(tempPreference === value ? '' : value)}>{value}</button>)}</div><div className="safety-callout"><Icon name="shield" size={18} /><div><strong>Hard constraints first</strong><p>Allergens and strict diets are filtered before the assistant composes a table. Unknown dishes remain uncertain.</p></div></div><Button className="full-button" onClick={onGenerate} icon="spark">{t('planMeal')}</Button></div> }

function OrderPlan({ t, plan, total, onBack, onConfirm, onRegenerate }: { t: (key: CopyKey) => string; plan: Dish[]; total: number; onBack: () => void; onConfirm: () => void; onRegenerate: () => void }) { return <div className="page page-narrow page-order"><PageHeader title={t('tablePlan')} kicker="Step 05 · Validate" onBack={onBack} action={<button className="icon-button soft"><Icon name="dots" size={20} /></button>} /><div className="rule-checked"><Icon name="shield" size={20} /><span><strong>{t('ruleChecked')}</strong><small>Quantity, price, total and dietary constraints were verified.</small></span></div><div className="order-stats"><div><strong>3</strong><small>people</small></div><div><strong>{plan.length}</strong><small>dishes</small></div><div><strong>¥{total}</strong><small>budget used</small></div></div><div className="plan-heading"><div><h2>Balanced table plan</h2><p>Enough variety without ordering too much</p></div><span className="plan-label">Plan A</span></div><div className="order-list">{plan.map((dish) => <div className="order-item" key={dish.id}><DishVisual dish={dish} small /><div><strong>{dish.name}</strong><span>{dish.zh} · {dish.reason}</span></div><b>¥{dish.price}</b></div>)}</div><div className="order-total"><span>{t('total')} · {plan.length} dishes</span><strong>¥{total}</strong></div><div className="order-actions"><Button variant="secondary" onClick={onBack} icon="edit">{t('edit')}</Button><Button variant="secondary" onClick={onRegenerate} icon="refresh">{t('regenerate')}</Button><Button onClick={onConfirm} icon="check">{t('orderThese')}</Button></div></div> }

function Waiter({ t, plan, onBack, onSpeak }: { t: (key: CopyKey) => string; plan: Dish[]; onBack: () => void; onSpeak: () => void }) { return <div className="page page-narrow page-waiter"><PageHeader title={t('showWaiter')} kicker="Step 06 · Speak" onBack={onBack} action={<button className="icon-button soft"><Icon name="volume" size={18} /></button>} /><div className="waiter-card"><span className="safety-label"><Icon name="shield" size={15} /> {t('specialRequest')}</span><h1>请给服务员看</h1><p className="waiter-request">请把这些菜做成素食，不要放香菜。如果任何配方无法确认，请先告诉我们。</p><p className="waiter-translation">{t('waiterText')}</p><div className="waiter-divider" /><h3>Order · {plan.length} dishes</h3><div className="waiter-order">{plan.map((dish) => <div key={dish.id}><span>{dish.zh}</span><b>×1</b></div>)}</div><Button className="full-button" onClick={onSpeak} icon="volume">{t('play')}</Button><p className="waiter-note"><Icon name="alert" size={15} /> {t('waiterSub')}</p></div></div> }

function Bill({ t, billReady, setBillReady, billInputRef, handleFile, billMode, setBillMode, participants, setParticipants, splitItems, setSplitItems, billItems, billTotal, equalAmount, itemTotals, onBack, onToast }: { t: (key: CopyKey) => string; billReady: boolean; setBillReady: (ready: boolean) => void; billInputRef: React.RefObject<HTMLInputElement>; handleFile: (event: React.ChangeEvent<HTMLInputElement>) => void; billMode: BillMode; setBillMode: (mode: BillMode) => void; participants: string[]; setParticipants: (people: string[]) => void; splitItems: Record<string, string>; setSplitItems: (items: Record<string, string>) => void; billItems: Array<{ id: string; label: string; zh: string; amount: number }>; billTotal: number; equalAmount: string; itemTotals: Record<string, number>; onBack: () => void; onToast: (toast: string) => void }) { const addParticipant = () => setParticipants([...participants, `Guest ${participants.length + 1}`]); return <div className="page page-narrow page-bill"><PageHeader title={t('billTitle')} kicker="Step 07 · Settle" onBack={onBack} action={<button className="icon-button soft"><Icon name="share" size={18} /></button>} />{!billReady ? <><div className="bill-intro"><div className="receipt-illustration"><Icon name="receipt" size={42} /></div><h1>{t('billTitle')}</h1><p>{t('billSub')}</p></div><div className="receipt-scan-box"><div className="scan-corners" /><Icon name="camera" size={30} /><strong>Photograph the full receipt</strong><small>Keep the total and every line item in frame.</small></div><input ref={billInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} hidden /><Button className="full-button" onClick={() => billInputRef.current?.click()} icon="camera">{t('scanReceipt')}</Button><Button className="full-button" variant="secondary" onClick={() => setBillReady(true)} icon="receipt">{t('useReceipt')}</Button><p className="bill-demo-note">Local demo receipt · ¥156.00 · 5 items</p></> : <><div className="bill-summary"><div><span>{t('verified')}</span><strong>¥{billTotal.toFixed(2)}</strong></div><span className="status-chip match"><span className="status-dot" /> {t('matchLabel')}</span></div><div className="bill-tabs segmented">{([['equal', t('equal')], ['item', t('byItem')], ['mixed', t('mixed')]] as Array<[BillMode, string]>).map(([value, label]) => <button key={value} className={billMode === value ? 'active' : ''} onClick={() => setBillMode(value)}>{label}</button>)}</div><div className="bill-section"><div className="section-heading compact-heading"><h2>{t('participants')}</h2><button className="text-link" onClick={addParticipant}><Icon name="plus" size={14} /> Add</button></div><div className="participant-row">{participants.map((person, index) => <span className="participant-chip" key={person}><span>{person[0]}</span>{person}{index > 0 && <button onClick={() => setParticipants(participants.filter((item) => item !== person))}><Icon name="close" size={12} /></button>}</span>)}</div></div>{billMode !== 'equal' && <div className="bill-section"><div className="section-heading compact-heading"><h2>{t('billItems')}</h2><span className="muted-small">Tap an item to assign</span></div><div className="bill-item-list">{billItems.map((item) => <div className="bill-item" key={item.id}><span><strong>{item.label}</strong><small>{item.zh}</small></span><select value={splitItems[item.id]} onChange={(event) => setSplitItems({ ...splitItems, [item.id]: event.target.value })}>{['Everyone', ...participants].map((person) => <option key={person}>{person}</option>)}</select><b>¥{item.amount.toFixed(2)}</b></div>)}</div></div>}<div className="split-result"><div className="result-heading"><h2>Everyone pays</h2><span>Exact total check <Icon name="check" size={15} /></span></div>{billMode === 'equal' ? participants.map((person) => <div className="person-result" key={person}><span><span className="participant-initial">{person[0]}</span>{person}</span><strong>¥{equalAmount}</strong></div>) : participants.map((person) => <div className="person-result" key={person}><span><span className="participant-initial">{person[0]}</span>{person}</span><strong>¥{itemTotals[person].toFixed(2)}</strong></div>)}<div className="split-total"><span>{t('verified')}</span><strong>¥{billTotal.toFixed(2)}</strong></div></div><Button className="full-button" onClick={() => { onToast('Share sheet ready'); navigator.share?.({ title: 'CanIEatThis bill split', text: `Everyone pays from ¥${billTotal.toFixed(2)}` }) }} icon="share">{t('share')}</Button><button className="reset-bill" onClick={() => setBillReady(false)}>Scan another receipt</button></>}</div> }

function FindFood({ t, onBack, onScan }: { t: (key: CopyKey) => string; onBack: () => void; onScan: () => void }) { return <div className="page page-narrow page-find"><PageHeader title={t('findFood')} kicker="P1 · Explore" onBack={onBack} action={<button className="icon-button soft"><Icon name="compass" size={19} /></button>} /><div className="find-heading"><h1>{t('findTitle')}</h1><p>{t('findSub')}</p></div><div className="intent-grid">{[['🥟', 'Dumplings'], ['🍜', 'Noodles'], ['🌿', 'Vegetarian'], ['🌶️', 'Not spicy'], ['🍲', 'Hot pot'], ['✨', 'Surprise me']].map(([emoji, label]) => <button key={label} onClick={onScan}><span>{emoji}</span><strong>{label}</strong><small>{t('whyFits')} · Food Passport</small></button>)}</div><div className="nearby-heading"><h2>{t('nearby')}</h2><span>Shanghai · 1.2 km radius</span></div><div className="restaurant-card"><div className="restaurant-photo photo-one">🏮</div><div><div className="restaurant-top"><strong>Old Town Kitchen</strong><span>4.8</span></div><p>Local specialties · Vegetarian options</p><small><Icon name="shield" size={14} /> Why it fits: clear dishes and mild options</small></div></div><div className="restaurant-card"><div className="restaurant-photo photo-two">🍵</div><div><div className="restaurant-top"><strong>Green Bamboo House</strong><span>4.6</span></div><p>Tea house · Rice dishes · Quiet</p><small><Icon name="shield" size={14} /> Why it fits: lighter flavors for your passport</small></div></div></div> }

function Profile({ t, language, setLanguage, passport, updatePassport, onBack, onReset }: { t: (key: CopyKey) => string; language: Language; setLanguage: (language: Language) => void; passport: Passport; updatePassport: (key: keyof Passport, value: string | boolean) => void; onBack: () => void; onReset: () => void }) { return <div className="page page-narrow page-profile"><PageHeader title={t('profileTitle')} kicker="Settings · User controlled" onBack={onBack} /><div className="profile-hero"><div className="profile-icon"><Icon name="shield" size={28} /></div><div><h1>{t('profileTitle')}</h1><p>{t('profileSub')}</p></div></div><div className="profile-section"><div className="section-heading compact-heading"><h2>{t('language')}</h2><span className="muted-small">{language.toUpperCase()}</span></div><div className="language-select-grid">{languages.map((item) => <button key={item.code} className={language === item.code ? 'active' : ''} onClick={() => setLanguage(item.code)}>{item.label}<span>{item.native}</span></button>)}</div></div><div className="profile-section"><div className="section-heading compact-heading"><h2>{t('allergies')}</h2><span className="muted-small">{passport.allergies.length} selected</span></div><div className="tag-row wrap">{allergyOptions.map((item) => <button key={item.id} className={`tag-button ${passport.allergies.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('allergies', item.id)}>{item.icon} {item.label}</button>)}</div></div><div className="profile-section"><div className="section-heading compact-heading"><h2>{t('diet')}</h2><span className="muted-small">Hard constraints</span></div><div className="tag-row wrap">{dietOptions.map((item) => <button key={item.id} className={`tag-button ${passport.diets.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('diets', item.id)}>{item.label}</button>)}</div></div><div className="profile-section"><div className="section-heading compact-heading"><h2>{t('preferences')}</h2><span className="muted-small">Sort recommendations</span></div><div className="tag-row wrap">{preferenceOptions.map((item) => <button key={item.id} className={`tag-button ${passport.preferences.includes(item.id) ? 'selected' : ''}`} onClick={() => updatePassport('preferences', item.id)}>{item.label}</button>)}</div></div><div className="toggle-row profile-toggle" onClick={() => updatePassport('crossContact', !passport.crossContact)}><div><strong>{t('crossContact')}</strong><small>Keep shared oil, wok and utensil uncertainty visible.</small></div><span className={`toggle ${passport.crossContact ? 'on' : ''}`}><span /></span></div><div className="disclaimer-card"><Icon name="alert" size={18} /><p>{t('disclaimer')}</p></div><button className="reset-button" onClick={onReset}>{t('reset')}</button></div> }

function BottomNav({ screen, openScreen, t }: { screen: Screen; openScreen: (screen: Screen) => void; t: (key: CopyKey) => string }) { return <nav className="bottom-nav"><button className={screen === 'home' ? 'active' : ''} onClick={() => openScreen('home')}><Icon name="home" size={19} /><span>{t('home')}</span></button><button className={screen === 'find' ? 'active' : ''} onClick={() => openScreen('find')}><Icon name="compass" size={19} /><span>{t('findFood')}</span></button><button className="scan-nav" onClick={() => openScreen('scan')}><span><Icon name="scan" size={21} /></span><small>{t('scan')}</small></button><button className={screen === 'profile' ? 'active' : ''} onClick={() => openScreen('profile')}><Icon name="user" size={19} /><span>{t('profile')}</span></button></nav> }

export default App
