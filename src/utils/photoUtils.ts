import type { PhotoFrame } from '../data/frames'

/**
 * Canon SELPHY CP1500 10x15cm 세로 인쇄를 고려한 캔버스
 * 1000 x 1480, 100:148 비율
 */
export const CANVAS_WIDTH = 1000
export const CANVAS_HEIGHT = 1480
// 결과물 해상도 배율 (2 → 2000×2960)
const OUTPUT_SCALE = 2

// 전체 디자인 여백
const SIDE_MARGIN = 40

// 사진 영역
const PHOTO_GAP = 18
const TOP_AREA = 240
const BOTTOM_AREA = 180
const BASE_PHOTO_GRID_WIDTH = 608
const MAX_PHOTO_GRID_WIDTH = CANVAS_WIDTH * 0.85
const BASE_PHOTO_SIZE = Math.floor((BASE_PHOTO_GRID_WIDTH - PHOTO_GAP) / 2)
const CURRENT_PHOTO_GRID_WIDTH = Math.min(
  Math.round(BASE_PHOTO_GRID_WIDTH * 1.15),
  MAX_PHOTO_GRID_WIDTH,
)
const PHOTO_GRID_WIDTH = Math.min(
  Math.round(CURRENT_PHOTO_GRID_WIDTH * 1.1),
  MAX_PHOTO_GRID_WIDTH,
)
const PHOTO_WIDTH = Math.floor((PHOTO_GRID_WIDTH - PHOTO_GAP) / 2)
const PHOTO_HEIGHT = PHOTO_WIDTH

const PHOTO_GRID_X = (CANVAS_WIDTH - PHOTO_GRID_WIDTH) / 2
const PHOTO_X_POSITIONS = [PHOTO_GRID_X, PHOTO_GRID_X + PHOTO_WIDTH + PHOTO_GAP]
const AVAILABLE_GRID_HEIGHT = CANVAS_HEIGHT - TOP_AREA - BOTTOM_AREA
const CENTERED_PHOTO_START_Y =
  TOP_AREA + Math.floor((AVAILABLE_GRID_HEIGHT - (BASE_PHOTO_SIZE * 2 + PHOTO_GAP)) / 2)
const CURRENT_PHOTO_START_Y = CENTERED_PHOTO_START_Y - 120
const PHOTO_START_Y = CURRENT_PHOTO_START_Y - 80
const PHOTO_Y_POSITIONS = [PHOTO_START_Y, PHOTO_START_Y + PHOTO_HEIGHT + PHOTO_GAP]

export const PHOTO_SLOT_ASPECT_RATIO = '1 / 1'

/**
 * 사진 4칸의 위치 (캔버스 기준 px). 관리자 페이지에서 새 프레임을 올릴 때
 * 사진이 들어갈 자리를 보여주는 데 쓴다. 합성 계산에는 영향을 주지 않는다.
 */
export const PHOTO_SLOTS = PHOTO_Y_POSITIONS.flatMap((y) =>
  PHOTO_X_POSITIONS.map((x) => ({ x, y, width: PHOTO_WIDTH, height: PHOTO_HEIGHT })),
)

function loadImage(source?: string): Promise<HTMLImageElement | null> {
  if (!source || source.startsWith('#')) return Promise.resolve(null)
  return new Promise((resolve) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)

    image.src = source
  })
}

/**
 * 배경 이미지는 캔버스 전체를 채움
 * 배경은 잘려도 괜찮으므로 cover 사용
 */
function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!image.naturalWidth || !image.naturalHeight) return

  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  )

  const sourceWidth = width / scale
  const sourceHeight = height / scale

  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  )
}

/**
 * 사진 주변의 배경 영역을 자연스럽게 채움
 *
 * 사진이 세로형이라 사진 좌우에 남는 공간을
 * 흰색으로 남겨두지 않고 선택한 배경색으로 채운다.
 */
function drawPhotoBackground(
  context: CanvasRenderingContext2D,
  frame: PhotoFrame,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save()

  // 둥근 모서리
  const radius = 18

  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.clip()

  context.fillStyle = frame.background?.startsWith('#')
    ? frame.background
    : '#fff4dc'
  context.fillRect(x, y, width, height)

  context.restore()
}

/**
 * 사진 프레임
 */
