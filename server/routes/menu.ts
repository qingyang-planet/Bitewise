import { Router } from 'express'
import multer from 'multer'
import { menuAnalysisRequestSchema } from '../schemas/menu.js'
import { evaluateMenuRisks } from '../services/dietaryRules.js'
import { analyzeMenu } from '../services/llm.js'

const router = Router()
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => callback(null, allowedMimeTypes.has(file.mimetype)),
})

router.post('/analyze', upload.single('image'), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ error: 'Please upload a JPEG, PNG, or WebP menu image.' })
    if (!allowedMimeTypes.has(request.file.mimetype)) return response.status(415).json({ error: 'Unsupported image format. Use JPEG, PNG, or WebP.' })
    const rawPassport = request.body.foodPassport ? JSON.parse(request.body.foodPassport) : undefined
    const input = menuAnalysisRequestSchema.parse({ restaurantName: request.body.restaurantName, language: request.body.language || 'en', foodPassport: rawPassport })
    const result = await analyzeMenu({ ...input, image: { buffer: request.file.buffer, mimeType: request.file.mimetype } })
    const risks = evaluateMenuRisks(result.dishes, input.foodPassport)
    return response.json({ ...result, ...(risks ? { risks } : {}) })
  } catch (error) {
    return next(error)
  }
})

export default router
