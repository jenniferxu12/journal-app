import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a health data extraction engine. Given a natural language journal entry about someone's day, extract structured health data and generate a timeline narrative.

Return ONLY valid JSON with no markdown, no backticks, no preamble:
{
  "summary": "one sentence summary of the day, 10-15 words",
  "dataPoints": {
    "energy": {"value": null_or_1to10, "label": "e.g. 6/10"},
    "stress": {"value": null_or_1to10, "label": "e.g. high"},
    "mood": {"value": null_or_1to10, "label": "e.g. okay"},
    "sleep": {"hours": null_or_number, "label": "e.g. 7h"},
    "movement": {"minutes": null_or_number, "label": "e.g. 20 min walk"},
    "alcohol": {"units": null_or_number, "label": "e.g. 1 unit"},
    "nutrition": {"quality": null_or_1to10, "label": "e.g. moderate"}
  },
  "timeline": [
    {"time": "e.g. Morning or 7:30am", "text": "warm narrative description, 1-2 sentences"}
  ],
  "insight": "one short warm non-prescriptive observation about today, 1-2 sentences"
}

Rules:
- Use null for anything not mentioned — never guess or fabricate
- 3-6 timeline entries covering the arc of the day
- Warm, personal, non-judgmental tone throughout
- The insight should notice patterns or connections, not give advice`

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: 'Entry too short' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: text }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
