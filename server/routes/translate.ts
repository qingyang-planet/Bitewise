import { Router } from 'express'
import { z } from 'zod'
import { translateText } from '../services/translation.js'

const router = Router()
const translateRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  sourceLanguage: z.string().trim().min(2).max(20).default('zh-CN'),
  targetLanguage: z.string().trim().min(2).max(20).default('en'),
})

router.post('/', async (request, response) => {
  try {
    const input = translateRequestSchema.parse(request.body)
    const translation = await translateText(input)
    return response.json({ translation })
  } catch (error) {
    console.error('[Bitewise translation]', error instanceof Error ? error.message : 'request failed')
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Please provide valid text and language codes.' })
    return response.status(502).json({ error: 'Translation failed. Please try again.' })
  }
})

export default router
