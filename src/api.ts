export type EvidenceSource = 'menu' | 'knowledge' | 'unknown'
export type BackendIngredientEvidence = { label: string; labelZh?: string; source: EvidenceSource }
export type BackendAllergenEvidence = { id: string; label?: string; source: EvidenceSource }
export type BackendKnowledgeMatch = { id: string; nameZh: string; nameEn: string; aliases: string[] }

export type BackendDish = {
  id: string
  name: string
  zh: string
  price: number | null
  ingredients: string[]
  allergens: string[]
  possibleAllergens: string[]
  confidence: number
  spicy: number | null
  vegetarian?: boolean
  vegan?: boolean
  tags: string[]
  possibleIngredients?: string[]
  possibleZhIngredients?: string[]
  hasPork?: boolean
  hasBeef?: boolean
  hasPoultry?: boolean
  hasSeafood?: boolean
  hasOffal?: boolean
  hasCilantro?: boolean
  hasScallion?: boolean
  hasGarlic?: boolean
  hasLard?: boolean
  localized?: Record<string, string>
  ingredientEvidence?: BackendIngredientEvidence[]
  allergenEvidence?: BackendAllergenEvidence[]
  knowledgeMatch?: BackendKnowledgeMatch
}

export type BackendRisk = {
  status: 'MATCH' | 'WARNING' | 'CONFLICT' | 'UNKNOWN'
  reasons: string[]
  matchedRestrictions: string[]
  recommendationEligible: boolean
  source?: EvidenceSource
}

export type MenuAnalysisResponse = {
  restaurantName: string
  dishes: BackendDish[]
  risks?: Record<string, BackendRisk>
  parserMode: 'mock' | 'llm'
  disclaimer: string
}

export type AssistantResponse = { answer: string; waiterChinese: string; needsRestaurantConfirmation: boolean }
export type TranslationResponse = { translation: string }

export const MAX_MENU_IMAGE_BYTES = 8 * 1024 * 1024
export const MENU_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')).replace(/\/$/, '')

export function validateMenuImage(file: File): string | null {
  if (!MENU_IMAGE_TYPES.includes(file.type as typeof MENU_IMAGE_TYPES[number])) return 'Please choose a JPEG, PNG, or WebP image.'
  if (file.size > MAX_MENU_IMAGE_BYTES) return 'Image is too large. Please choose an image under 8 MB.'
  return null
}

async function parseError(response: Response) {
  try {
    const body = await response.json() as { error?: string }
    return body.error || `Request failed with HTTP ${response.status}.`
  } catch {
    return `Request failed with HTTP ${response.status}.`
  }
}

export async function analyzeMenuImage(file: File, input: { restaurantName: string; language: string; foodPassport: unknown }): Promise<MenuAnalysisResponse> {
  const validationError = validateMenuImage(file)
  if (validationError) throw new Error(validationError)
  const form = new FormData()
  form.append('image', file)
  form.append('restaurantName', input.restaurantName)
  form.append('language', input.language)
  form.append('foodPassport', JSON.stringify(input.foodPassport))
  const response = await fetch(`${API_BASE_URL}/api/menus/analyze`, { method: 'POST', body: form })
  if (!response.ok) throw new Error(await parseError(response))
  return await response.json() as MenuAnalysisResponse
}

export async function askDiningAssistant(input: { question: string; language: string; dishes: BackendDish[]; foodPassport: unknown }): Promise<AssistantResponse> {
  const response = await fetch(`${API_BASE_URL}/api/assistant/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!response.ok) throw new Error(await parseError(response))
  return await response.json() as AssistantResponse
}

export async function translateText(input: { text: string; sourceLanguage: string; targetLanguage: string }): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json() as TranslationResponse).translation
}
