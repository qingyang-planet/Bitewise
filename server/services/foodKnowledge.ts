import { createRequire } from 'node:module'
import type { EvidenceSource, MenuDish } from '../schemas/menu.js'

type KnowledgeDish = {
  id: string
  nameZh: string
  nameEn: string
  aliases?: string[]
  ingredients?: string[]
  commonAllergens?: string[]
  possibleAllergens?: string[]
}

type KnowledgeData = { dishes?: KnowledgeDish[] }
const require = createRequire(import.meta.url)
const knowledgeData = require('../../public/data/chinese-food-knowledge.json') as KnowledgeData

const allergenIds: Record<string, string> = {
  '小麦（含麸质）': 'wheat',
  甲壳类: 'crustacean',
  鸡蛋: 'egg',
  鱼类: 'fish',
  大豆: 'soy',
  乳类: 'milk',
  花生: 'peanut',
  芝麻: 'sesame',
  软体动物: 'mollusk',
  坚果: 'tree-nut',
  芹菜: 'celery',
}

const ingredientEnglish: Record<string, string> = {
  食用油: 'cooking oil',
  辣椒: 'chili',
  鲜辣椒: 'fresh chili',
  花椒: 'Sichuan pepper',
  葱姜蒜: 'scallion, ginger and garlic',
  葱姜: 'scallion and ginger',
  葱蒜: 'scallion and garlic',
  酱油: 'soy sauce',
  '酱油或豆瓣酱': 'soy sauce or chili bean paste',
  '豆豉或酱油': 'fermented black beans or soy sauce',
  '大豆制品': 'soy products',
  '豆制品或面粉': 'soy products or flour',
  豆瓣酱: 'chili bean paste',
  高汤: 'stock',
  '高汤或蚝油': 'stock or oyster sauce',
  '米粉或小麦粉（视菜品）': 'rice flour or wheat flour, depending on the dish',
  '面粉或淀粉（视菜品）': 'flour or starch, depending on the dish',
  '米线或米制品': 'rice noodles or rice products',
  '米或小麦面粉': 'rice or wheat flour',
  '肉类或豆制品': 'meat or soy products',
  '海鲜或水产': 'seafood',
  鱼类: 'fish',
  鸡蛋: 'egg',
  乳制品: 'dairy',
  坚果: 'tree nuts',
  花生: 'peanuts',
  '芝麻或芝麻酱': 'sesame or tahini',
  芹菜: 'celery',
}

const knowledgeDishes = (knowledgeData.dishes || []) as KnowledgeDish[]
const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
const unique = <T,>(items: T[]) => [...new Set(items)]
const sourcePriority: Record<EvidenceSource, number> = { unknown: 1, knowledge: 2, menu: 3 }

function candidateNames(candidate: KnowledgeDish) {
  return [candidate.nameZh, candidate.nameEn, ...(candidate.aliases || [])].filter(Boolean)
}

function findKnowledge(dish: MenuDish) {
  const menuNames = [dish.zh, dish.name, ...Object.values(dish.localized || {})].map(normalize).filter(Boolean)
  const exact = knowledgeDishes.find((candidate) => candidateNames(candidate).some((name) => menuNames.includes(normalize(name))))
  if (exact) return exact
  return knowledgeDishes.find((candidate) => candidateNames(candidate).some((name) => {
    const normalized = normalize(name)
    return normalized.length >= 4 && menuNames.some((menuName) => menuName.length >= 4 && (menuName.includes(normalized) || normalized.includes(menuName)))
  }))
}

function ingredientEvidence(dish: MenuDish, knowledge?: KnowledgeDish) {
  const items = [
    ...(dish.ingredients || []).map((label) => ({ label, source: label.toLowerCase() === 'unknown' ? 'unknown' as const : 'menu' as const })),
    ...(knowledge?.ingredients || []).map((label) => ({ label: ingredientEnglish[label] || label, labelZh: label, source: 'knowledge' as const })),
  ]
  const byLabel = new Map<string, { label: string; labelZh?: string; source: EvidenceSource }>()
  items.forEach((item) => {
    const key = normalize(item.label)
    const current = byLabel.get(key)
    if (!current || sourcePriority[item.source] > sourcePriority[current.source]) byLabel.set(key, item)
  })
  if (!byLabel.size) byLabel.set('unknown', { label: 'Unknown ingredient detail', source: 'unknown' })
  return [...byLabel.values()]
}

function allergenEvidence(dish: MenuDish, knowledge?: KnowledgeDish) {
  const evidence = new Map<string, { id: string; label?: string; source: EvidenceSource }>()
  const add = (id: string, source: EvidenceSource, label?: string) => {
    const current = evidence.get(id)
    if (!current || sourcePriority[source] > sourcePriority[current.source]) evidence.set(id, { id, label, source })
  }
  ;(dish.allergens || []).forEach((id) => add(id, 'menu'))
  ;(dish.possibleAllergens || []).forEach((id) => add(id, 'unknown'))
  ;(knowledge?.commonAllergens || []).forEach((label) => { const id = allergenIds[label]; if (id) add(id, 'knowledge', label) })
  ;(knowledge?.possibleAllergens || []).forEach((label) => { const id = allergenIds[label]; if (id) add(id, 'knowledge', label) })
  return [...evidence.values()]
}

export function enrichDishWithKnowledge(dish: MenuDish): MenuDish {
  const knowledge = findKnowledge(dish)
  const ingredientItems = ingredientEvidence(dish, knowledge)
  const allergenItems = allergenEvidence(dish, knowledge)
  const knowledgePossible = (knowledge?.commonAllergens || []).concat(knowledge?.possibleAllergens || [])
    .map((label) => allergenIds[label])
    .filter((id): id is string => Boolean(id))
  return {
    ...dish,
    possibleAllergens: unique([...(dish.possibleAllergens || []), ...knowledgePossible]).filter((id) => !(dish.allergens || []).includes(id)),
    ingredientEvidence: ingredientItems,
    allergenEvidence: allergenItems,
    ...(knowledge ? {
      knowledgeMatch: { id: knowledge.id, nameZh: knowledge.nameZh, nameEn: knowledge.nameEn, aliases: knowledge.aliases || [] },
    } : {}),
  }
}

export function enrichMenuWithKnowledge(dishes: MenuDish[]) {
  return dishes.map(enrichDishWithKnowledge)
}
