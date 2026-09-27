import type { MenuAnalysisRequest, MenuAnalysisResponse, MenuDish } from '../schemas/menu.js'
import { menuAnalysisResponseSchema } from '../schemas/menu.js'
import { enrichMenuWithKnowledge } from './foodKnowledge.js'

type AnalyzeInput = MenuAnalysisRequest & { image: { buffer: Buffer; mimeType: string } }

const mockDishes: MenuDish[] = [
  { id: 'dish-001', name: 'Kung Pao Chicken', zh: '宫保鸡丁', price: 38, ingredients: ['chicken', 'peanuts', 'chili'], allergens: ['peanut'], possibleAllergens: [], confidence: 0.92, spicy: 2, vegetarian: false, vegan: false, tags: ['Chicken', 'Peanut', 'Chili'], hasPoultry: true, localized: { en: 'Kung Pao Chicken' } },
  { id: 'dish-002', name: 'Garlic Seasonal Greens', zh: '蒜蓉时蔬', price: 28, ingredients: ['seasonal greens', 'garlic', 'cooking oil'], allergens: [], possibleAllergens: [], confidence: 0.86, spicy: 0, vegetarian: true, vegan: true, tags: ['Vegetarian', 'Fresh', 'Mild'], localized: { en: 'Garlic Seasonal Greens' } },
  { id: 'dish-003', name: 'Winter Melon Mushroom Soup', zh: '冬瓜菌菇汤', price: 36, ingredients: ['winter melon', 'mushrooms', 'ginger', 'stock'], allergens: [], possibleAllergens: ['shellfish', 'soy'], confidence: 0.59, spicy: 0, vegetarian: true, vegan: false, tags: ['Vegetarian option', 'Warm', 'Mild'], localized: { en: 'Winter Melon Mushroom Soup' } },
]

const systemPrompt = 'You extract menu evidence only. Return JSON with restaurantName and dishes. Never state that a dish is safe or 100% safe. Use unknown when the image does not establish a field; use confidence between 0 and 1 and possibleAllergens:["unknown"] when allergen evidence is incomplete. Do not infer ingredients from cultural stereotypes. Each dish must include id, name, zh, price, ingredients, allergens, possibleAllergens, confidence, spicy, vegetarian, vegan, tags.'

function mockAnalysis(restaurantName: string): MenuAnalysisResponse {
  return menuAnalysisResponseSchema.parse({ restaurantName, dishes: enrichMenuWithKnowledge(mockDishes), parserMode: 'mock', disclaimer: 'Demo results use a fixed local menu dataset. The original image is not stored. Possible allergens from common recipes still require restaurant confirmation.' })
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]
  const candidate = fenced || text.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('The analysis service returned invalid JSON.')
  return JSON.parse(candidate.slice(start, end + 1)) as unknown
}

async function llmAnalysis(input: AnalyzeInput): Promise<MenuAnalysisResponse> {
  const apiKey = process.env.LLM_API_KEY
  const model = process.env.LLM_MODEL
  if (!apiKey || !model) return mockAnalysis(input.restaurantName)

  const endpoint = process.env.LLM_BASE_URL || 'https://api.openai.com/v1/chat/completions'
  const image = `data:${input.image.mimeType};base64,${input.image.buffer.toString('base64')}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [{ type: 'text', text: `Restaurant: ${input.restaurantName}. User language: ${input.language}. Analyze this menu image.` }, { type: 'image_url', image_url: { url: image, detail: 'high' } }] },
      ],
    }),
  })
  if (!response.ok) throw new Error(`The analysis service returned HTTP ${response.status}.`)
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('The analysis service returned no menu data.')
  const extracted = extractJson(content)
  if (!extracted || typeof extracted !== 'object' || Array.isArray(extracted)) throw new Error('The analysis service returned an invalid menu object.')
  const parsed = menuAnalysisResponseSchema.parse({ ...(extracted as Record<string, unknown>), restaurantName: input.restaurantName, parserMode: 'llm', disclaimer: 'Ingredients are extracted from menu evidence. Common-recipe knowledge may add possible allergens; serious allergies still require restaurant confirmation.' })
  return { ...parsed, dishes: enrichMenuWithKnowledge(parsed.dishes) }
}

export async function analyzeMenu(input: AnalyzeInput): Promise<MenuAnalysisResponse> {
  try {
    return await llmAnalysis(input)
  } catch (error) {
    if (!process.env.LLM_API_KEY) return mockAnalysis(input.restaurantName)
    throw error instanceof Error ? error : new Error('Menu analysis failed.')
  }
}