function drawPhotoFrame(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save()

  const radius = 18

  context.beginPath()
  context.roundRect(
    x - 8,
    y - 8,
    width + 16,
    height + 16,
    radius + 3,
  )

  context.fillStyle = '#ffffff'
  context.fill()

  context.restore()
}

/**
 * 세로 10x15cm 2x2 포토부스 이미지 생성
 *
 * images:
 * - 촬영된 사진 배열
 * - 앞에서부터 최대 4장 사용
 */
export async function createFourCutImage(
  images: string[],
  frame: PhotoFrame,
): Promise<string> {
  const canvas = document.createElement('canvas')

  // 결과 사진을 2배 크기로 만든다 (2000×2960).
  // 자리 계산은 그대로 1000×1480 기준이고, 그리기만 2배로 해서 사진이 훨씬 또렷해진다.
  canvas.width = CANVAS_WIDTH * OUTPUT_SCALE
  canvas.height = CANVAS_HEIGHT * OUTPUT_SCALE

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas를 사용할 수 없습니다.')
  }

  context.scale(OUTPUT_SCALE, OUTPUT_SCALE)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  // --------------------------------------------------
  // 1. 배경
  // --------------------------------------------------

  const backgroundImage = await loadImage(frame.background ?? frame.image)

  if (backgroundImage) {
    drawCoverImage(
      context,
      backgroundImage,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    )
    // 직접 디자인한 프레임 색이 그대로 인쇄되도록 흰색 덮개는 씌우지 않는다.
  } else {
    // 배경 이미지가 없을 경우 선택한 색상 사용
    context.fillStyle = frame.background?.startsWith('#')
      ? frame.background
      : '#fff4dc'
    context.fillRect(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    )

    // 안쪽에 살짝 밝은 영역
    context.fillStyle = 'rgba(255, 255, 255, 0.28)'

    context.roundRect(
      SIDE_MARGIN,
      SIDE_MARGIN,
      CANVAS_WIDTH - SIDE_MARGIN * 2,
      CANVAS_HEIGHT - SIDE_MARGIN * 2,
      35,
    )

    context.fill()
  }

  // --------------------------------------------------
  // 2. 상단 제목
  // --------------------------------------------------

  context.fillStyle = '#2e4057'

  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.font =
    '800 52px "Trebuchet MS", "Malgun Gothic", sans-serif'

  context.fillText(frame.title ?? '우리 학교 4컷 사진관', CANVAS_WIDTH / 2, 110)

  context.font =
    '700 28px "Trebuchet MS", "Malgun Gothic", sans-serif'

  if (frame.subtitle) {
    context.fillText(frame.subtitle, CANVAS_WIDTH / 2, 165)
  }

  // --------------------------------------------------
  // 3. 사진 불러오기
  // --------------------------------------------------

  const loadedPhotos = await Promise.all(images.slice(0, 4).map((image) => loadImage(image)))

  // 사진 4칸 전체를 하나의 흰 바탕으로 깔아서
  // 사진 사이 틈으로 프레임 그림이 가는 선처럼 비치지 않게 한다.
  context.save()
  context.beginPath()
  context.roundRect(
    PHOTO_X_POSITIONS[0] - 8,
    PHOTO_Y_POSITIONS[0] - 8,
    PHOTO_WIDTH * 2 + PHOTO_GAP + 16,
    PHOTO_HEIGHT * 2 + PHOTO_GAP + 16,
    21,
  )
  context.fillStyle = '#ffffff'
  context.fill()
  context.restore()

  // --------------------------------------------------
  // 4. 사진 4장 배치
  // --------------------------------------------------

  loadedPhotos.forEach((image, index) => {
    if (!image) return

    const x = PHOTO_X_POSITIONS[index % 2]
    const y = PHOTO_Y_POSITIONS[Math.floor(index / 2)]

    // 사진 영역의 배경
    //
    // 사진의 실제 비율 때문에 남는 좌우 공간을
    // 흰색이 아니라 선택한 배경색으로 처리
    drawPhotoBackground(
      context,
      frame,
      x,
      y,
      PHOTO_WIDTH,
      PHOTO_HEIGHT,
    )

    // 흰색 포토 프레임
    drawPhotoFrame(
      context,
      x,
      y,
      PHOTO_WIDTH,
      PHOTO_HEIGHT,
    )

    // 실제 인쇄와 동일한 중앙 cover crop
    drawCoverImage(
      context,
      image,
      x,
      y,
      PHOTO_WIDTH,
      PHOTO_HEIGHT,
    )
  })

  const overlayImage = await loadImage(frame.overlay)
  if (overlayImage) {
    context.drawImage(overlayImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  // --------------------------------------------------
  // 5. 하단 문구
  // --------------------------------------------------

  context.fillStyle = '#2e4057'

  context.font =
    '700 28px "Trebuchet MS", "Malgun Gothic", sans-serif'

  context.textAlign = 'center'
  context.textBaseline = 'middle'

  if (frame.footerText) {
    context.fillText(frame.footerText, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40)
  }

  // --------------------------------------------------
  // 6. JPEG 변환
  // --------------------------------------------------

  return canvas.toDataURL(
    'image/jpeg',
    0.92,
  )
}
// 가로·세로로 평균을 내는 빠른 흐림 (슬라이딩 합계, 픽셀 수에 비례하는 속도)
const boxBlur = (src: Float32Array, width: number, height: number, radius: number) => {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  const size = radius * 2 + 1
  for (let y = 0; y < height; y++) {
    const row = y * width
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      sum += src[row + Math.min(width - 1, Math.max(0, k))]
    }
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / size
      const add = Math.min(width - 1, x + radius + 1)
      const remove = Math.max(0, x - radius)
      sum += src[row + add] - src[row + remove]
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let k = -radius; k <= radius; k++) {
      sum += tmp[Math.min(height - 1, Math.max(0, k)) * width + x]
    }
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / size
      const add = Math.min(height - 1, y + radius + 1)
      const remove = Math.max(0, y - radius)
      sum += tmp[add * width + x] - tmp[remove * width + x]
    }
  }
  return out
}

