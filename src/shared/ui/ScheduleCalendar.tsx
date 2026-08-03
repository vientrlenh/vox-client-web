import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

export type ScheduleCalendarEvent = {
  id: string
  title: string
  startDate?: string | null
  endDate?: string | null
  roomLabel?: string | null
  badges?: ReactNode
  action?: ReactNode
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return startOfDay(next)
}

function dateKey(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(value?: string | null) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  const gridStart = addDays(first, -mondayOffset)
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
}

export function ScheduleCalendar({
  events,
  emptyAllMessage,
  emptyDayMessage,
}: {
  events: ScheduleCalendarEvent[]
  emptyAllMessage: string
  emptyDayMessage: string
}) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [visibleMonth, setVisibleMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [monthOpen, setMonthOpen] = useState(false)
  const selectedKey = dateKey(selectedDate)
  const eventDateKeys = useMemo(() => new Set(events.map((event) => dateKey(event.startDate)).filter(Boolean)), [events])
  const selectedEvents = useMemo(
    () => events
      .filter((event) => dateKey(event.startDate) === selectedKey)
      .sort((left, right) => (left.startDate ?? '').localeCompare(right.startDate ?? '')),
    [events, selectedKey],
  )
  const weekStart = addDays(selectedDate, -((selectedDate.getDay() + 6) % 7))
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  return (
    <div className="mt-5 grid gap-5">
      <div className="border-y border-slate-200 bg-white px-3 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <button
            aria-label="Tuần trước"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-bold text-slate-900">
            {new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(selectedDate)}
          </p>
          <div className="flex items-center gap-2">
            <button
              aria-label="Mở lịch tháng"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-cyan-700 hover:bg-cyan-50"
              onClick={() => {
                setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
                setMonthOpen(true)
              }}
              title="Lịch tháng"
              type="button"
            >
              <CalendarDays className="size-4" />
            </button>
            <button
              aria-label="Tuần sau"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map((day) => {
            const active = dateKey(day) === selectedKey
            const isToday = dateKey(day) === dateKey(today)
            return (
              <button
                className={`relative min-h-18 rounded-lg px-1 py-2 text-center transition ${active ? 'bg-cyan-600 text-white' : 'hover:bg-slate-50'}`}
                key={dateKey(day)}
                onClick={() => setSelectedDate(day)}
                type="button"
              >
                <span className={`block text-[11px] font-bold uppercase ${active ? 'text-cyan-50' : 'text-slate-400'}`}>
                  {new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(day)}
                </span>
                <span className={`mt-1 block text-base font-extrabold ${!active && isToday ? 'text-cyan-700' : ''}`}>{day.getDate()}</span>
                {eventDateKeys.has(dateKey(day)) ? (
                  <span className={`absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full ${active ? 'bg-white' : 'bg-cyan-500'}`} />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-base font-extrabold text-slate-900">
          {dateKey(selectedDate) === dateKey(today) ? 'Hôm nay' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(selectedDate)}
        </h2>
        {events.length === 0 ? (
          <div className="mt-3 border-y border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">{emptyAllMessage}</div>
        ) : selectedEvents.length === 0 ? (
          <div className="mt-3 border-y border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">{emptyDayMessage}</div>
        ) : (
          <div className="mt-3 divide-y divide-slate-100 border-y border-slate-200 bg-white">
            {selectedEvents.map((event) => (
              <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5" key={event.id}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{event.title}</p>
                    {event.badges}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{formatTime(event.startDate)} - {formatTime(event.endDate)}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{event.roomLabel || 'Chưa xếp phòng'}</span>
                  </div>
                </div>
                {event.action}
              </div>
            ))}
          </div>
        )}
      </div>

      {monthOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="presentation">
          <div aria-modal="true" className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" role="dialog">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button aria-label="Tháng trước" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-slate-100" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} type="button"><ChevronLeft className="size-4" /></button>
                <p className="min-w-36 text-center font-extrabold text-slate-900">{new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(visibleMonth)}</p>
                <button aria-label="Tháng sau" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-slate-100" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} type="button"><ChevronRight className="size-4" /></button>
              </div>
              <button aria-label="Đóng lịch tháng" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-slate-100" onClick={() => setMonthOpen(false)} type="button"><X className="size-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-7 text-center text-xs font-bold text-slate-400">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => <span className="py-2" key={label}>{label}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells(visibleMonth).map((day) => {
                const currentMonth = day.getMonth() === visibleMonth.getMonth()
                const active = dateKey(day) === selectedKey
                return (
                  <button className={`relative aspect-square rounded-lg text-sm font-bold ${active ? 'bg-cyan-600 text-white' : currentMonth ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300'}`} key={dateKey(day)} onClick={() => { setSelectedDate(day); setMonthOpen(false) }} type="button">
                    {day.getDate()}
                    {eventDateKeys.has(dateKey(day)) ? <span className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${active ? 'bg-white' : 'bg-cyan-500'}`} /> : null}
                  </button>
                )
              })}
            </div>
            <button className="mt-4 text-sm font-bold text-cyan-700 hover:text-cyan-900" onClick={() => { setSelectedDate(today); setMonthOpen(false) }} type="button">Hôm nay</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
