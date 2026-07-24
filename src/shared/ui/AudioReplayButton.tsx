import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

type AudioReplayButtonProps = {
  audioUrl?: string | null
}

export function AudioReplayButton({ audioUrl }: AudioReplayButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setIsPlaying(false)
  }, [audioUrl])

  async function handleToggle() {
    if (!audioUrl) {
      return
    }

    if (!audioRef.current) {
      const audio = new Audio(audioUrl)
      audio.onended = () => setIsPlaying(false)
      audioRef.current = audio
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    await audioRef.current.play()
    setIsPlaying(true)
  }

  return (
    <button
      className="inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!audioUrl}
      onClick={() => void handleToggle()}
      title={audioUrl ? 'Phát lại audio' : 'Không có audio'}
      type="button"
    >
      {isPlaying ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
    </button>
  )
}
