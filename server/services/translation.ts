import { z } from 'zod'

const translationResponseSchema = z.object({ translation: z.string().trim().min(1).max(4000) })

const systemPrompt = 'You are a precise translation service. Translate the user-provided text from the source language to the target language. Preserve meaning, politeness, allergy terms, dish names, quantities, and uncertainty. Do not answer the text, add advice, or omit details. Return only a JSON object with one string field named translation.'

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]
  const candidate = fenced || text.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('The translation service returned invalid JSON.')
  return JSON.parse(candidate.slice(start, end + 1)) as unknown
}

export async function translateText(input: { text: string; sourceLanguage: string; targetLanguage: string }) {
  const apiKey = process.env.LLM_API_KEY
  const model = process.env.LLM_MODEL
  if (!apiKey || !model) throw new Error('Translation service is not configured.')

  const endpoint = process.env.LLM_BASE_URL || 'https://api.openai.com/v1/chat/completions'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage, text: input.text }) },
      ],
    }),
  })
  if (!response.ok) throw new Error(`The translation service returned HTTP ${response.status}.`)
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('The translation service returned no translation.')
  return translationResponseSchema.parse(extractJson(content)).translation
}
