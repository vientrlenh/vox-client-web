import { useMemo, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const VIETNAMESE_CHARS_PATTERN = /[àáạảãăằắặẳẵâầấậẩẫđèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i

function containsVietnamese(text?: string | null): boolean {
  return !!text && VIETNAMESE_CHARS_PATTERN.test(text)
}

export type PhonemeFeedback = {
  accuracyScore?: number | null
  color?: string | null
  level?: string | null
  note?: string | null
  phoneme: string
}

export type WordFeedback = {
  accuracyScore?: number | null
  color?: string | null
  errorNote?: string | null
  level?: string | null
  phonemes?: PhonemeFeedback[] | null
  word: string
}

const WORD_COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-amber-100 text-amber-800',
}

const DOT_COLOR_CLASSES: Record<string, string> = {
  gray: 'bg-slate-400',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  yellow: 'bg-amber-500',
}

function getWordColorClass(color?: string | null) {
  return WORD_COLOR_CLASSES[color?.toLowerCase() ?? ''] ?? WORD_COLOR_CLASSES.gray
}

function getDotColorClass(color?: string | null) {
  return DOT_COLOR_CLASSES[color?.toLowerCase() ?? ''] ?? DOT_COLOR_CLASSES.gray
}

function formatAccuracy(score?: number | null) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return null
  }
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: score % 1 === 0 ? 0 : 1,
    minimumFractionDigits: score % 1 === 0 ? 0 : 1,
  }).format(score)
}

export function WordFeedbackText({
  fallbackTranscript,
  words,
}: {
  fallbackTranscript?: string | null
  words: WordFeedback[]
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const selectedWord = selectedIndex == null ? null : words[selectedIndex] ?? null
  // Prefer fallbackTranscript (corrected_transcript from the backend) over rebuilding text
  // from the word tags -- the pronunciation-assessment recognizer is fixed to English only,
  // so a code-switched Vietnamese word never appears in `words` at all and would silently
  // vanish from this line if rebuilt from `words`. fallbackTranscript is the accurate record
  // of what was actually said (Vietnamese included); the tags above it are a narrower view
  // (only the words Azure could assess for English pronunciation), and that mismatch is
  // expected -- phoneme scoring for non-English words isn't meaningful anyway.
  const wordsOnlyTranscript = useMemo(() => words.map((word) => word.word).join(' '), [words])
  const transcript = fallbackTranscript && fallbackTranscript.trim() ? fallbackTranscript : wordsOnlyTranscript

  if (words.length === 0) {
    // No phoneme/pronunciation feedback for this turn (e.g. it was rejected by validity before
    // pronunciation assessment ran) -- still show whatever the student actually said, plain text,
    // rather than just a "no data" placeholder. Works for any language/script, including
    // code-switched Vietnamese, since it's rendered as-is with no word-level parsing.
    return fallbackTranscript && fallbackTranscript.trim() ? (
      <p className="text-sm leading-6 text-slate-700">{fallbackTranscript}</p>
    ) : (
      <p className="text-sm text-slate-400">Chưa có word feedback cho turn này.</p>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap gap-1.5">
          {words.map((word, index) => (
            <button
              className={`rounded-md px-2 py-1 text-sm font-semibold transition hover:brightness-95 ${getWordColorClass(word.color)} ${
                selectedIndex === index ? 'ring-2 ring-slate-300' : ''
              }`}
              key={`${word.word}-${index}`}
              onClick={() => setSelectedIndex(index)}
              type="button"
            >
              {word.word}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs leading-6 text-slate-500">{transcript}</p>

      {containsVietnamese(transcript) ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Câu trả lời có lẫn tiếng Việt — các từ tiếng Việt không nằm trong phần chấm phoneme chi tiết ở trên (chỉ chấm phát âm tiếng
            Anh), nhưng đã bị trừ điểm ngữ pháp/từ vựng riêng.
          </p>
        </div>
      ) : null}

      {selectedWord ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">{selectedWord.word}</p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedWord.level ? `${selectedWord.level} • ` : ''}
                {selectedWord.accuracyScore != null ? `Độ chính xác ${formatAccuracy(selectedWord.accuracyScore)}%` : 'Không có điểm'}
              </p>
            </div>
            <button
              className="inline-flex size-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={() => setSelectedIndex(null)}
              type="button"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>

          {selectedWord.errorNote ? <p className="mt-3 text-sm leading-6 text-slate-600">{selectedWord.errorNote}</p> : null}

          <div className="mt-3 grid gap-2">
            {(selectedWord.phonemes ?? []).length === 0 ? (
              <p className="text-xs text-slate-400">Không có chi tiết phoneme.</p>
            ) : (
              (selectedWord.phonemes ?? []).map((phoneme, index) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" key={`${phoneme.phoneme}-${index}`}>
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${getDotColorClass(phoneme.color)}`} />
                    <span className="text-sm font-bold text-slate-800">{phoneme.phoneme}</span>
                    <span className="text-xs text-slate-500">
                      {phoneme.accuracyScore != null ? `${formatAccuracy(phoneme.accuracyScore)}%` : 'Không có điểm'}
                    </span>
                  </div>
                  {phoneme.note ? <p className="mt-1 text-xs leading-5 text-slate-600">{phoneme.note}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
