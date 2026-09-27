import { createRequire } from 'node:module'
import type { MenuDish } from '../schemas/menu.js'

type KnowledgeDish = {
  nameZh: string
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

const knowledgeDishes = (knowledgeData.dishes || []) as KnowledgeDish[]
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '')

function findKnowledge(dish: MenuDish) {
  const name = normalize(`${dish.zh}${dish.name}`)
  return knowledgeDishes.find((candidate) => name.includes(normalize(candidate.nameZh)) || normalize(candidate.nameZh).includes(normalize(dish.zh)))
}

export function enrichDishWithKnowledge(dish: MenuDish): MenuDish {
  const knowledge = findKnowledge(dish)
  if (!knowledge) return dish
  const possibleAllergens = [...(knowledge.commonAllergens || []), ...(knowledge.possibleAllergens || [])]
    .map((label) => allergenIds[label])
    .filter((id): id is string => Boolean(id))
  return { ...dish, possibleAllergens: [...new Set([...(dish.possibleAllergens || []), ...possibleAllergens])] }
}

export function enrichMenuWithKnowledge(dishes: MenuDish[]) {
  return dishes.map(enrichDishWithKnowledge)
}
