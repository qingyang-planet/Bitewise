import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import menuRouter from './routes/menu.js'
import assistantRouter from './routes/assistant.js'

const app = express()
const configuredOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)

app.use(cors({ origin: (origin, callback) => {
  if (!origin || configuredOrigins.length === 0 || configuredOrigins.includes(origin)) return callback(null, true)
  return callback(new Error('CORS origin is not allowed.'))
} }))
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_request, response) => response.json({ ok: true, service: 'bitewise-api' }))
app.use('/api/menus', menuRouter)
app.use('/api/assistant', assistantRouter)

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ error: 'Image is too large. Please choose an image under 8 MB.' })
  if (error?.code === 'LIMIT_UNEXPECTED_FILE') return response.status(400).json({ error: 'Upload one menu image in the image field.' })
  if (error?.name === 'MulterError') return response.status(400).json({ error: 'The menu image upload could not be processed.' })
  if (error?.name === 'ZodError') return response.status(400).json({ error: 'The request is missing a required field or has an invalid value.' })
  if (error instanceof SyntaxError) return response.status(400).json({ error: 'Food Passport data must be valid JSON.' })
  console.error('[Bitewise API]', error instanceof Error ? error.message : 'request failed')
  return response.status(502).json({ error: 'Menu analysis failed. Please retry or use Sample Menu.' })
}

app.use(errorHandler)

export { app }
export default app
