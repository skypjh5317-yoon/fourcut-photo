import { useEffect, useRef, useState } from 'react'
import './App.css'
import { type BackgroundOption } from './utils/photoUtils'
import { createFourCutImage } from './utils/photoUtils'

type Screen = 'welcome' | 'camera' | 'selection' | 'background' | 'result'
type CameraStatus = 'idle' | 'loading' | 'ready' | 'error'
type CapturePhase = 'idle' | 'countdown' | 'flash' | 'preparing'

const PHOTO_COUNT = 6

const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'default',
    name: '기본 배경',
    image: '/backgrounds/default.png',
    color: '#ffe4b8',
  },
  {
    id: 'sports-day',
    name: '운동회',
    image: '/backgrounds/sports-day.png',
    color: '#c8e9f2',
  },
  {
    id: 'school-event',
    name: '학교 행사',
    image: '/backgrounds/school-event.png',
    color: '#f8d8e3',
  },
  {
    id: 'ecology',
    name: '생태·환경',
    image: '/backgrounds/ecology.png',
    color: '#d9f1e7',
  },
  {
    id: 'festival',
    name: '축제',
    image: '/backgrounds/festival.png',
    color: '#f6e6ae',
  },
]

function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [selectedBackground, setSelectedBackground] = useState<BackgroundOption>(
    BACKGROUND_OPTIONS[0],
  )
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [cameraError, setCameraError] = useState('')
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [finalImage, setFinalImage] = useState('')
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([])
  const [isComposing, setIsComposing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturedImagesRef = useRef<string[]>([])
  const requestIdRef = useRef(0)
  const captureSequenceRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
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
    setSelectedPhotoIds([])
    setCapturePhase('idle')
    setCountdown(null)
  }

  const startCamera = async () => {
    resetCaptureState()
    stopCamera()
    const requestId = requestIdRef.current
    setScreen('camera')
    setCameraStatus('loading')
    setCameraError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          aspectRatio: { ideal: 16 / 9 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

    const captureWidth = 1280
    const captureHeight = 720
    const targetAspectRatio = captureWidth / captureHeight
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
    canvas.width = captureWidth
    canvas.height = captureHeight
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
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
    if (selectedPhotoIds.length !== 4) return

    try {
      setIsComposing(true)
      const selectedImages = selectedPhotoIds.map((index) => capturedImages[index])
      const image = await createFourCutImage(selectedImages, selectedBackground)
      setFinalImage(image)
      setScreen('result')
    } catch {
      setCameraError('사진을 완성하는 중 문제가 생겼어요. 다시 선택해주세요.')
    } finally {
      setIsComposing(false)
    }
  }

  const handlePrint = () => {
    window.addEventListener(
      'afterprint',
      () => {
        resetCaptureState()
        setScreen('welcome')
      },
      { once: true },
    )
    window.print()
  }

  const handleHome = () => {
    resetCaptureState()
    setScreen('welcome')
  }

  const handleBack = () => {
    resetCaptureState()
    stopCamera()
    setCameraStatus('idle')
    setCameraError('')
    setScreen(screen === 'camera' ? 'welcome' : 'welcome')
  }

  useEffect(() => {
    return () => {
      captureSequenceRef.current += 1
      clearTimer()
      requestIdRef.current += 1
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  if (screen === 'result') {
    return (
      <main className="result-screen">
        <header className="result-header">
          <p className="eyebrow">SPECIAL MOMENTS</p>
          <h1>사진 완성!</h1>
          <p>마음에 드는 4장의 사진을 골랐어요.</p>
        </header>

        <section className="result-content">
          <img className="combined-image" src={finalImage} alt="완성된 4컷 사진" />
          <div className="result-actions">
            <button type="button" className="retake-button" onClick={() => setScreen('background')}>
              ← 다시 선택
            </button>
            <button type="button" className="retake-button" onClick={handleRetake}>
              📸 다시 촬영
            </button>
            <button type="button" className="print-button" onClick={handlePrint}>
              🖨️ 인쇄하기
            </button>
            <button type="button" className="home-button" onClick={handleHome}>
              처음으로
            </button>
          </div>
          <div className="selected-thumbnails" aria-label="선택한 사진">
            {selectedPhotoIds.map((photoIndex, index) => (
              <img
                key={`${capturedImages[photoIndex]}-${index}`}
                src={capturedImages[photoIndex]}
                alt={`선택한 사진 ${index + 1}`}
              />
            ))}
          </div>
        </section>
      </main>
    )
  }

  if (screen === 'selection') {
    return (
      <main className="selection-screen">
        <header className="selection-header">
          <p className="eyebrow">CHOOSE YOUR FAVORITES</p>
          <h1>마음에 드는 사진 4장을 골라주세요</h1>
          <p>{selectedPhotoIds.length} / 4장 선택</p>
        </header>
        <section className="selection-workspace">
          <div className="selection-grid" aria-label="촬영한 사진 6장">
          {capturedImages.map((image, index) => (
            <button
              type="button"
              className={`selection-card ${selectedPhotoIds.includes(index) ? 'selected' : ''}`}
              key={`${image}-${index}`}
              onClick={() => handlePhotoToggle(index)}
            >
              <img src={image} alt={`촬영한 사진 ${index + 1}`} />
              <span className="photo-number">{index + 1}</span>
              {selectedPhotoIds.includes(index) && (
                <span className="selection-order">
                  {selectedPhotoIds.indexOf(index) + 1}
                </span>
              )}
            </button>
          ))}
          </div>
          <div className="four-preview" aria-label="선택한 사진 2x2 미리보기">
            {selectedPhotoIds.map((photoIndex, order) => (
              <img
                key={`${capturedImages[photoIndex]}-${order}`}
                src={capturedImages[photoIndex]}
                alt={`선택한 사진 ${order + 1}`}
              />
            ))}
            {Array.from({ length: 4 - selectedPhotoIds.length }).map((_, index) => (
              <div className="four-preview-empty" key={`empty-${index}`}>
                {selectedPhotoIds.length + index + 1}
              </div>
            ))}
          </div>
        </section>
        <div className="selection-actions">
          <button
            type="button"
            className="background-start-button"
            disabled={selectedPhotoIds.length !== 4}
            onClick={() => setScreen('background')}
          >
            다음: 배경 프레임 선택
          </button>
          <button type="button" className="retake-button" onClick={handleRetake}>
            🔄 다시 촬영
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'background') {
    return (
      <main className="background-screen">
        <header className="background-header">
          <button
            type="button"
            className="back-button light-back-button"
            onClick={() => setScreen('selection')}
          >
            ← 사진 다시 선택
          </button>
          <div>
            <p className="eyebrow">SPECIAL MOMENTS</p>
            <h1>🎨 배경 프레임을 선택해주세요</h1>
            <p>4컷 사진에 어울리는 프레임을 골라보세요!</p>
          </div>
          <div className="header-spacer" aria-hidden="true" />
        </header>

        <section className="background-content">
          <div className="frame-preview" aria-label="선택한 사진과 프레임 미리보기">
            {selectedPhotoIds.map((photoIndex, order) => (
              <img
                key={`${capturedImages[photoIndex]}-${order}`}
                src={capturedImages[photoIndex]}
                alt={`4컷 미리보기 ${order + 1}`}
              />
            ))}
          </div>
          <div className="background-grid" aria-label="사진 프레임 목록">
            {BACKGROUND_OPTIONS.map((background) => (
              <button
                type="button"
                className={`background-card ${
                  selectedBackground.id === background.id ? 'selected' : ''
                }`}
                key={background.id}
                onClick={() => setSelectedBackground(background)}
              >
                <span className="background-preview" style={{ backgroundColor: background.color }}>
                  <span className="background-placeholder" aria-hidden="true">✦</span>
                </span>
                <span className="background-name">
                  {selectedBackground.id === background.id && <span aria-hidden="true">✓ </span>}
                  {background.name}
                </span>
              </button>
            ))}
          </div>
          <p className="selected-background" aria-live="polite">
            ✓ {selectedBackground.name}
          </p>
          <button
            type="button"
            className="background-start-button"
            disabled={isComposing || selectedPhotoIds.length !== 4}
            onClick={() => void handleFrameContinue()}
          >
            {isComposing ? '사진을 만드는 중...' : '🎉 이 프레임으로 완성하기'}
          </button>
        </section>
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
          <div className="header-spacer" aria-hidden="true" />
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
              className={cameraStatus === 'ready' ? 'video-preview' : 'video-preview hidden'}
            />
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
          <p className="photo-progress" aria-live="polite">
            {Math.min(capturedImages.length + 1, PHOTO_COUNT)} / {PHOTO_COUNT}
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
    <main className="welcome-screen">
      <header className="welcome-header">
        <p className="eyebrow">SPECIAL MOMENTS</p>
        <h1>📸 우리 학교 4컷 사진관</h1>
        <p className="subtitle">6장의 사진을 찍고, 마음에 드는 4장을 골라보세요!</p>
      </header>

      <section className="welcome-content" aria-labelledby="welcome-message">
        <div className="camera-art" aria-hidden="true">
          <span className="sparkle sparkle-one">✦</span>
          <span className="sparkle sparkle-two">✦</span>
          <div className="camera-shape">
            <div className="camera-flash" />
            <div className="camera-lens">
              <div className="lens-glow" />
            </div>
          </div>
          <div className="camera-shadow" />
        </div>

        <div className="welcome-copy">
          <h2 id="welcome-message">6장의 사진을 찍고, 마음에 드는 4장을 골라보세요!</h2>
          <p>친구들과 함께 웃고, 포즈를 취하며 추억을 만들어 보아요.</p>
          <button type="button" className="start-button" onClick={() => void startCamera()}>
            <span aria-hidden="true">📷</span>
            사진 촬영하기
          </button>
        </div>
      </section>

      <footer className="privacy-note">
        <span aria-hidden="true">🔒</span>
        사진은 이 기기에만 임시로 저장되며 촬영과 인쇄가 끝나면 삭제됩니다.
      </footer>
    </main>
  )
}

export default App
