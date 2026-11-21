/**
 * 우리 학교 네컷 마스코트 "찰칵이"
 * 동글동글한 즉석카메라. 렌즈가 얼굴이고, 아래 틈으로 네컷 사진이 쏙 나온다.
 * 이미지 파일 없이 SVG로 그려서 학교망에서도 막히지 않는다.
 */
type CameraMascotProps = {
  className?: string
  /** 사진이 스르륵 나오고 눈을 깜빡이는 움직임 */
  animated?: boolean
}

const INK = '#2b2233'
const CORAL = '#ff6b57'
const CREAM = '#fffaf3'

function CameraMascot({ className, animated = false }: CameraMascotProps) {
  return (
    <svg
      className={`camera-mascot ${animated ? 'is-animated' : ''} ${className ?? ''}`}
      viewBox="0 0 260 270"
      role="img"
      aria-label="카메라 캐릭터 찰칵이"
    >
      {/* 반짝이 */}
      <path className="mascot-spark spark-a" d="M28 46 l5 12 l12 5 l-12 5 l-5 12 l-5 -12 l-12 -5 l12 -5 z" fill="#ffd66b" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path className="mascot-spark spark-b" d="M236 118 l3.5 8 l8 3.5 l-8 3.5 l-3.5 8 l-3.5 -8 l-8 -3.5 l8 -3.5 z" fill={CORAL} stroke={INK} strokeWidth="3" strokeLinejoin="round" />

      {/* 아래 틈으로 나오는 네컷 사진 (몸통 뒤에 그려서 틈에서 나오는 것처럼 보인다) */}
      <g className="mascot-print">
        <rect x="82" y="150" width="96" height="104" rx="5" fill="#fff" stroke={INK} strokeWidth="5" />
        <rect x="93" y="192" width="34" height="24" rx="3" fill="#ffd2c8" />
        <rect x="133" y="192" width="34" height="24" rx="3" fill="#bfe9d9" />
        <rect x="93" y="221" width="34" height="24" rx="3" fill="#ffe7a3" />
        <rect x="133" y="221" width="34" height="24" rx="3" fill="#d8d2f6" />
      </g>

      {/* 셔터 버튼 */}
      <rect x="160" y="22" width="38" height="20" rx="7" fill={CREAM} stroke={INK} strokeWidth="5" />

      {/* 몸통 */}
      <rect x="30" y="34" width="200" height="152" rx="42" fill={CORAL} stroke={INK} strokeWidth="6" />
      {/* 몸통 아래 사진 나오는 틈 */}
      <rect x="74" y="170" width="112" height="9" rx="4.5" fill={INK} />
      {/* 플래시 · 뷰파인더 */}
      <rect x="54" y="54" width="38" height="22" rx="7" fill="#ffd66b" stroke={INK} strokeWidth="5" />
      <rect x="176" y="54" width="30" height="22" rx="7" fill={INK} />
      <rect x="181" y="58" width="8" height="5" rx="2.5" fill="#fff" opacity="0.8" />

      {/* 렌즈 = 얼굴 */}
      <circle cx="130" cy="112" r="50" fill={CREAM} stroke={INK} strokeWidth="6" />
      <circle cx="130" cy="112" r="39" fill="none" stroke="#f3dccb" strokeWidth="4" />
      <g className="mascot-eyes">
        <ellipse cx="113" cy="106" rx="5.5" ry="7.5" fill={INK} />
        <ellipse cx="147" cy="106" rx="5.5" ry="7.5" fill={INK} />
      </g>
      <circle cx="101" cy="124" r="7" fill="#ffb4a8" />
      <circle cx="159" cy="124" r="7" fill="#ffb4a8" />
      <path d="M121 123 Q130 133 139 123" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export default CameraMascot
