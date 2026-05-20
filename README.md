# Daily Journal

Voice-to-health journal — speak or type your day, get a structured timeline with health data points.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API key
```bash
cp .env.local.example .env.local
```
Then edit `.env.local` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Get a key at https://console.anthropic.com

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel

### Option A — Vercel CLI
```bash
npx vercel
```
When prompted, add the environment variable:
- `ANTHROPIC_API_KEY` → your key from console.anthropic.com

### Option B — Vercel Dashboard
1. Push this folder to a GitHub repo
2. Go to https://vercel.com/new and import the repo
3. Under "Environment Variables" add `ANTHROPIC_API_KEY`
4. Deploy

That's it. Vercel auto-detects Next.js.

## What it does

- **Log today** — type or speak a free-form description of your day
- **AI extraction** — Claude extracts energy, stress, mood, sleep, movement, alcohol, nutrition quality as structured data points
- **Timeline** — renders a narrative timeline of your day
- **History** — all entries saved locally in localStorage, persists across sessions
