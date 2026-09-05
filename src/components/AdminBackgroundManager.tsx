import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  deleteBackground,
  fetchAllBackgrounds,
  getSession,
  isAdminUser,
  isSupabaseConfigured,
  signInAdmin,
  signOutAdmin,
  updateBackgroundStatus,
  uploadBackground,
  type BackgroundRecord,
} from '../services/backgroundService'

type AdminBackgroundManagerProps = {
  onBack: () => void
}

function AdminBackgroundManager({ onBack }: AdminBackgroundManagerProps) {
  const [backgrounds, setBackgrounds] = useState<BackgroundRecord[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const previewUrlRef = useRef('')

  const loadBackgrounds = async () => {
    try {
      setLoading(true)
      const session = await getSession()
      if (!isAdminUser(session?.user ?? null)) {
        setIsAuthenticated(false)
        return
      }
      setIsAuthenticated(true)
      setBackgrounds(await fetchAllBackgrounds())
    } catch {
      setError('배경 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBackgrounds(), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [previewUrlRef])

  const handleFileChange = (nextFile: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const nextPreviewUrl = nextFile ? URL.createObjectURL(nextFile) : ''
    previewUrlRef.current = nextPreviewUrl
    setFile(nextFile)
    setPreviewUrl(nextPreviewUrl)
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setWorking(true)
      setError('')
      await signInAdmin(email, password)
      setPassword('')
      await loadBackgrounds()
    } catch {
      setError('관리자 로그인에 실패했습니다.')
    } finally {
      setWorking(false)
    }
  }

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || !name.trim()) {
      setError('배경 이름과 이미지 파일을 모두 입력해주세요.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 등록할 수 있습니다.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('이미지 파일은 8MB 이하로 선택해주세요.')
      return
    }

    try {
      setWorking(true)
      setError('')
      await uploadBackground(name.trim(), file, backgrounds.length)
      setName('')
      setFile(null)
      await loadBackgrounds()
    } catch {
      setError('배경 등록에 실패했습니다. Storage와 DB 설정을 확인해주세요.')
    } finally {
      setWorking(false)
    }
  }

  const handleToggle = async (background: BackgroundRecord) => {
    try {
      setWorking(true)
      setError('')
      await updateBackgroundStatus(background.id, !background.is_active)
      await loadBackgrounds()
    } catch {
      setError('배경 사용 상태를 변경하지 못했습니다.')
    } finally {
      setWorking(false)
    }
  }

  const handleDelete = async (background: BackgroundRecord) => {
    if (!window.confirm(`'${background.name}' 배경을 삭제하시겠습니까?`)) return
    try {
      setWorking(true)
      setError('')
      await deleteBackground(background)
      await loadBackgrounds()
    } catch {
      setError('배경 삭제에 실패했습니다. Storage와 DB 상태를 확인해주세요.')
    } finally {
      setWorking(false)
    }
  }

  const handleLogout = async () => {
    await signOutAdmin()
    setIsAuthenticated(false)
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="admin-screen">
        <button type="button" className="back-button light-back-button" onClick={onBack}>
          ← 돌아가기
        </button>
        <section className="admin-panel admin-not-configured">
          <p className="eyebrow">ADMIN</p>
          <h1>🎨 4컷 사진 배경 관리</h1>
          <p>Supabase 환경변수와 관리자 인증을 먼저 설정해주세요.</p>
          <p className="admin-help">VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_EMAIL</p>
        </section>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="admin-screen">
        <button type="button" className="back-button light-back-button" onClick={onBack}>
          ← 돌아가기
        </button>
        <form className="admin-panel admin-login" onSubmit={handleLogin}>
          <p className="eyebrow">ADMIN</p>
          <h1>🎨 4컷 사진 배경 관리</h1>
          <p>관리자 계정으로 로그인해주세요.</p>
          <label>
            이메일
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            비밀번호
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="admin-error">{error}</p>}
          <button type="submit" className="background-start-button" disabled={working}>
            {working ? '로그인 중...' : '관리자 로그인'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-screen">
      <header className="admin-header">
        <button type="button" className="back-button light-back-button" onClick={onBack}>
          ← 돌아가기
        </button>
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>🎨 4컷 사진 배경 관리</h1>
        </div>
        <button type="button" className="admin-logout" onClick={() => void handleLogout()}>
          로그아웃
        </button>
      </header>

      <section className="admin-content">
        <form className="admin-upload-panel" onSubmit={handleUpload}>
          <h2>＋ 새 배경 추가</h2>
          <label>
            배경 이름
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="2026 가을 운동회" />
          </label>
          <label>
            배경 이미지
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
          </label>
          <p>권장 크기: 1200 × 1776px · PNG 권장 · 최대 8MB</p>
          {previewUrl && <img className="admin-upload-preview" src={previewUrl} alt="선택한 배경 미리보기" />}
          <button type="submit" className="background-start-button" disabled={working}>
            {working ? '등록 중...' : '배경 등록'}
          </button>
        </form>

        {error && <p className="admin-error">{error}</p>}
        {loading ? (
          <p className="admin-loading">배경을 불러오는 중...</p>
        ) : (
          <div className="admin-background-grid">
            {backgrounds.map((background) => (
              <article className="admin-background-card" key={background.id}>
                <img src={background.image} alt={`${background.name} 미리보기`} />
                <h2>{background.name}</h2>
                <p className={background.is_active ? 'status-active' : 'status-inactive'}>
                  {background.is_active ? '● 사용 중' : '○ 사용 안 함'}
                </p>
                <div className="admin-card-actions">
                  <button type="button" onClick={() => void handleToggle(background)} disabled={working}>
                    {background.is_active ? '사용 중지' : '사용하기'}
                  </button>
                  <button type="button" onClick={() => void handleDelete(background)} disabled={working}>
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default AdminBackgroundManager