const softBand = (v: number, lo: number, hi: number, soft: number) =>
  Math.min(1, Math.max(0, Math.min((v - lo) / soft + 1, (hi - v) / soft + 1)))

/**
 * 잡티 보정 — 피부색인 곳에서만, 주변보다 살짝 어두운 작은 점(잡티·뾰루지·모공)을 주변 피부색으로 메운다.
 * 눈·눈썹·입·머리카락처럼 진하고 뚜렷한 부분은 피부색이 아니거나 차이가 커서 그대로 남는다.
 */
export const applyBlemishRetouch = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const count = width * height

  const skin = new Float32Array(count)
  const sr = new Float32Array(count)
  const sg = new Float32Array(count)
  const sb = new Float32Array(count)
  for (let p = 0, i = 0; p < count; p++, i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    const m =
      softBand(cb, 77, 127, 8) * softBand(cr, 133, 173, 8) * Math.min(1, Math.max(0, (lum - 60) / 30))
    skin[p] = m
    sr[p] = r * m
    sg[p] = g * m
    sb[p] = b * m
  }

  // 피부만 모아서 흐리게 → 눈썹·눈 같은 진한 색이 피부에 번지지 않음
  const radius = Math.max(3, Math.round(width * 0.008))
  const blur2 = (a: Float32Array) => boxBlur(boxBlur(a, width, height, radius), width, height, radius)
  const den = blur2(skin)
  const br = blur2(sr)
  const bg = blur2(sg)
  const bb = blur2(sb)

  const STRENGTH = 0.7
  for (let p = 0, i = 0; p < count; p++, i += 4) {
    const m = skin[p]
    if (m <= 0.01 || den[p] < 0.05) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const tr = br[p] / den[p]
    const tg = bg[p] / den[p]
    const tb = bb[p] / den[p]
    const d = 0.299 * r + 0.587 * g + 0.114 * b - (0.299 * tr + 0.587 * tg + 0.114 * tb)
    // 주변보다 '확실히 어두운 점'만 메운다. 자잘한 피부 결은 남겨서 플라스틱처럼 안 보이게.
    // 눈썹·눈처럼 아주 진한 곳(d가 매우 작음)은 건드리지 않는다.
    if (d >= 0) continue
    const keep = Math.min(1, Math.max(0, (-d - 4) / 10)) * Math.min(1, Math.max(0, (60 + d) / 25))
    const w = m * keep * Math.min(1, den[p] * 2) * STRENGTH
    data[i] = r + (tr - r) * w
    data[i + 1] = g + (tg - g) * w
    data[i + 2] = b + (tb - b) * w
  }
  ctx.putImageData(imageData, 0, 0)
}

