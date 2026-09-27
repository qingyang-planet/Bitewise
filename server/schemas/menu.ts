import { z } from 'zod'

export const languageSchema = z.enum(['en', 'ko', 'ja', 'ru', 'es', 'it'])
const stringArray = z.array(z.string().trim().min(1)).default([])
export const evidenceSourceSchema = z.enum(['menu', 'knowledge', 'unknown'])
const ingredientEvidenceSchema = z.object({ label: z.string().trim().min(1), labelZh: z.string().trim().min(1).optional(), source: evidenceSourceSchema })
const allergenEvidenceSchema = z.object({ id: z.string().trim().min(1), label: z.string().trim().min(1).optional(), source: evidenceSourceSchema })
const knowledgeMatchSchema = z.object({ id: z.string().trim().min(1), nameZh: z.string().trim().min(1), nameEn: z.string().trim().min(1), aliases: stringArray })

export const foodPassportSchema = z.object({
  allergies: stringArray,
  diets: stringArray,
  avoidFoods: stringArray,
  preferences: stringArray,
  dietStyle: z.string().optional(),
  faithDiet: z.string().optional(),
  spiceLevel: z.number().int().min(0).max(5).nullable().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).default('severe'),
  crossContact: z.boolean().default(true),
  allergyProfiles: z.record(z.object({ severity: z.enum(['mild', 'moderate', 'severe']), crossContact: z.boolean() })).optional(),
}).passthrough()

export const menuAnalysisRequestSchema = z.object({
  restaurantName: z.string().trim().min(1).max(120),
  language: languageSchema.default('en'),
  foodPassport: foodPassportSchema.optional(),
})

export const menuDishSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(160),
  zh: z.string().min(1).max(160),
  price: z.number().nonnegative().finite().nullable(),
  ingredients: stringArray,
  allergens: stringArray,
  possibleAllergens: stringArray,
  confidence: z.number().min(0).max(1),
  spicy: z.number().int().min(0).max(5).nullable(),
  vegetarian: z.boolean().optional(),
  vegan: z.boolean().optional(),
  tags: stringArray,
  possibleIngredients: stringArray.optional(),
  possibleZhIngredients: stringArray.optional(),
  hasPork: z.boolean().optional(),
  hasBeef: z.boolean().optional(),
  hasPoultry: z.boolean().optional(),
  hasSeafood: z.boolean().optional(),
  hasOffal: z.boolean().optional(),
  hasCilantro: z.boolean().optional(),
  hasScallion: z.boolean().optional(),
  hasGarlic: z.boolean().optional(),
  hasLard: z.boolean().optional(),
  localized: z.record(z.string()).optional(),
  ingredientEvidence: z.array(ingredientEvidenceSchema).optional(),
  allergenEvidence: z.array(allergenEvidenceSchema).optional(),
  knowledgeMatch: knowledgeMatchSchema.optional(),
})

export const menuRiskSchema = z.object({
  status: z.enum(['MATCH', 'WARNING', 'CONFLICT', 'UNKNOWN']),
  reasons: z.array(z.string()),
  matchedRestrictions: z.array(z.string()),
  recommendationEligible: z.boolean(),
  source: evidenceSourceSchema.optional(),
})

export const menuAnalysisResponseSchema = z.object({
  restaurantName: z.string(),
  dishes: z.array(menuDishSchema),
  risks: z.record(menuRiskSchema).optional(),
  parserMode: z.enum(['mock', 'llm']),
  disclaimer: z.string(),
})

export type FoodPassport = z.infer<typeof foodPassportSchema>
export type MenuDish = z.infer<typeof menuDishSchema>
export type MenuAnalysisRequest = z.infer<typeof menuAnalysisRequestSchema>
export type MenuAnalysisResponse = z.infer<typeof menuAnalysisResponseSchema>
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>
