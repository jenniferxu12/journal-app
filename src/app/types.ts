export interface DataPoint {
  value?: number | null
  hours?: number | null
  minutes?: number | null
  units?: number | null
  quality?: number | null
  label: string
}

export interface DataPoints {
  energy?: DataPoint
  stress?: DataPoint
  mood?: DataPoint
  sleep?: DataPoint
  movement?: DataPoint
  alcohol?: DataPoint
  nutrition?: DataPoint
}

export interface TimelineItem {
  time: string
  text: string
}

export interface JournalEntry {
  id: number
  date: string
  raw: string
  summary: string
  dataPoints: DataPoints
  timeline: TimelineItem[]
  insight?: string
}
