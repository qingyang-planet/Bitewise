import type { Dish, MealPlanInput, MealPlanResult } from '../domain/types'

export function createMealPlan({ dishes, assessments, budget, partySize, tempPreference = '' }: MealPlanInput): MealPlanResult {
  const eligible = dishes.filter((dish) => assessments[dish.id]?.recommendationEligible)
  const withoutCilantro = tempPreference === 'No cilantro' ? eligible.filter((dish) => !dish.hasCilantro) : eligible
  const candidates = [...withoutCilantro].sort((a, b) => Number(b.vegetarian) - Number(a.vegetarian) || a.spicy - b.spicy || a.price - b.price)
  const target = Math.max(1, Math.min(5, partySize + 1))
  const selected: Dish[] = []
  let total = 0
  for (const dish of candidates) {
    if (selected.some((item) => item.id === dish.id)) continue
    if (tempPreference === 'One soup' && dish.category === 'soup' && selected.some((item) => item.category === 'soup')) continue
    if (total + dish.price > budget) continue
    selected.push(dish)
    total += dish.price
    if (selected.length >= target) break
  }
  return {
    dishes: selected,
    total,
    budget,
    partySize,
    valid: selected.length > 0 && total <= budget,
    reason: selected.length ? 'All selected dishes are from this menu, unique, eligible and within budget.' : 'No eligible dishes fit the current Food Passport and budget.',
  }
}
