import { useId } from 'react'

/**
 * 낙서 느낌의 네 칸 로고
 * 1) 빗금 칸  2) 웃는 얼굴  3) 브이 손  4) 찡긋 얼굴 + 위에 앉은 고양이
 * 이미지 파일 없이 SVG로 그려서 학교망에서도 막히지 않는다.
 */
type DoodleLogoProps = {
  className?: string
  /** 첫 화면에서 네 칸이 하나씩 통통 튀어나오게 */
  animated?: boolean
}

const INK = '#141414'
const ACCENT = '#ffd43b'

function DoodleLogo({ className, animated = false }: DoodleLogoProps) {
  const hatchId = `hatch-${useId().replace(/:/g, '')}`

  return (
    <svg
      className={`doodle-logo ${animated ? 'is-animated' : ''} ${className ?? ''}`}
      viewBox="0 0 470 150"
      role="img"
      aria-label="네 칸 사진 로고"
    >
      <defs>
        <pattern id={hatchId} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="14" fill={INK} />
          <rect width="5" height="14" fill="#5a5a5a" />
        </pattern>
      </defs>

      {/* 1. 빗금 칸 */}
      <g className="doodle-tile" style={{ ['--tile' as string]: 0 }}>
        <rect x="8" y="42" width="100" height="100" rx="18" fill={`url(#${hatchId})`} stroke={INK} strokeWidth="6" />
      </g>

      {/* 2. 웃는 얼굴 (노란 볼) */}
      <g className="doodle-tile" style={{ ['--tile' as string]: 1 }}>
        <rect x="124" y="42" width="100" height="100" rx="18" fill="#fff" stroke={INK} strokeWidth="6" />
        <circle cx="157" cy="83" r="6" fill={INK} />
        <circle cx="191" cy="83" r="6" fill={INK} />
        <circle cx="147" cy="103" r="7" fill={ACCENT} />
        <circle cx="201" cy="103" r="7" fill={ACCENT} />
        <path d="M159 104 Q174 118 189 104" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* 3. 브이 손 */}
      <g className="doodle-tile" style={{ ['--tile' as string]: 2 }}>
        <rect x="240" y="42" width="100" height="100" rx="18" fill={INK} stroke={INK} strokeWidth="6" />
        <path d="M281 104 L271 66" stroke="#fff" strokeWidth="13" strokeLinecap="round" />
        <path d="M299 104 L309 66" stroke="#fff" strokeWidth="13" strokeLinecap="round" />
        <rect x="268" y="96" width="44" height="34" rx="14" fill="#fff" />
        <path d="M276 108 h28" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* 4. 찡긋 얼굴 + 고양이 */}
      <g className="doodle-tile" style={{ ['--tile' as string]: 3 }}>
        <rect x="356" y="42" width="100" height="100" rx="18" fill="#fff" stroke={INK} strokeWidth="6" />
        <path d="M380 80 l12 6 l-12 6" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M432 80 l-12 6 l12 6" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M398 110 Q406 104 414 110" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        {/* 칸 위에 앉아 있는 고양이 */}
        <g className="doodle-cat">
          <path
            d="M408 44 C408 24 418 14 432 14 C446 14 456 24 456 44 Z"
            fill={ACCENT}
            stroke={INK}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path d="M416 22 L414 6 L426 15" fill={ACCENT} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M438 15 L450 6 L448 22" fill={ACCENT} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="425" cy="29" r="2.8" fill={INK} />
          <circle cx="439" cy="29" r="2.8" fill={INK} />
          <path d="M456 40 C468 38 468 26 460 22" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  )
}

export default DoodleLogo
