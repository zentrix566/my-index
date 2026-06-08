export const intervalTrainingSessions = [
  {
    date: '2026/5/11（周一）',
    laps: [
      { time: '02:03.55' },
      { time: '01:55.80' },
      { time: '01:56.84' },
      { time: '02:00.85' },
      { time: '01:50.85' },
      { time: '02:09.51' },
      { time: '02:02.23' },
      { time: '02:00.80' },
      { time: '01:57.33' },
      { time: '01:57.68' }
    ]
  },
  {
    date: '2026/5/13（周三）',
    laps: [
      { time: '02:00.39' },
      { time: '01:53.95' },
      { time: '02:01.16' },
      { time: '01:59.21' },
      { time: '02:05.00' },
      { time: '01:55.45' },
      { time: '02:07.38' },
      { time: '02:00.39' },
      { time: '02:05.80' },
      { time: '01:49.29' }
    ]
  },
  {
    date: '2026/5/14（周四）',
    laps: [
      { time: '02:03.31' },
      { time: '02:00.08' },
      { time: '02:05.35' },
      { time: '02:00.69' },
      { time: '02:06.59' },
      { time: '02:02.99' },
      { time: '02:03.20' },
      { time: '01:59.68' },
      { time: '02:02.23' },
      { time: '02:01.27' }
    ]
  },
  {
    date: '2026/5/18（周一）',
    laps: [
      { time: '01:55.00' },
      { time: '01:48.54' },
      { time: '01:56.90' },
      { time: '01:53.01' },
      { time: '01:56.05' },
      { time: '02:01.84' },
      { time: '01:58.14' },
      { time: '02:01.98' },
      { time: '02:00.65' },
      { time: '02:01.90' }
    ]
  },
  {
    date: '2026/6/3（周三）',
    laps: [
      { time: '01:56.90', pace: '4分52秒' },
      { time: '01:59.10', pace: '4分58秒' },
      { time: '02:00.92', pace: '5分02秒' },
      { time: '01:58.48', pace: '4分56秒' },
      { time: '01:59.21', pace: '4分58秒' },
      { time: '01:45.77', pace: '4分24秒' },
      { time: '02:06.34', pace: '5分16秒' },
      { time: '02:01.08', pace: '5分03秒' },
      { time: '02:01.03', pace: '5分03秒' },
      { time: '01:59.49', pace: '4分59秒' }
    ]
  },
  {
    date: '2026/6/5（周五）',
    laps: [
      { time: '01:53.14', pace: '4分43秒' },
      { time: '01:53.50', pace: '4分44秒' },
      { time: '01:54.87', pace: '4分47秒' },
      { time: '01:56.75', pace: '4分52秒' },
      { time: '01:51.09', pace: '4分38秒' },
      { time: '01:51.52', pace: '4分39秒' },
      { time: '01:54.36', pace: '4分46秒' },
      { time: '01:57.87', pace: '4分55秒' },
      { time: '01:54.54', pace: '4分46秒' },
      { time: '01:36.14', pace: '4分00秒' }
    ]
  }
]

export const INTERVAL_DISTANCE_KM = 0.4
export const weekdays = ['日', '一', '二', '三', '四', '五', '六']
export const ratingOrder = ['非常快', '比较快', '有点快', '优秀', '良', '一般', '差', '很差']

export const padNumber = (value) => String(value).padStart(2, '0')

export const formatDateKey = (date) => {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

export const parseSessionDate = (dateText) => {
  const match = String(dateText).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export const formatDisplayDate = (dateText) => {
  if (dateText.includes('（')) return dateText
  const date = parseSessionDate(dateText)
  return date ? `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（周${weekdays[date.getDay()]}）` : dateText
}

export const getSessionDateKey = (session) => {
  const date = parseSessionDate(session.date)
  return date ? formatDateKey(date) : session.date
}

export const timeToSeconds = (timeText) => {
  const [minutes, seconds] = String(timeText).split(':')
  return Number(minutes) * 60 + Number(seconds)
}

export const paceToSeconds = (paceText) => {
  const match = String(paceText || '').match(/(\d+)分(\d{1,2})(?:秒)?/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

export const secondsToPace = (seconds) => {
  const roundedSeconds = Math.round(seconds)
  return `${Math.floor(roundedSeconds / 60)}分${padNumber(roundedSeconds % 60)}秒`
}

export const getRating = (seconds) => {
  if (seconds < 110) return '非常快'
  if (seconds >= 110 && seconds < 115) return '比较快'
  if (seconds >= 115 && seconds < 117) return '有点快'
  if (seconds >= 119 && seconds <= 121) return '优秀'
  if ((seconds >= 117 && seconds < 119) || (seconds > 121 && seconds <= 123)) return '良'
  if (seconds > 123 && seconds <= 125) return '一般'
  if (seconds > 125 && seconds <= 130) return '差'
  return '很差'
}

export const normalizeLap = (lap) => {
  const durationSeconds = Number(lap.durationSeconds ?? lap.seconds ?? timeToSeconds(lap.time))
  const paceSeconds = Number(lap.paceSeconds ?? paceToSeconds(lap.pace) ?? durationSeconds / INTERVAL_DISTANCE_KM)

  return {
    ...lap,
    durationSeconds,
    seconds: durationSeconds,
    paceSeconds,
    pace: secondsToPace(paceSeconds),
    rating: getRating(durationSeconds)
  }
}

export const normalizeSessions = (sessions) => {
  return sessions
    .map((session) => ({
      ...session,
      date: formatDisplayDate(session.date),
      laps: session.laps.map(normalizeLap)
    }))
    .sort((a, b) => (parseSessionDate(b.date) || 0) - (parseSessionDate(a.date) || 0))
}

export const parseLapLine = (line) => {
  const match = line.match(/^(\d{2}:\d{2}\.\d{2})(?:\s+(\d+分\d{1,2}(?:秒)?))?$/)
  if (!match) return null

  return {
    time: match[1],
    ...(match[2] ? { pace: match[2].endsWith('秒') ? match[2] : `${match[2]}秒` } : {})
  }
}
