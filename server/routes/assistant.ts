import { Router } from 'express'
import { z } from 'zod'
import { foodPassportSchema, menuDishSchema } from '../schemas/menu.js'
import { evaluateDishRisk } from '../services/dietaryRules.js'

const router = Router()
const assistantRequestSchema = z.object({ question: z.string().trim().min(1).max(800), language: z.string().trim().min(2).max(8).default('en'), dishes: z.array(menuDishSchema).max(100), foodPassport: foodPassportSchema.optional() })
const chineseAllergens: Record<string, string> = { peanut: '花生', 'tree-nut': '坚果', milk: '牛奶或乳制品', egg: '鸡蛋', fish: '鱼', shellfish: '贝类或甲壳类', crustacean: '甲壳类', wheat: '小麦或麸质', soy: '大豆', sesame: '芝麻' }
const toChinese = (items: string[]) => items.map((item) => chineseAllergens[item] || item).join('、')

router.post('/ask', (request, response, next) => {
  try {
    const input = assistantRequestSchema.parse(request.body)
    const question = input.question.toLowerCase()
    const vegetarian = input.dishes.filter((dish) => dish.vegetarian === true)
    const selected = vegetarian[0]
    let answer = 'I can only answer from the dishes currently shown on this menu. I cannot confirm that from the available menu evidence.'
    let waiterChinese = '请问这道菜的具体配料和制作方式是什么？如果无法确认，请先不要为我制作。'
    if (/vegetarian|vegan|素食|纯素/.test(question)) {
      answer = selected ? `${selected.name} (${selected.zh}) is marked as vegetarian on this menu.` : 'No dish on the current menu is explicitly marked vegetarian.'
      waiterChinese = selected ? `请问${selected.zh}${selected.vegan === true ? '是纯素' : '是素食'}的吗？是否使用了动物性高汤或共用锅具？` : '请问菜单上有没有可以确认是纯素的菜？'
    } else if (/spicy|辣|hot/.test(question)) {
      const spicy = input.dishes.filter((dish) => (dish.spicy || 0) <= 1)
      answer = spicy.length ? `${spicy[0].name} (${spicy[0].zh}) has the lowest listed spice level.` : 'The menu does not show a clearly mild dish.'
      waiterChinese = '请问这道菜辣度如何？可以做成不辣，并确认酱料里没有辣椒吗？'
    } else if (input.dishes.length) {
      const mention = input.dishes.find((dish) => question.includes(dish.name.toLowerCase()) || question.includes(dish.zh))
      if (mention) {
        const risk = input.foodPassport ? evaluateDishRisk(mention, input.foodPassport) : undefined
        answer = `${mention.name} (${mention.zh}) is on the current menu. ${risk?.status === 'CONFLICT' ? 'It conflicts with the current Food Passport.' : risk?.status === 'WARNING' || risk?.status === 'UNKNOWN' ? 'The available evidence needs restaurant confirmation.' : 'Please confirm ingredients with the restaurant if this is allergy-critical.'}`
        waiterChinese = input.foodPassport?.allergies.length ? `我对${toChinese(input.foodPassport.allergies)}过敏。请问${mention.zh}是否含有这些成分或共用锅具？如果无法确认，请不要为我制作。` : `请问${mention.zh}的具体配料是什么？如果无法确认，请先告诉我。`
      }
    }
    return response.json({ answer, waiterChinese, needsRestaurantConfirmation: true })
  } catch (error) {
    return next(error)
  }
})

export default router
