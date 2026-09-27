import type { FoodPassport, MenuDish } from '../schemas/menu.js'

export type RiskStatus = 'MATCH' | 'WARNING' | 'CONFLICT' | 'UNKNOWN'
export type RiskAssessment = { status: RiskStatus; reasons: string[]; matchedRestrictions: string[]; recommendationEligible: boolean }

const allergenAliases: Record<string, string[]> = {
  crustacean: ['crustacean', 'shellfish'],
  mollusk: ['mollusk', 'shellfish'],
  'tree-nut': ['tree-nut', 'nut'],
}
const aliasesFor = (value: string) => allergenAliases[value] || [value]
const overlaps = (left: string[], right: string[]) => left.some((value) => aliasesFor(value).some((alias) => right.includes(alias)))

function hasDiet(passport: FoodPassport, ...values: string[]) {
  return values.some((value) => passport.diets.includes(value) || passport.avoidFoods.includes(value) || passport.dietStyle === value)
}

function strictDietConflicts(dish: MenuDish, passport: FoodPassport): string[] {
  const conflicts: string[] = []
  const vegetarian = passport.dietStyle && ['vegetarian', 'lacto', 'ovo', 'lacto-ovo', 'flexitarian'].includes(passport.dietStyle)
  if ((vegetarian || passport.diets.includes('vegetarian')) && dish.vegetarian === false) conflicts.push('vegetarian')
  if ((passport.dietStyle === 'vegan' || passport.diets.includes('vegan')) && dish.vegan === false) conflicts.push('vegan')
  if (hasDiet(passport, 'no-pork') && dish.hasPork) conflicts.push('no-pork')
  if (hasDiet(passport, 'no-beef') && dish.hasBeef) conflicts.push('no-beef')
  if (hasDiet(passport, 'no-poultry') && dish.hasPoultry) conflicts.push('no-poultry')
  if (hasDiet(passport, 'no-seafood') && dish.hasSeafood) conflicts.push('no-seafood')
  if (hasDiet(passport, 'no-offal') && dish.hasOffal) conflicts.push('no-offal')
  if (passport.faithDiet === 'halal' && dish.hasPork) conflicts.push('halal')
  if (passport.faithDiet === 'kosher' && (dish.hasPork || dish.hasSeafood)) conflicts.push('kosher')
  return conflicts
}

function hasUnknownDietEvidence(dish: MenuDish, passport: FoodPassport) {
  const vegetarian = passport.dietStyle && ['vegetarian', 'lacto', 'ovo', 'lacto-ovo', 'flexitarian'].includes(passport.dietStyle)
  const vegan = passport.dietStyle === 'vegan' || passport.diets.includes('vegan')
  return (Boolean(vegetarian || passport.diets.includes('vegetarian')) && dish.vegetarian === undefined) || (vegan && dish.vegan === undefined)
}

export function evaluateDishRisk(dish: MenuDish, passport: FoodPassport): RiskAssessment {
  const confirmedAllergens = passport.allergies.filter((allergen) => overlaps([allergen], dish.allergens))
  const dietConflicts = strictDietConflicts(dish, passport)
  if (confirmedAllergens.length || dietConflicts.length) {
    return {
      status: 'CONFLICT',
      reasons: [
        ...confirmedAllergens.map((allergen) => `Contains confirmed allergen: ${allergen}.`),
        ...dietConflicts.map((restriction) => `Conflicts with restriction: ${restriction}.`),
      ],
      matchedRestrictions: [...confirmedAllergens, ...dietConflicts],
      recommendationEligible: false,
    }
  }

  const possibleAllergens = passport.allergies.filter((allergen) => overlaps([allergen], dish.possibleAllergens))
  const unknownEvidence = dish.possibleAllergens.includes('unknown') || dish.ingredients.includes('unknown')
  if (possibleAllergens.length || unknownEvidence) {
    return {
      status: 'WARNING',
      reasons: [
        ...possibleAllergens.map((allergen) => `Possible ${allergen} exposure needs restaurant confirmation.`),
        ...(unknownEvidence ? ['The menu does not identify every ingredient.'] : []),
      ],
      matchedRestrictions: possibleAllergens.length ? possibleAllergens : ['unknown'],
      recommendationEligible: passport.severity !== 'severe',
    }
  }

  if (dish.confidence < 0.7 || hasUnknownDietEvidence(dish, passport)) return { status: 'UNKNOWN', reasons: ['The menu evidence is not complete enough to identify the ingredients reliably.'], matchedRestrictions: [], recommendationEligible: false }

  const crossContactWarning = passport.crossContact && passport.allergies.length > 0 && dish.confidence < 0.9
  const preferenceWarning = passport.preferences.includes('no-cilantro') && dish.hasCilantro === true
  const spiceWarning = passport.spiceLevel !== null && passport.spiceLevel !== undefined && dish.spicy !== null && dish.spicy > passport.spiceLevel
  if (crossContactWarning || preferenceWarning || spiceWarning) {
    const reasons: string[] = []
    if (crossContactWarning) reasons.push('Kitchen cross-contact or shared equipment is not confirmed.')
    if (preferenceWarning) reasons.push('Contains cilantro, which is a selected preference.')
    if (spiceWarning) reasons.push('The dish is spicier than the selected preference.')
    return {
      status: 'WARNING',
      reasons,
      matchedRestrictions: [...(crossContactWarning ? ['cross-contact'] : []), ...(preferenceWarning ? ['no-cilantro'] : []), ...(spiceWarning ? ['spice-level'] : [])],
      recommendationEligible: passport.severity !== 'severe' || !crossContactWarning,
    }
  }

  return { status: 'MATCH', reasons: ['No conflict found in the available menu evidence; this is decision support, not a safety guarantee.'], matchedRestrictions: [], recommendationEligible: true }
}

export function evaluateMenuRisks(dishes: MenuDish[], passport?: FoodPassport) {
  if (!passport) return undefined
  return Object.fromEntries(dishes.map((dish) => [dish.id, evaluateDishRisk(dish, passport)]))
}
