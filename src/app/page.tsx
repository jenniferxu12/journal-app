'use client'

import { useState, useEffect, useRef } from 'react'
import { JournalEntry, DataPoints } from './types'
import styles from './page.module.css'

const STORAGE_KEY = 'journal-entries-v1'

const CHIP_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  energy:    { bg: '#FAEEDA', color: '#854F0B', border: '#FAC775' },
  stress:    { bg: '#FCEBEB', color: '#A32D2D', border: '#F09595' },
  mood:      { bg: '#EAF3DE', color: '#3B6D11', border: '#C0DD97' },
  sleep:     { bg: '#E6F1FB', color: '#185FA5', border: '#B5D4F4' },
  movement:  { bg: '#E1F5EE', color: '#0F6E56', border: '#9FE1CB' },
  nutrition: { bg: '#EEEDFE', color: '#534AB7', border: '#CECBF6' },
  alcohol:   { bg: '#FBEAF0', color: '#993556', border: '#F4C0D1' },
}

function getChips(dp: DataPoints) {
  return Object.entries(dp).filter(([, v]) => {
    if (!v) return false
    return Object.values(v).some(x => x !== null && x !== undefined)
  })
}

function Chip({ label, type, small }: { label: string; type: string; small?: boolean }) {
  const s = CHIP_STYLES[type] || { bg: '#f0f0f0', color: '#555', border: '#ddd' }
  return (
    <span style={{
      fontSize: small ? 11 : 12,
      padding: small ? '2px 8px' : '4px 10px',
      borderRadius: 20,
      background: s.bg,
      color: s.color,
      border: `0.5px solid ${s.border}`,
      display: 'inline-block',
    }}>
      {label}
    </span>
  )
}

export default function Home() {
  const [tab, setTab] = useState<'log' | 'history'>('log')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('Analysing your day…')
  const [error, setError] = useState('')
  const [result, setResult] = useState<JournalEntry | null>(null)
  const [viewing, setViewing] = useState<JournalEntry | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setEntries(JSON.parse(stored))
    } catch { }
  }, [])

  function saveEntries(updated: JournalEntry[]) {
    setEntries(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch { }
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }
    const SR = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SR) { setError('Speech recognition not supported in this browser. Try Chrome.'); return }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    let final = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      setText(final + interim)
    }
    rec.onerror = () => setIsRecording(false)
    rec.onend = () => setIsRecording(false)
    rec.start()
    recognitionRef.current = rec
    setIsRecording(true)
  }

  async function generate() {
    if (!text.trim() || text.trim().length < 10) { setError('Tell us a bit more about your day.'); return }
    setError('')
    setLoading(true)
    const msgs = ['Analysing your day…', 'Extracting data points…', 'Building your timeline…']
    let mi = 0
    tickerRef.current = setInterval(() => { setLoadMsg(msgs[++mi % msgs.length]) }, 1800)
    try {
      const resp = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'API error')
      const entry: JournalEntry = { id: Date.now(), date: today, raw: text.trim(), ...data }
      const updated = [entry, ...entries]
      saveEntries(updated)
      setResult(entry)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      if (tickerRef.current) clearInterval(tickerRef.current)
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setText('')
    setError('')
  }

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>{loadMsg}</p>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className={styles.wrap}>
        <EntryView entry={result} onBack={reset} backLabel="← Log a different entry" />
      </div>
    )
  }

  if (viewing) {
    return (
      <div className={styles.wrap}>
        <EntryView entry={viewing} onBack={() => setViewing(null)} backLabel="← Back to history" />
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1>Daily journal</h1>
        <p>Describe your day — we'll extract the data</p>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'log' ? styles.active : ''}`} onClick={() => setTab('log')}>Log today</button>
        <button className={`${styles.tab} ${tab === 'history' ? styles.active : ''}`} onClick={() => setTab('history')}>History</button>
      </div>

      {tab === 'log' && (
        <div>
          <p className={styles.dateLabel}>{today}</p>
          <div className={styles.promptCard}>
            <p className={styles.promptTitle}>Cover what you can</p>
            <div className={styles.pills}>
              {['what you ate', 'energy levels', 'stress & mood', 'movement', 'sleep last night', 'alcohol'].map(p => (
                <span key={p} className={styles.pill}>{p}</span>
              ))}
            </div>
          </div>

          <div className={styles.micRow}>
            <button
              className={`${styles.micBtn} ${isRecording ? styles.recording : ''}`}
              onClick={toggleRecording}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? '⏹' : '🎙'}
            </button>
            <span className={styles.micLabel}>{isRecording ? 'Recording… tap to stop' : 'Tap to record'}</span>
          </div>

          <textarea
            className={styles.textarea}
            value={text}
            onChange={e => { setText(e.target.value); setError('') }}
            placeholder="e.g. Had eggs for breakfast, felt pretty tired all day, stressful meetings in the afternoon, walked about 20 minutes, pasta for dinner with a glass of wine, energy maybe a 5 out of 10…"
            rows={5}
          />

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.primaryBtn}
            onClick={generate}
            disabled={text.trim().length < 10}
          >
            Generate journal entry
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {entries.length === 0 ? (
            <div className={styles.empty}>No entries yet. Log your first day.</div>
          ) : (
            entries.map(e => (
              <div key={e.id} className={styles.historyItem} onClick={() => setViewing(e)}>
                <p className={styles.histDate}>{e.date}</p>
                <p className={styles.histSummary}>{e.summary}</p>
                <div className={styles.chipRow}>
                  {getChips(e.dataPoints).slice(0, 4).map(([k, v]) => (
                    <Chip key={k} type={k} label={v!.label} small />
                  ))}
                </div>
              </div>
            ))
          )}
          <button className={styles.secondaryBtn} onClick={() => setTab('log')}>+ Log today</button>
        </div>
      )}
    </div>
  )
}

function EntryView({ entry, onBack, backLabel }: { entry: JournalEntry; onBack: () => void; backLabel: string }) {
  const chips = getChips(entry.dataPoints)
  return (
    <div>
      <button className={styles.backBtn} onClick={onBack}>{backLabel}</button>
      <p className={styles.dateLabel}>{entry.date}</p>
      <h2 className={styles.entryTitle}>{entry.summary}</h2>
      {chips.length > 0 && (
        <div className={styles.chipRow} style={{ marginBottom: '1.5rem' }}>
          {chips.map(([k, v]) => <Chip key={k} type={k} label={v!.label} />)}
        </div>
      )}
      <p className={styles.sectionLabel}>Timeline</p>
      <div className={styles.timeline}>
        {entry.timeline.map((t, i) => (
          <div key={i} className={styles.tlItem}>
            <p className={styles.tlTime}>{t.time}</p>
            <p className={styles.tlText}>{t.text}</p>
          </div>
        ))}
      </div>
      {entry.insight && (
        <>
          <p className={styles.sectionLabel}>Today's insight</p>
          <div className={styles.insightCard}>{entry.insight}</div>
        </>
      )}
    </div>
  )
}
