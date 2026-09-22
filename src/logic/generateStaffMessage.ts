import type { Dish, Language, Passport, StaffMessage } from '../domain/types'

const allergyZh: Record<string, string> = { peanut: '花生', 'tree-nut': '坚果', milk: '牛奶或乳制品', egg: '鸡蛋', fish: '鱼', shellfish: '贝类或甲壳类', wheat: '小麦或麸质', soy: '大豆', sesame: '芝麻' }
const dietZh: Record<string, string> = { vegetarian: '素食', vegan: '纯素', 'no-pork': '猪肉', 'no-beef': '牛肉' }
const allergyEn: Record<string, string> = { peanut: 'peanuts', 'tree-nut': 'tree nuts', milk: 'milk or dairy', egg: 'egg', fish: 'fish', shellfish: 'shellfish', wheat: 'wheat or gluten', soy: 'soy', sesame: 'sesame' }

const list = (values: string[]) => values.length === 1 ? values[0] : `${values.slice(0, -1).join('、')}和${values.at(-1)}`

export function generateDishQuestion(dish: Dish, passport: Passport, _language: Language = 'en'): StaffMessage {
  const allergies = passport.allergies.map((item) => allergyZh[item] ?? item)
  const severity = passport.severity === 'severe' ? '严重' : passport.severity === 'moderate' ? '中度' : '轻度'
  const allergyLine = allergies.length ? `我有${severity}的${list(allergies)}过敏。` : '我有饮食限制，想确认这道菜的配料。'
  const chinese = `${allergyLine}请问${dish.zh}是否含有${allergies.length ? list(allergies) : '未列出的过敏原'}？制作时是否会与其他食材共用锅具或炸油？如果无法确认，请不要为我制作。`
  const englishAllergies = passport.allergies.map((item) => allergyEn[item] ?? item)
  const translation = englishAllergies.length
    ? `I have a ${passport.severity} allergy to ${englishAllergies.join(' and ')}. Does ${dish.name} contain it, and is shared equipment or oil used? Please do not prepare it if this cannot be confirmed.`
    : `Could you confirm the ingredients in ${dish.name}, including whether shared equipment or oil is used? Please tell me if anything cannot be confirmed.`
  return { chinese, translation }
}

export function generateOrderRequest(plan: Dish[], passport: Passport, tempPreference = '', _language: Language = 'en'): StaffMessage {
  const dishes = plan.length ? `这些菜（${plan.map((dish) => dish.zh).join('、')}）` : '这份订单'
  const requests: string[] = []
  const translationRequests: string[] = []
  const diets = passport.diets.map((item) => dietZh[item] ?? item)
  if (diets.includes('纯素')) { requests.push('请按纯素制作'); translationRequests.push('Please prepare them as vegan') }
  else if (diets.includes('素食')) { requests.push('请按素食制作'); translationRequests.push('Please prepare them as vegetarian') }
  if (diets.includes('猪肉')) { requests.push('不要放猪肉'); translationRequests.push('Do not add pork') }
  if (diets.includes('牛肉')) { requests.push('不要放牛肉'); translationRequests.push('Do not add beef') }
  if (passport.preferences.includes('no-cilantro') || tempPreference === 'No cilantro') { requests.push('不要放香菜'); translationRequests.push('Do not add cilantro') }
  if (tempPreference === 'Not too oily') { requests.push('请少放油'); translationRequests.push('Please use less oil') }
  if (tempPreference === 'One soup') { requests.push('请保留一道汤'); translationRequests.push('Please include no more than one soup') }
  if (passport.allergies.length) {
    const allergens = passport.allergies.map((item) => allergyZh[item] ?? item)
    requests.push(`我有${passport.severity === 'severe' ? '严重' : passport.severity === 'moderate' ? '中度' : '轻度'}的${list(allergens)}过敏，请确认配料和厨房交叉接触`)
    const englishAllergens = passport.allergies.map((item) => allergyEn[item] ?? item).join(' and ')
    translationRequests.push(`I have a ${passport.severity} allergy to ${englishAllergens}; please confirm the ingredients and kitchen cross-contact`)
  }
  if (!requests.length) {
    requests.push('请确认每道菜的配料；如果任何配方无法确认，请先告诉我们')
    translationRequests.push('Please confirm the ingredients in every dish and tell us before preparing anything that cannot be confirmed')
  }
  const chinese = `${dishes}，${requests.join('；')}。`
  const translation = `${plan.length ? `For ${plan.map((dish) => dish.name).join(', ')}, ` : ''}${translationRequests.join('; ')}.`
  return { chinese, translation }
}
