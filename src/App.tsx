import { useEffect, useRef, useState } from 'react'
import './App.css'

type Screen = 'welcome' | 'camera' | 'result'
type CameraStatus = 'idle' | 'loading' | 'ready' | 'error'
type CapturePhase = 'idle' | 'countdown' | 'flash' | 'preparing'

const PHOTO_COUNT = 4

function createFourCutImage(images: string[]): Promise<string> {
  const width = 1200
  const gap = 24
  const photoHeight = 680
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = photoHeight * PHOTO_COUNT + gap * (PHOTO_COUNT - 1)
  const context = canvas.getContext('2d')

  if (!context) {
    return Promise.reject(new Error('Canvas를 사용할 수 없습니다.'))
  }

  context.fillStyle = '#fff9ed'
  context.fillRect(0, 0, canvas.width, canvas.height)

  return Promise.all(
    images.map(
      (source) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.onerror = () => reject(new Error('사진을 불러올 수 없습니다.'))
          image.src = source
        }),
    ),
  ).then((loadedImages) => {
    loadedImages.forEach((image, index) => {
      const scale = Math.max(width / image.naturalWidth, photoHeight / image.naturalHeight)
      const sourceWidth = width / scale
      const sourceHeight = photoHeight / scale
      const sourceX = (image.naturalWidth - sourceWidth) / 2
      const sourceY = (image.naturalHeight - sourceHeight) / 2
      const destinationY = index * (photoHeight + gap)

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        destinationY,
        width,
        photoHeight,
      )
    })

    return canvas.toDataURL('image/jpeg', 0.92)
  })
}

function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [cameraError, setCameraError] = useState('')
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [finalImage, setFinalImage] = useState('')
  const [capturePhase, setCapturePhase] = useState<CapturePhase>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)
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
    setCapturePhase('idle')
    setCountdown(null)
  }

  const handleStart = async () => {
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

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.92)
  }

  const finishCapture = async (images: string[], sequence: number) => {
    try {
      const combinedImage = await createFourCutImage(images)
      if (sequence !== captureSequenceRef.current) {
        return
      }
      setFinalImage(combinedImage)
      setScreen('result')
      stopCamera()
    } catch {
      setCameraStatus('error')
      setCameraError('사진을 완성하는 중 문제가 생겼어요. 다시 촬영해주세요.')
      setCapturePhase('idle')
    }
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
    setScreen('welcome')
  }

  const handlePrint = () => {
    alert('인쇄 기능은 다음 단계에서 연결합니다.')
  }

  const handleBack = () => {
    resetCaptureState()
    stopCamera()
    setCameraStatus('idle')
    setCameraError('')
    setScreen('welcome')
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
          <h1>촬영 완료!</h1>
          <p>우리의 4컷 사진</p>
        </header>

        <section className="result-content">
          <div className="photo-grid" aria-label="촬영한 네 장의 사진">
            {capturedImages.map((image, index) => (
              <img key={`${image}-${index}`} src={image} alt={`촬영한 사진 ${index + 1}`} />
            ))}
          </div>
          <div className="result-actions">
            <button type="button" className="retake-button" onClick={handleRetake}>
              🔄 다시 촬영
            </button>
            <button type="button" className="print-button" onClick={handlePrint}>
              🖨️ 인쇄
            </button>
          </div>
          {finalImage && <img className="combined-image" src={finalImage} alt="완성된 4컷 사진" />}
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
        <h1>📸 나만의 4컷 사진</h1>
        <p className="subtitle">우리의 특별한 순간을 사진으로 남겨요!</p>
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
          <h2 id="welcome-message">친구들과 함께 4장의 사진을 찍어보세요!</h2>
          <p>웃고, 포즈를 취하고, 우리만의 추억을 만들어 보아요.</p>
          <button type="button" className="start-button" onClick={handleStart}>
            <span aria-hidden="true">📷</span>
            촬영 시작
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
