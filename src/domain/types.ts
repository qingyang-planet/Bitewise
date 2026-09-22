export type Language = 'en' | 'ko' | 'ja' | 'ru' | 'es' | 'it'
export type Status = 'MATCH' | 'WARNING' | 'CONFLICT' | 'UNKNOWN'
export type Severity = 'mild' | 'moderate' | 'severe'

export type Passport = {
  allergies: string[]
  diets: string[]
  preferences: string[]
  severity: Severity
  crossContact: boolean
}

export type Dish = {
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
  category?: 'soup' | 'main' | 'vegetable' | 'side'
}

export type RiskAssessment = {
  status: Status
  reasons: string[]
  matchedRestrictions: string[]
  recommendationEligible: boolean
}

export type MenuParseResult = {
  parserMode: 'local-demo'
  source: 'sample' | 'uploaded-image'
  dishes: Dish[]
  disclaimer: string
}

export type MealPlanInput = {
  dishes: Dish[]
  assessments: Record<string, RiskAssessment>
  budget: number
  partySize: number
  tempPreference?: string
}

export type MealPlanResult = {
  dishes: Dish[]
  total: number
  budget: number
  partySize: number
  valid: boolean
  reason: string
}

export type StaffMessage = {
  chinese: string
  translation: string
}
