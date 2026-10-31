import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PhotoFrame } from './data/frames'
import { CANVAS_HEIGHT, CANVAS_WIDTH, PHOTO_SLOTS } from './utils/photoUtils'
import './Admin.css'

// 서버(Vercel) 한 번에 보낼 수 있는 크기를 넘지 않도록 그림 크기를 제한한다.
const MAX_UPLOAD_CHARS = 3.9 * 1024 * 1024

interface PreparedFrameImage {
  dataUrl: string
  warnings: string[]
}

/**
 * 올린 그림을 인쇄 캔버스와 같은 1000x1480 크기의 JPG로 맞춘다.
 * 비율이 다르면 가운데를 기준으로 잘라서 채운다.
 */
const prepareFrameImage = (file: File): Promise<PreparedFrameImage> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      const warnings: string[] = []
      const ratio = image.naturalWidth / image.naturalHeight
      const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT
      if (Math.abs(ratio - targetRatio) / targetRatio > 0.03) {
        warnings.push('그림의 가로·세로 비율이 10×15cm와 달라서 가운데를 기준으로 잘라 맞췄어요.')
      }
      if (image.naturalWidth < CANVAS_WIDTH * 0.8) {
        warnings.push(`그림이 작아서(가로 ${image.naturalWidth}px) 인쇄가 흐릴 수 있어요. 가로 1000px 이상을 권장해요.`)
      }
      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_WIDTH
      canvas.height = CANVAS_HEIGHT
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('그림을 처리하지 못했어요.'))
        return
      }
      const scale = Math.max(CANVAS_WIDTH / image.naturalWidth, CANVAS_HEIGHT / image.naturalHeight)
      const sourceWidth = CANVAS_WIDTH / scale
      const sourceHeight = CANVAS_HEIGHT / scale
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      context.drawImage(
        image,
        (image.naturalWidth - sourceWidth) / 2,
        (image.naturalHeight - sourceHeight) / 2,
        sourceWidth,
        sourceHeight,
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
      )
      let dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      for (const quality of [0.85, 0.75, 0.65]) {
        if (dataUrl.length <= MAX_UPLOAD_CHARS) break
        dataUrl = canvas.toDataURL('image/jpeg', quality)
      }
      if (dataUrl.length > MAX_UPLOAD_CHARS) {
        reject(new Error('그림이 너무 복잡해서 크기를 줄이지 못했어요. 다른 그림으로 해주세요.'))
        return
      }
      resolve({ dataUrl, warnings })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('그림 파일을 열지 못했어요. JPG나 PNG 파일인지 확인해주세요.'))
    }
    image.src = url
  })