/**
 * 맑은 효과 — 갤럭시 카메라 '맑은' 필터처럼 밝고 깨끗하게.
 * 실내 조명의 누런/분홍 기운을 걷어 내고, 중간 밝기를 올리되 검은색은 진하게 유지한다.
 * ctx.filter를 지원하지 않는 아이폰에서도 똑같이 나오도록 픽셀을 직접 다룬다.
 */
export const applySoftBeauty = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // 1) 색 기운 걷어 내기: 피부가 아닌 곳(배경)의 평균색을 회색 쪽으로 당긴다.
  //    얼굴이 화면 대부분이면 피부색이 창백해지지 않도록 세기를 줄인다.
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let sampled = 0
  let used = 0
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    sampled++
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
    if (cb > 77 && cb < 127 && cr > 133 && cr < 173) continue
    sumR += r
    sumG += g
    sumB += b
    used++
  }
  const wbStrength = 0.4 * Math.min(1, used / Math.max(1, sampled) / 0.3)
  const avg = (sumR + sumG + sumB) / 3
  const balance = (sum: number) => {
    if (sum === 0 || used === 0) return 1
    const factor = 1 + wbStrength * (avg / sum - 1)
    return Math.min(1.18, Math.max(0.85, factor))
  }
  const fr = balance(sumR)
  const fg = balance(sumG)
  const fb = balance(sumB)

  // 2) 밝기 곡선: 중간 밝기는 확 올리고 검은색은 진하게
  const lut = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const v = Math.max(0, (Math.pow(i / 255, 0.78) - 0.02) / 0.98)
    // 전체를 하얀빛 쪽으로 살짝 끌어올림
    lut[i] = Math.min(1, v + (1 - v) * 0.05) * 255
  }
  const toByte = (v: number) => lut[v > 255 ? 255 : v < 0 ? 0 : Math.round(v)]

  for (let i = 0; i < data.length; i += 4) {
    let r = toByte(data[i] * fr)
    let g = toByte(data[i + 1] * fg)
    let b = toByte(data[i + 2] * fb)
    // 3) 색을 살짝 선명하게
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    r = gray + (r - gray) * 1.0
    g = gray + (g - gray) * 1.0
    b = gray + (b - gray) * 1.0
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }
  ctx.putImageData(imageData, 0, 0)

  // 4) 아주 살짝만 부드럽게 + 은은한 빛 (맑은 느낌은 유지)
  const makeBlurred = (scale: number) => {
    const small = document.createElement('canvas')
    small.width = Math.max(1, Math.round(width * scale))
    small.height = Math.max(1, Math.round(height * scale))
    const sctx = small.getContext('2d')
    if (!sctx) return null
    sctx.imageSmoothingEnabled = true
    sctx.imageSmoothingQuality = 'high'
    sctx.drawImage(canvas, 0, 0, small.width, small.height)
    // 한 번에 키우면 깍두기처럼 보이므로 두 단계로 키운다
    const mid = document.createElement('canvas')
    mid.width = Math.round(width / 3)
    mid.height = Math.round(height / 3)
    const mctx = mid.getContext('2d')
    if (!mctx) return null
    mctx.imageSmoothingEnabled = true
    mctx.imageSmoothingQuality = 'high'
    mctx.drawImage(small, 0, 0, mid.width, mid.height)
    return mid
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const smooth = makeBlurred(0.1)
  if (smooth) {
    ctx.globalAlpha = 0.04
    ctx.drawImage(smooth, 0, 0, width, height)
  }

  const glow = makeBlurred(0.06)
  if (glow) {
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.06
    ctx.drawImage(glow, 0, 0, width, height)
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

/**
 * 선명하게 — 밝기 성분만 살짝 또렷하게 (눈·머리카락·글자).
 * 아주 작은 차이(노이즈)는 키우지 않아 지저분해지지 않는다.
 */
export const applySharpen = (canvas: HTMLCanvasElement, amount = 0.8) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const count = width * height
  const lum = new Float32Array(count)
  for (let p = 0, i = 0; p < count; p++, i += 4) {
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  const blurred = boxBlur(lum, width, height, 2)
  for (let p = 0, i = 0; p < count; p++, i += 4) {
    const diff = lum[p] - blurred[p]
    if (Math.abs(diff) < 3) continue
    const add = diff * amount
    data[i] += add
    data[i + 1] += add
    data[i + 2] += add
  }
  ctx.putImageData(imageData, 0, 0)
}
