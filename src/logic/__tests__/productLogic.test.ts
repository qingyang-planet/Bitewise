import { describe, expect, it } from 'vitest'
import { DEMO_MENU } from '../../data/demoMenu'
import type { Dish, Passport, RiskAssessment } from '../../domain/types'
import { createMealPlan } from '../createMealPlan'
import { evaluateDishRisk } from '../evaluateDishRisk'
import { generateDishQuestion, generateOrderRequest } from '../generateStaffMessage'
import { parseDemoMenu } from '../parseDemoMenu'

const passport = (overrides: Partial<Passport> = {}): Passport => ({ allergies: [], diets: [], preferences: [], severity: 'severe', crossContact: false, ...overrides })

describe('evaluateDishRisk', () => {
  it('returns MATCH as decision support, not a safety guarantee', () => {
    const result = evaluateDishRisk(DEMO_MENU.find((dish) => dish.id === 'greens')!, passport())
    expect(result.status).toBe('MATCH')
    expect(result.recommendationEligible).toBe(true)
    expect(result.reasons.join(' ')).toMatch(/not a safety guarantee/i)
  })

  it('returns CONFLICT before UNKNOWN when confirmed evidence conflicts', () => {
    const lowConfidenceDish: Dish = { ...DEMO_MENU[0], confidence: 0.2, allergens: ['soy'] }
    const result = evaluateDishRisk(lowConfidenceDish, passport({ allergies: ['soy'] }))
    expect(result.status).toBe('CONFLICT')
    expect(result.recommendationEligible).toBe(false)
  })

  it('returns WARNING for a related possible allergen and blocks severe recommendations', () => {
    const result = evaluateDishRisk(DEMO_MENU.find((dish) => dish.id === 'eggplant')!, passport({ allergies: ['soy'], severity: 'severe' }))
    expect(result.status).toBe('WARNING')
    expect(result.matchedRestrictions).toContain('soy')
    expect(result.recommendationEligible).toBe(false)
  })

  it('returns UNKNOWN for low-confidence evidence', () => {
    const result = evaluateDishRisk(DEMO_MENU.find((dish) => dish.id === 'soup')!, passport())
    expect(result.status).toBe('UNKNOWN')
    expect(result.recommendationEligible).toBe(false)
  })

  it('does not create unrelated cross-contact warnings for a passport without allergens', () => {
    const result = evaluateDishRisk(DEMO_MENU.find((dish) => dish.id === 'greens')!, passport({ crossContact: true }))
    expect(result.status).toBe('MATCH')
  })
})

describe('parseDemoMenu', () => {
  it('returns the same fixed fixture while recording the source', () => {
    const sample = parseDemoMenu('sample')
    const upload = parseDemoMenu('uploaded-image')
    expect(sample.parserMode).toBe('local-demo')
    expect(sample.source).toBe('sample')
    expect(upload.source).toBe('uploaded-image')
    expect(sample.dishes).toHaveLength(6)
    expect(sample.disclaimer).toMatch(/fixed local menu/i)
    expect(upload.dishes.map((dish) => dish.id)).toEqual(sample.dishes.map((dish) => dish.id))
  })
})

describe('createMealPlan', () => {
  it('deduplicates dishes, respects cumulative budget and excludes unknown/conflicts', () => {
    const user = passport()
    const assessments = Object.fromEntries(DEMO_MENU.map((dish) => [dish.id, evaluateDishRisk(dish, user)]))
    const result = createMealPlan({ dishes: DEMO_MENU, assessments, budget: 100, partySize: 3 })
    expect(new Set(result.dishes.map((dish) => dish.id)).size).toBe(result.dishes.length)
    expect(result.total).toBeLessThanOrEqual(100)
    expect(result.dishes.some((dish) => dish.id === 'soup')).toBe(false)
    expect(result.valid).toBe(true)
  })

  it('returns an empty invalid result when no eligible dish fits', () => {
    const assessments: Record<string, RiskAssessment> = Object.fromEntries(DEMO_MENU.map((dish) => [dish.id, { status: 'CONFLICT', reasons: ['blocked'], matchedRestrictions: ['soy'], recommendationEligible: false }]))
    const result = createMealPlan({ dishes: DEMO_MENU, assessments, budget: 200, partySize: 3 })
    expect(result.dishes).toEqual([])
    expect(result.total).toBe(0)
    expect(result.valid).toBe(false)
  })
})

describe('generateStaffMessage', () => {
  it('only names allergens selected in the Food Passport', () => {
    const question = generateDishQuestion(DEMO_MENU[0], passport({ allergies: ['soy'] }), 'en').chinese
    expect(question).toContain('大豆')
    expect(question).not.toContain('花生')
  })

  it('generates waiter content from the current plan and constraints', () => {
    const message = generateOrderRequest([DEMO_MENU[2]], passport({ allergies: ['soy'], diets: ['vegetarian'], preferences: ['no-cilantro'] }), 'No cilantro', 'en')
    expect(message.chinese).toContain('鱼香茄子')
    expect(message.chinese).toContain('素食')
    expect(message.chinese).toContain('严重的')
    expect(message.chinese).toContain('不要放香菜')
    expect(message.chinese).not.toContain('花生')
    expect(message.translation).toContain('Please prepare them as vegetarian')
    expect(message.translation).toContain('Do not add cilantro')
    expect(message.translation).not.toContain('不要放香菜')
  })
})
