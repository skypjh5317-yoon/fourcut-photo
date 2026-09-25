import { useEffect, useMemo, useState } from 'react'
import type { PhotoFrame } from './data/frames'
import './Admin.css'

const loadFrames = async () => {
  const response = await fetch('/frames/frames.json')
  if (!response.ok) throw new Error('프레임을 불러오지 못했습니다.')
  return (await response.json()) as PhotoFrame[]
}

function Admin() {
  const [frames, setFrames] = useState<PhotoFrame[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadFrames()
      .then((loadedFrames) => {
        setFrames(loadedFrames.sort((a, b) => a.sortOrder - b.sortOrder))
      })
      .catch(() => setError('프레임을 불러오지 못했습니다.'))
      .finally(() => setIsLoading(false))
  }, [])

  const updateFrame = (id: string, update: Partial<PhotoFrame>) => {
    setFrames((current) => current.map((frame) => frame.id === id ? { ...frame, ...update } : frame))
    setMessage('')
    setError('')
  }

  const moveFrame = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= frames.length) return
    const nextFrames = [...frames]
    const [movedFrame] = nextFrames.splice(index, 1)
    nextFrames.splice(nextIndex, 0, movedFrame)
    setFrames(nextFrames.map((frame, frameIndex) => ({ ...frame, sortOrder: frameIndex + 1 })))
    setMessage('')
    setError('')
  }

  const changedFrames = useMemo(
    () => frames.map(({ id, name, enabled, sortOrder }) => ({ id, name, enabled, sortOrder })),
    [frames],
  )

  const saveFrames = async () => {
    setIsSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/frames', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changedFrames),
      })
      if (!response.ok) throw new Error('저장에 실패했습니다.')
      const savedFrames = (await response.json()) as PhotoFrame[]
      setFrames(savedFrames.sort((a, b) => a.sortOrder - b.sortOrder))
      setMessage('저장되었습니다.')
    } catch {
      setError('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">FRAME MANAGEMENT</p>
          <h1>📷 4컷 사진 관리자</h1>
          <p>프레임 이름, 공개 여부, 표시 순서를 관리합니다.</p>
        </div>
        <button type="button" className="admin-save-button" onClick={() => void saveFrames()} disabled={isSaving || isLoading}>
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </header>

      {message && <p className="admin-status success" role="status">✅ {message}</p>}
      {error && <p className="admin-status failure" role="alert">❌ {error}</p>}

      {isLoading ? (
        <p className="admin-empty">프레임을 불러오는 중...</p>
      ) : (
        <section className="admin-grid" aria-label="프레임 목록">
          {frames.map((frame, index) => (
            <article className="admin-frame-card" key={frame.id}>
              <img src={frame.image} alt={`${frame.name} 프레임 미리보기`} />
              <label>
                <span>프레임 이름</span>
                <input
                  value={frame.name}
                  onChange={(event) => updateFrame(frame.id, { name: event.target.value })}
                />
              </label>
              <div className="admin-controls">
                <span>사용 여부</span>
                <div className="admin-toggle" role="group" aria-label={`${frame.name} 사용 여부`}>
                  <button type="button" className={frame.enabled ? 'active' : ''} onClick={() => updateFrame(frame.id, { enabled: true })}>사용</button>
                  <button type="button" className={!frame.enabled ? 'active hidden-state' : ''} onClick={() => updateFrame(frame.id, { enabled: false })}>숨김</button>
                </div>
              </div>
              <div className="admin-order">
                <span>순서 <strong>{index + 1}</strong></span>
                <div>
                  <button type="button" aria-label={`${frame.name} 위로 이동`} onClick={() => moveFrame(index, -1)} disabled={index === 0}>▲</button>
                  <button type="button" aria-label={`${frame.name} 아래로 이동`} onClick={() => moveFrame(index, 1)} disabled={index === frames.length - 1}>▼</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default Admin
