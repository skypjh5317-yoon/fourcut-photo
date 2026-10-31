import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './App.css'
import './booth.css'
import type { PhotoFrame } from './data/frames'
import { PHOTO_SLOT_ASPECT_RATIO } from './utils/photoUtils'
import { createFourCutImage } from './utils/photoUtils'

type Screen = 'welcome' | 'camera' | 'selection' | 'background' | 'result'
type CameraStatus = 'idle' | 'loading' | 'ready' | 'error'
type CapturePhase = 'idle' | 'countdown' | 'flash' | 'preparing'
type CameraFacing = 'user' | 'environment'

const PHOTO_COUNT = 6
// 인쇄 버튼을 누른 뒤 이 시간이 지나면 사진을 지우고 처음 화면으로 돌아간다 (다음 학생이 앞 사진을 보지 않도록)
const AUTO_HOME_SECONDS = 120

// 첫 화면 사진 띠에 들어가는 포즈 예시
const WELCOME_POSES = [
  { emoji: '😄', label: '활짝 웃기' },
  { emoji: '✌️', label: '브이' },
  { emoji: '😲', label: '깜짝 놀라기' },
  { emoji: '🫶', label: '손 하트' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [frames, setFrames] = useState<PhotoFrame[]>([])
  const [selectedFrame, setSelectedFrame] = useState<PhotoFrame | null>(null)
  const [framesError, setFramesError] = useState('')
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [cameraError, setCameraError] = useState('')
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [finalImage, setFinalImage] = useState('')
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const [framePreview, setFramePreview] = useState('')
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('user')
  const [isAutoHomeScheduled, setIsAutoHomeScheduled] = useState(false)
  const autoHomeTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturedImagesRef = useRef<string[]>([])
  const requestIdRef = useRef(0)
  const captureSequenceRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const enabledFrames = useMemo(
    () => frames.filter((frame) => frame.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [frames],
  )

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const clearAutoHome = () => {
    if (autoHomeTimerRef.current !== null) {
      window.clearTimeout(autoHomeTimerRef.current)
      autoHomeTimerRef.current = null
    }
    setIsAutoHomeScheduled(false)
  }

  const stopCamera = () => {
    requestIdRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const resetCaptureState = () => {
    captureSequenceRef.current += 1
    clearTimer()
    capturedImagesRef.current = []
    setCapturedImages([])
    setFinalImage('')
    setFramePreview('')
    setSelectedPhotoIds([])
    setCapturePhase('idle')
    setCountdown(null)
  }

  const startCamera = async (
    facing: CameraFacing = cameraFacing,
    resetState = true,
  ) => {
    if (resetState) resetCaptureState()
    stopCamera()
    const requestId = requestIdRef.current
    setScreen('camera')
    setCameraStatus('loading')
    setCameraError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          aspectRatio: { ideal: 3 / 4 },
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      })

      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraStatus('ready')
    } catch {
      setCameraStatus('error')
      setCameraError(
        '카메라를 사용할 수 없습니다.\n브라우저의 카메라 권한을 확인해주세요.',
      )
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null
    }

    const captureSize = 1200
    const targetAspectRatio = 1
    const sourceAspectRatio = video.videoWidth / video.videoHeight
    let sourceWidth = video.videoWidth
    let sourceHeight = video.videoHeight
    let sourceX = 0
    let sourceY = 0

    if (sourceAspectRatio > targetAspectRatio) {
      sourceWidth = video.videoHeight * targetAspectRatio
      sourceX = (video.videoWidth - sourceWidth) / 2
    } else if (sourceAspectRatio < targetAspectRatio) {
      sourceHeight = video.videoWidth / targetAspectRatio
      sourceY = (video.videoHeight - sourceHeight) / 2
    }

    const canvas = document.createElement('canvas')
    canvas.width = captureSize
    canvas.height = captureSize
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    // 전면 카메라는 화면에 거울처럼 보이므로, 저장되는 사진도 화면과 같은 방향으로 맞춘다.
    if (cameraFacing === 'user') {
      context.translate(captureSize, 0)
      context.scale(-1, 1)
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      captureSize,
      captureSize,
    )
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  const finishCapture = async (images: string[], sequence: number) => {
    if (sequence !== captureSequenceRef.current) {
      return
    }

    capturedImagesRef.current = images
    setCapturedImages(images)
    setCapturePhase('idle')
    stopCamera()
    setSelectedPhotoIds([])
    setScreen('selection')
  }

  const captureAfterCountdown = (sequence: number) => {
    if (sequence !== captureSequenceRef.current) {
      return
    }

    const image = capturePhoto()
    if (!image) {
      setCapturePhase('idle')
      setCountdown(null)
      return
    }

    const nextImages = [...capturedImagesRef.current, image]
    capturedImagesRef.current = nextImages
    setCapturedImages(nextImages)
    setCountdown(null)
    setCapturePhase('flash')

    timerRef.current = window.setTimeout(() => {
      if (sequence !== captureSequenceRef.current) {
        return
      }

      if (nextImages.length === PHOTO_COUNT) {
        void finishCapture(nextImages, sequence)
        return
      }

      setCapturePhase('preparing')
      timerRef.current = window.setTimeout(() => {
        if (sequence === captureSequenceRef.current) {
          startCountdown(sequence)
        }
      }, 1000)
    }, 450)
  }

  const startCountdown = (sequence = captureSequenceRef.current) => {
    if (sequence !== captureSequenceRef.current || cameraStatus !== 'ready') {
      return
    }

    setCapturePhase('countdown')
    setCountdown(3)
    timerRef.current = window.setTimeout(() => {
      if (sequence !== captureSequenceRef.current) return
      setCountdown(2)
      timerRef.current = window.setTimeout(() => {
        if (sequence !== captureSequenceRef.current) return
        setCountdown(1)
        timerRef.current = window.setTimeout(() => {
          if (sequence !== captureSequenceRef.current) return
          captureAfterCountdown(sequence)
        }, 1000)
      }, 1000)
    }, 1000)
  }

  const handleCapture = () => {
    if (cameraStatus !== 'ready' || capturePhase !== 'idle') {
      return
    }
    startCountdown()
  }

  const handleRetake = () => {
    clearAutoHome()
    resetCaptureState()
    void startCamera()
  }

  const handlePhotoToggle = (photoIndex: number) => {
    setSelectedPhotoIds((current) => {
      if (current.includes(photoIndex)) {
        return current.filter((index) => index !== photoIndex)
      }
      if (current.length >= 4) return current
      return [...current, photoIndex]
    })
  }

  const handleFrameContinue = async () => {
    if (selectedPhotoIds.length !== 4 || !selectedFrame) return

    try {
      setIsComposing(true)
      setCameraError('')
      const selectedImages = selectedPhotoIds.map((index) => capturedImages[index])
      const image = await createFourCutImage(selectedImages, selectedFrame)
      setFinalImage(image)
      setFramePreview(image)
      setScreen('result')
    } catch {
      setCameraError('사진을 완성하는 중 문제가 생겼어요. 다시 선택해주세요.')
    } finally {
      setIsComposing(false)
    }
  }

  const handleOpenBackground = async () => {
    if (selectedPhotoIds.length !== 4 || !selectedFrame) return
    try {
      setIsComposing(true)
      setCameraError('')
      const selectedImages = selectedPhotoIds.map((index) => capturedImages[index])
      const image = await createFourCutImage(selectedImages, selectedFrame)
      setFramePreview(image)
      setScreen('background')
    } catch {
      setCameraError('미리보기를 만드는 중 문제가 생겼어요.')
    } finally {
      setIsComposing(false)
    }
  }

  const handleFrameSelect = async (frame: PhotoFrame) => {
    setSelectedFrame(frame)
    try {
      setIsComposing(true)
      setCameraError('')
      const selectedImages = selectedPhotoIds.map((index) => capturedImages[index])
      const image = await createFourCutImage(selectedImages, frame)
      setFramePreview(image)
    } catch {
      setCameraError('프레임 미리보기를 만드는 중 문제가 생겼어요.')
    } finally {
      setIsComposing(false)
    }
  }

  const handleCameraToggle = () => {
    if (cameraStatus === 'loading' || capturePhase !== 'idle') return
    const nextFacing: CameraFacing = cameraFacing === 'user' ? 'environment' : 'user'
    setCameraFacing(nextFacing)
    void startCamera(nextFacing, false)
  }

  const handleHome = () => {
    clearAutoHome()
    resetCaptureState()
    setScreen('welcome')
  }

  const handlePrint = () => {
    window.print()
    clearAutoHome()
    autoHomeTimerRef.current = window.setTimeout(() => {
      autoHomeTimerRef.current = null
      handleHome()
    }, AUTO_HOME_SECONDS * 1000)
    setIsAutoHomeScheduled(true)
  }

  const handleResultReselect = () => {
    clearAutoHome()
    setScreen('background')
  }

  const handleBack = () => {
    resetCaptureState()
    stopCamera()
    setCameraStatus('idle')
    setCameraError('')
    setScreen(screen === 'camera' ? 'welcome' : 'welcome')
  }

  useEffect(() => {
    const loadFrames = async () => {
      try {
        const response = await fetch('/frames/frames.json')
        if (!response.ok) throw new Error('프레임을 불러오지 못했습니다.')
        const loadedFrames = (await response.json()) as PhotoFrame[]
        const sortedFrames = loadedFrames.sort((a, b) => a.sortOrder - b.sortOrder)
        setFrames(sortedFrames)
        setSelectedFrame((current) => current ?? sortedFrames.find((frame) => frame.enabled) ?? null)
      } catch {
        setFramesError('프레임을 불러오지 못했습니다.')
      }
    }

    void loadFrames()
  }, [])

  useEffect(() => {
    return () => {
      captureSequenceRef.current += 1
      clearTimer()
      requestIdRef.current += 1
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (autoHomeTimerRef.current !== null) window.clearTimeout(autoHomeTimerRef.current)
    }
  }, [])

  if (screen === 'result') {
    return (
      <main className="result-screen shelf">
        <header className="result-header shelf-head">
          <h1 className="shelf-title">사진 완성!</h1>
          <p className="shelf-hint">인쇄하기를 누르면 엽서 크기(10×15cm)로 인쇄돼요.</p>
        </header>

        <section className="result-content shelf-result">
          <div className="print-page shelf-paper">
            <img className="combined-image" src={finalImage} alt="완성된 4컷 사진" />
          </div>

          <div className="result-actions shelf-actions">
            <button type="button" className="print-button shelf-print" onClick={handlePrint}>
              인쇄하기
            </button>
            <div className="shelf-secondary">
              <button type="button" className="retake-button shelf-ghost" onClick={handleResultReselect}>
                프레임 다시 고르기
              </button>
              <button type="button" className="retake-button shelf-ghost" onClick={handleRetake}>
                다시 찍기
              </button>
              <button type="button" className="home-button shelf-ghost" onClick={handleHome}>
                처음으로
              </button>
            </div>
          </div>

          {isAutoHomeScheduled && (
            <p className="auto-home-note shelf-note" role="status">
              {`인쇄 후 ${AUTO_HOME_SECONDS / 60}분이 지나면 사진이 지워지고 처음 화면으로 돌아가요.`}
            </p>
          )}
        </section>
      </main>
    )
  }

  if (screen === 'selection') {
    return (
      <main className="selection-screen shelf">
        <header className="shelf-head">
          <button type="button" className="shelf-back" onClick={handleRetake}>
            ← 다시 찍기
          </button>
          <h1 className="shelf-title">사진 4장 고르기</h1>
          <p className="shelf-hint">고른 순서대로 인쇄 칸에 들어가요. 한 번 더 누르면 빠져요.</p>
        </header>

        <section className="shelf-select">
          <div className="selection-grid shelf-photos" aria-label="촬영한 사진 6장">
            {capturedImages.map((image, index) => {
              const order = selectedPhotoIds.indexOf(index)
              const isSelected = order !== -1
              return (
                <button
                  type="button"
                  className={`selection-card shelf-photo ${isSelected ? 'selected' : ''}`}
                  key={`${image}-${index}`}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? `사진 ${index + 1}, ${order + 1}번째로 고름` : `사진 ${index + 1}`}
                  onClick={() => handlePhotoToggle(index)}
                >
                  <img
                    src={image}
                    alt=""
                    style={{ aspectRatio: PHOTO_SLOT_ASPECT_RATIO }}
                  />
                  {isSelected && (
                    // 학교망 필터 대비: 순서가 바뀔 때마다 새로 그린다
                    <span className="shelf-order" key={`order-${order}`} aria-hidden="true">
                      {order + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <aside className="shelf-card-wrap" aria-label="고른 사진 인쇄 칸 미리보기">
            <div className="shelf-card">
              {Array.from({ length: 4 }).map((_, slot) => {
                const photoIndex = selectedPhotoIds[slot]
                return photoIndex === undefined ? (
                  <div className="shelf-slot empty" key={`empty-${slot}`}>
                    {slot + 1}
                  </div>
                ) : (
                  <img
                    className="shelf-slot"
                    key={`${capturedImages[photoIndex]}-${slot}`}
                    src={capturedImages[photoIndex]}
                    alt={`인쇄 칸 ${slot + 1}`}
                  />
                )
              })}
            </div>
            {/* 학교망 보안 필터가 글자를 바꿔 끼워도 숫자가 갱신되도록 숫자가 바뀔 때마다 새로 그린다 */}
            <p className="shelf-count" key={`selected-${selectedPhotoIds.length}`} aria-live="polite">
              {`${selectedPhotoIds.length} / 4장 선택`}
            </p>
          </aside>
        </section>

        {cameraError && (
          <p className="screen-error" role="alert">{cameraError}</p>
        )}

        <div className="shelf-bar">
          <button
            type="button"
            className="shelf-next"
            disabled={selectedPhotoIds.length !== 4}
            onClick={() => void handleOpenBackground()}
          >
            다음: 프레임 고르기
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'background') {
    return (
      <main className="background-screen picker">
        <header className="picker-head">
          <button
            type="button"
            className="picker-back"
            onClick={() => setScreen('selection')}
          >
            ← 사진 다시 고르기
          </button>
          <h1 className="picker-title">프레임 고르기</h1>
          <p className="picker-hint">프레임을 누르면 인쇄 미리보기가 바로 바뀌어요.</p>
        </header>

        <div className="picker-body">
          <figure className="picker-print">
            <div className="picker-paper" aria-label="선택한 사진과 프레임 미리보기">
              {framePreview ? (
                <img src={framePreview} alt="선택한 사진과 프레임 최종 인쇄 미리보기" />
              ) : (
                <div className="picker-paper-fallback">
                  {selectedPhotoIds.map((photoIndex, order) => (
                    <img
                      key={`${capturedImages[photoIndex]}-${order}`}
                      src={capturedImages[photoIndex]}
                      alt={`4컷 미리보기 ${order + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* 학교망 필터 대비: 이름이 바뀔 때마다 새로 그린다 */}
            <figcaption key={selectedFrame?.id ?? 'none'} aria-live="polite">
              {selectedFrame ? selectedFrame.name : '프레임을 골라 주세요'}
            </figcaption>
          </figure>

          <div className="background-grid picker-grid" aria-label="사진 프레임 목록">
            {framesError && <p className="picker-empty">{framesError}</p>}
            {!framesError && enabledFrames.length === 0 && (
              <p className="picker-empty">
                쓸 수 있는 프레임이 없어요. 관리자 페이지에서 프레임을 &quot;사용&quot;으로 바꿔 주세요.
              </p>
            )}
            {enabledFrames.map((frame) => {
              const isSelected = selectedFrame?.id === frame.id
              return (
                <button
                  type="button"
                  className={`background-card picker-card ${isSelected ? 'selected' : ''}`}
                  key={frame.id}
                  aria-pressed={isSelected}
                  onClick={() => void handleFrameSelect(frame)}
                >
                  <span className="picker-thumb">
                    {frame.thumbnail || frame.image ? (
                      <img
                        className="frame-thumbnail"
                        src={frame.thumbnail ?? frame.image}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="picker-thumb-color"
                        style={{ backgroundColor: frame.background ?? '#ffffff' }}
                      />
                    )}
                    {isSelected && (
                      <span className="picker-check" aria-hidden="true">✓</span>
                    )}
                  </span>
                  <span className="picker-name">{frame.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {cameraError && (
          <p className="screen-error" role="alert">{cameraError}</p>
        )}

        <div className="picker-bar">
          <button
            type="button"
            className="picker-done"
            disabled={isComposing || selectedPhotoIds.length !== 4 || !selectedFrame}
            onClick={() => void handleFrameContinue()}
          >
            {/* 학교망 필터 대비: 글자가 바뀔 때마다 새로 그린다 */}
            <span key={isComposing ? 'busy' : 'ready'}>
              {isComposing ? '사진을 만드는 중…' : '이 프레임으로 완성하기'}
            </span>
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'camera') {
    return (
      <main className="camera-screen">
        <header className="camera-header">
          <button type="button" className="back-button" onClick={handleBack}>
            ← 뒤로
          </button>
          <h1>📸 사진 촬영</h1>
          <button
            type="button"
            className="camera-switch-button"
            onClick={handleCameraToggle}
            disabled={cameraStatus === 'loading' || capturePhase !== 'idle'}
          >
            ↻ {cameraFacing === 'user' ? '후면' : '전면'} 카메라
          </button>
        </header>

        <section className="camera-content" aria-live="polite">
          <div className="video-frame">
            {cameraStatus === 'loading' && (
              <p className="camera-message">카메라를 준비하고 있어요...</p>
            )}
            {cameraStatus === 'error' && (
              <p className="camera-message camera-error">
                {cameraError}
              </p>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`video-preview ${cameraFacing === 'user' ? 'mirrored' : ''} ${
                cameraStatus === 'ready' ? '' : 'hidden'
              }`}
            />
            <div className="square-capture-guide" aria-hidden="true" />
            {capturePhase === 'countdown' && countdown !== null && (
              <div className="countdown-overlay" aria-live="assertive">
                {countdown}
              </div>
            )}
            {capturePhase === 'flash' && <div className="flash-overlay">찰칵!</div>}
            {capturePhase === 'preparing' && (
              <div className="preparing-overlay">좋아요! 다음 사진을 준비하세요.</div>
            )}
          </div>
          {/* 학교망 보안 필터가 글자를 바꿔 끼워도 숫자가 갱신되도록 숫자가 바뀔 때마다 새로 그린다 */}
          <p
            key={`progress-${capturedImages.length}`}
            className="photo-progress"
            aria-live="polite"
          >
            {`${Math.min(capturedImages.length + 1, PHOTO_COUNT)} / ${PHOTO_COUNT}`}
          </p>
          <p className="camera-instruction">
            사진을 찍을 준비가 되면 촬영 버튼을 눌러주세요.
          </p>
          <button
            type="button"
            className="capture-button"
            onClick={handleCapture}
            disabled={cameraStatus !== 'ready' || capturePhase !== 'idle'}
          >
            📷 촬영
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="welcome-screen booth">
      <section className="booth-copy" aria-labelledby="booth-title">
        <h1 id="booth-title" className="booth-title">
          <span className="booth-title-school">우리 학교</span>
          <span className="booth-title-main">4컷</span>
          <span className="booth-title-main">사진관</span>
        </h1>

        <ol className="booth-steps" aria-label="사진 찍는 순서">
          <li>사진 6장 찍기</li>
          <li>마음에 드는 4장 고르기</li>
          <li>프레임 골라 인쇄하기</li>
        </ol>

        <button type="button" className="start-button booth-start" onClick={() => void startCamera()}>
          사진 찍기 시작
        </button>

        <p className="booth-privacy">
          사진은 이 태블릿 안에서만 만들어지고, 인쇄하고 2분이 지나면 지워져요.
        </p>
      </section>

      <div className="booth-strip" aria-hidden="true">
        {WELCOME_POSES.map((pose, index) => (
          <div
            className="booth-shot"
            key={pose.label}
            style={{ '--shot': index } as CSSProperties}
          >
            <span className="booth-pose">{pose.emoji}</span>
            <span className="booth-pose-label">{pose.label}</span>
          </div>
        ))}
        <p className="booth-strip-foot">우리 학교 4컷</p>
      </div>
    </main>
  )
}

export default App
