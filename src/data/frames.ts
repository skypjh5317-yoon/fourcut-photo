export interface PhotoFrame {
  id: string
  name: string
  enabled: boolean
  category?: string
  background?: string
  overlay?: string
  thumbnail?: string
  title?: string
  subtitle?: string
  footerText?: string
}

// ==========================
// 기본 프레임
// ==========================

export const frames: PhotoFrame[] = [
  {
    id: 'basic-cream',
    name: '기본 크림',
    enabled: true,
    category: 'basic',
    background: '#fff4dc',
    title: '우리 학교 4컷 사진관',
    footerText: '',
  },
  {
    id: 'pastel',
    name: '파스텔',
    enabled: true,
    category: 'basic',
    background: '#f8e9f0',
    title: '우리 학교 4컷 사진관',
    footerText: '',
  },
  {
    id: 'our-school',
    name: '우리 학교',
    enabled: true,
    category: 'school',
    background: '#e5f1e8',
    title: '우리 학교 4컷 사진관',
    subtitle: '우리 학교',
    footerText: '',
  },
  {
    id: 'nature',
    name: '자연',
    enabled: true,
    category: 'nature',
    background: '#dff2e6',
    title: '우리 학교 4컷 사진관',
    subtitle: '자연',
    footerText: '',
  },
  {
    id: 'simple',
    name: '심플',
    enabled: true,
    category: 'basic',
    background: '#f7f7f4',
    title: '우리 학교 4컷 사진관',
    footerText: '',
  },

  // ==========================
  // 학교 행사
  // ==========================
  // 새 행사는 이 배열에 PhotoFrame을 추가하고 enabled를 true로 설정합니다.

  // ==========================
  // 계절
  // ==========================

  // ==========================
  // 환경 / 생태
  // ==========================

  // ==========================
  // 특별 행사
  // ==========================
]

export const enabledFrames = frames.filter((frame) => frame.enabled)
