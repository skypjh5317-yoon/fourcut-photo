import { useEffect, useRef, useState } from 'react'
import './App.css'

type Screen = 'welcome' | 'camera'
type CameraStatus = 'idle' | 'loading' | 'ready' | 'error'

function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle')
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const requestIdRef = useRef(0)

  const stopCamera = () => {
    requestIdRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleStart = async () => {
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

  const handleBack = () => {
    stopCamera()
    setCameraStatus('idle')
    setCameraError('')
    setScreen('welcome')
  }

  useEffect(() => {
    return () => {
      requestIdRef.current += 1
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

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
          </div>
          <p className="camera-instruction">
            사진을 찍을 준비가 되면 촬영 버튼을 눌러주세요.
          </p>
          <button
            type="button"
            className="capture-button"
            onClick={() => alert('다음 단계에서 촬영 기능을 연결합니다.')}
            disabled={cameraStatus !== 'ready'}
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
