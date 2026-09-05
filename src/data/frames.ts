import basicCream from '../assets/frames/basic-cream.png'
import pastel from '../assets/frames/pastel.png'
import ourSchool from '../assets/frames/our-school.png'
import nature from '../assets/frames/nature.png'
import simple from '../assets/frames/simple.png'

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
    background: basicCream,
    title: '',
    footerText: '',
  },
  {
    id: 'pastel',
    name: '파스텔',
    enabled: true,
    category: 'basic',
    background: pastel,
    title: '',
    footerText: '',
  },
  {
    id: 'our-school',
    name: '우리 학교',
    enabled: true,
    category: 'school',
    background: ourSchool,
    title: '',
    subtitle: '',
    footerText: '',
  },
  {
    id: 'nature',
    name: '자연',
    enabled: true,
    category: 'nature',
    background: nature,
    title: '',
    subtitle: '',
    footerText: '',
  },
  {
    id: 'simple',
    name: '심플',
    enabled: true,
    category: 'basic',
    background: simple,
    title: '',
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
