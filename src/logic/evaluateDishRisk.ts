import type { Dish, Passport, RiskAssessment } from '../domain/types'

const intersection = (left: string[], right: string[]) => left.filter((value) => right.includes(value))

export function evaluateDishRisk(dish: Dish, passport: Passport): RiskAssessment {
  const confirmedAllergens = intersection(passport.allergies, dish.allergens)
  const strictDietConflicts: string[] = []
  if (passport.diets.includes('vegetarian') && !dish.vegetarian) strictDietConflicts.push('vegetarian')
  if (passport.diets.includes('vegan') && !dish.vegan) strictDietConflicts.push('vegan')
  if (passport.diets.includes('no-pork') && dish.hasPork) strictDietConflicts.push('no-pork')
  if (passport.diets.includes('no-beef') && dish.hasBeef) strictDietConflicts.push('no-beef')

  if (confirmedAllergens.length || strictDietConflicts.length) {
    return {
      status: 'CONFLICT',
      reasons: [...confirmedAllergens.map((item) => `Contains confirmed allergen: ${item}.`), ...strictDietConflicts.map((item) => `Conflicts with restriction: ${item}.`)],
      matchedRestrictions: [...confirmedAllergens, ...strictDietConflicts],
      recommendationEligible: false,
    }
  }

  const possibleAllergens = intersection(passport.allergies, dish.possibleAllergens ?? [])
  if (possibleAllergens.length) {
    return {
      status: 'WARNING',
      reasons: possibleAllergens.map((item) => `Possible ${item} exposure needs restaurant confirmation.`),
      matchedRestrictions: possibleAllergens,
      recommendationEligible: passport.severity !== 'severe',
    }
  }

  if (dish.confidence < 0.7) {
    return {
      status: 'UNKNOWN',
      reasons: ['The menu evidence is not complete enough to identify the ingredients reliably.'],
      matchedRestrictions: [],
      recommendationEligible: false,
    }
  }

  const uncertainCrossContact = passport.crossContact && passport.allergies.length > 0 && dish.confidence < 0.9
  const cilantroConflict = passport.preferences.includes('no-cilantro') && dish.hasCilantro
  if (uncertainCrossContact || cilantroConflict) {
    const reasons = []
    if (uncertainCrossContact) reasons.push('Kitchen cross-contact or shared equipment is not confirmed.')
    if (cilantroConflict) reasons.push('Contains cilantro, which is a selected preference.')
    return { status: 'WARNING', reasons, matchedRestrictions: cilantroConflict ? ['no-cilantro'] : [], recommendationEligible: passport.severity !== 'severe' || !uncertainCrossContact }
  }

  return {
    status: 'MATCH',
    reasons: ['No conflict found in the available menu evidence; this is decision support, not a safety guarantee.'],
    matchedRestrictions: [],
    recommendationEligible: true,
  }
}