const fileNameToFrameName = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 30)

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
  const [password, setPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newEnabled, setNewEnabled] = useState(true)
  const [newImage, setNewImage] = useState<PreparedFrameImage | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addMessage, setAddMessage] = useState('')
  const [addError, setAddError] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

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

  const deleteFrame = async (frame: PhotoFrame) => {
    setMessage('')
    setError('')
    setDeleteError('')
    if (!password) {
      setDeleteError('위쪽 칸에 관리자 비밀번호를 먼저 입력해주세요.')
      return
    }
    setDeletingId(frame.id)
    try {
      const response = await fetch(`/api/admin/frames?id=${encodeURIComponent(frame.id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': encodeURIComponent(password),
        },
        body: JSON.stringify({ id: frame.id }),
      })
      const body = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) throw new Error(body?.error ?? '프레임을 지우지 못했어요.')
      // 다른 프레임에서 아직 저장하지 않은 변경은 그대로 두고, 지운 프레임만 목록에서 뺀다.
      setFrames((current) => current.filter((item) => item.id !== frame.id))
      setMessage(`"${frame.name}" 프레임을 지웠어요. 1~2분 뒤 촬영 화면에서도 사라져요.`)
      setConfirmDeleteId(null)
    } catch (failure) {
      // 실패하면 확인 칸을 열어 둔 채 그 안에 이유를 보여준다.
      setDeleteError(failure instanceof Error ? failure.message : '프레임을 지우지 못했어요.')
    } finally {
      setDeletingId(null)
    }
  }

  const saveFrames = async () => {
    if (!password) {
      setMessage('')
      setError('관리자 비밀번호를 입력해주세요.')
      return
    }
    setIsSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/frames', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': encodeURIComponent(password),
        },
        body: JSON.stringify(changedFrames),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? '저장에 실패했습니다.')
      }
      const savedFrames = (await response.json()) as PhotoFrame[]
      setFrames(savedFrames.sort((a, b) => a.sortOrder - b.sortOrder))
      setMessage('저장되었습니다.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleNewFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setAddMessage('')
    setAddError('')
    if (!file) return
    setIsPreparing(true)
    try {
      const prepared = await prepareFrameImage(file)
      setNewImage(prepared)
      setNewName((current) => current || fileNameToFrameName(file.name))
    } catch (prepareError) {
      setNewImage(null)
      setAddError(prepareError instanceof Error ? prepareError.message : '그림을 처리하지 못했어요.')
    } finally {
      setIsPreparing(false)
    }
  }

  const addFrame = async () => {
    setAddMessage('')
    setAddError('')
    if (!newImage) {
      setAddError('프레임 그림 파일을 먼저 골라주세요.')
      return
    }
    if (!newName.trim()) {
      setAddError('프레임 이름을 입력해주세요.')
      return
    }
    if (!password) {
      setAddError('위쪽 칸에 관리자 비밀번호를 입력해주세요.')
      return
    }
    setIsAdding(true)
    try {
      const response = await fetch('/api/admin/frames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': encodeURIComponent(password),
        },
        body: JSON.stringify({ name: newName.trim(), image: newImage.dataUrl, enabled: newEnabled }),
      })
      const body = (await response.json().catch(() => null)) as
        | { error?: string; frame?: PhotoFrame }
        | null
      if (!response.ok || !body?.frame) {
        throw new Error(body?.error ?? '프레임을 추가하지 못했어요.')
      }
      const addedFrame = body.frame
      // 배포가 끝나기 전에는 새 그림 주소가 아직 없으므로, 목록에는 방금 올린 그림을 보여준다.
      setFrames((current) => [...current, { ...addedFrame, image: newImage.dataUrl }])
      setAddMessage(`"${addedFrame.name}" 프레임을 추가했어요. 1~2분 뒤 촬영 화면에 나타나요.`)
      setNewImage(null)
      setNewName('')
      setNewEnabled(true)
      setFileInputKey((key) => key + 1)
    } catch (addFrameError) {
      setAddError(addFrameError instanceof Error ? addFrameError.message : '프레임을 추가하지 못했어요.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">FRAME MANAGEMENT</p>
          <h1>📷 4컷 사진 관리자</h1>
          <p>새 프레임을 추가하고, 이름·사용 여부·표시 순서를 관리합니다.</p>
        </div>
        <div className="admin-save-area">
          <input
            type="password"
            className="admin-password-input"
            placeholder="관리자 비밀번호"
            aria-label="관리자 비밀번호"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !isSaving && !isLoading) void saveFrames()
            }}
          />
          <button type="button" className="admin-save-button" onClick={() => void saveFrames()} disabled={isSaving || isLoading}>
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      {message && <p className="admin-status success" role="status">✅ {message}</p>}
      {error && <p className="admin-status failure" role="alert">❌ {error}</p>}

      <section className="admin-add" aria-labelledby="admin-add-title">
        <div className="admin-add-intro">
          <h2 id="admin-add-title">새 프레임 추가</h2>
          <p>
            세로 10×15cm 비율(1000×1480px)의 그림을 올리면 자동으로 크기를 맞춰 저장해요.
            파란 칸에 사진이 들어가니, 그 자리는 비워 두고 디자인하면 좋아요.
          </p>
        </div>

        <div className="admin-add-body">
          <label className="admin-add-drop">
            <input
              key={fileInputKey}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => void handleNewFile(event)}
            />
            {newImage ? (
              <span className="admin-add-preview">
                <img src={newImage.dataUrl} alt="올린 프레임 미리보기" />
                {PHOTO_SLOTS.map((slot, index) => (
                  <span
                    className="admin-add-slot"
                    key={index}
                    style={{
                      left: `${(slot.x / CANVAS_WIDTH) * 100}%`,
                      top: `${(slot.y / CANVAS_HEIGHT) * 100}%`,
                      width: `${(slot.width / CANVAS_WIDTH) * 100}%`,
                      height: `${(slot.height / CANVAS_HEIGHT) * 100}%`,
                    }}
                  >
                    사진 {index + 1}
                  </span>
                ))}
              </span>
            ) : (
              <span className="admin-add-empty">
                {isPreparing ? '그림을 맞추는 중...' : '여기를 눌러 프레임 그림 고르기 (JPG, PNG)'}
              </span>
            )}
          </label>

          <div className="admin-add-form">
            <label className="admin-add-field">
              <span>프레임 이름</span>
              <input
                value={newName}
                maxLength={30}
                placeholder="예: 가을 운동회"
                onChange={(event) => setNewName(event.target.value)}
              />
            </label>
            <label className="admin-add-check">
              <input
                type="checkbox"
                checked={newEnabled}
                onChange={(event) => setNewEnabled(event.target.checked)}
              />
              추가하자마자 촬영 화면에 보이기
            </label>
            {newImage?.warnings.map((warning) => (
              <p className="admin-add-warning" key={warning}>⚠️ {warning}</p>
            ))}
            {newImage && (
              <button
                type="button"
                className="admin-add-change"
                onClick={() => {
                  setNewImage(null)
                  setFileInputKey((key) => key + 1)
                }}
              >
                다른 그림 고르기
              </button>
            )}
            <button
              type="button"
              className="admin-add-button"
              disabled={isAdding || isPreparing}
              onClick={() => void addFrame()}
            >
              {/* 학교망 필터 대비: 글자가 바뀔 때마다 새로 그린다 */}
              <span key={isAdding ? 'busy' : 'ready'}>{isAdding ? '추가하는 중...' : '프레임 추가'}</span>
            </button>
            {addMessage && <p className="admin-status success" role="status" key={addMessage}>✅ {addMessage}</p>}
            {addError && <p className="admin-status failure" role="alert" key={addError}>❌ {addError}</p>}
          </div>
        </div>
      </section>

      <h2 className="admin-list-title">프레임 목록</h2>

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
              {confirmDeleteId === frame.id ? (
                <div className="admin-delete-confirm" role="group" aria-label={`${frame.name} 삭제 확인`}>
                  <p>
                    {frames.filter((item) => item.enabled && item.id !== frame.id).length === 0
                      ? '이 프레임을 지우면 촬영 화면에서 고를 프레임이 하나도 없어요. 그래도 지울까요?'
                      : '정말 지울까요? 그림 파일까지 지워져서 되돌릴 수 없어요.'}
                  </p>
                  {deleteError && (
                    <p className="admin-delete-error" role="alert" key={deleteError}>❌ {deleteError}</p>
                  )}
                  <div>
                    <button
                      type="button"
                      className="admin-delete-yes"
                      disabled={deletingId !== null}
                      onClick={() => void deleteFrame(frame)}
                    >
                      <span key={deletingId === frame.id ? 'busy' : 'ready'}>
                        {deletingId === frame.id ? '지우는 중...' : '지우기'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="admin-delete-no"
                      disabled={deletingId !== null}
                      onClick={() => {
                        setConfirmDeleteId(null)
                        setDeleteError('')
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="admin-delete-button"
                  disabled={deletingId !== null}
                  onClick={() => {
                    setConfirmDeleteId(frame.id)
                    setDeleteError('')
                  }}
                >
                  프레임 삭제
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default Admin
