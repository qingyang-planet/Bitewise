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
  hasPork?: boolean
  hasBeef?: boolean
  hasPoultry?: boolean
  hasSeafood?: boolean
  hasOffal?: boolean
  hasCilantro?: boolean
  localized?: Record<string, string>
}

export type BackendRisk = {
  status: 'MATCH' | 'WARNING' | 'CONFLICT' | 'UNKNOWN'
  reasons: string[]
  matchedRestrictions: string[]
  recommendationEligible: boolean
}

export type MenuAnalysisResponse = {
  restaurantName: string
  dishes: BackendDish[]
  risks?: Record<string, BackendRisk>
  parserMode: 'mock' | 'llm'
  disclaimer: string
}

export type AssistantResponse = { answer: string; waiterChinese: string; needsRestaurantConfirmation: boolean }

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
