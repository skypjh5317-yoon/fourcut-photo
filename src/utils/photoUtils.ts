import type { PhotoFrame } from '../data/frames'

/**
 * Canon SELPHY CP1500 10x15cm 세로 인쇄를 고려한 캔버스
 * 1000 x 1480, 100:148 비율
 */
export const CANVAS_WIDTH = 1000
export const CANVAS_HEIGHT = 1480

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

  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas를 사용할 수 없습니다.')
  }

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
/**
 * 뽀샤시 효과 — 사진을 밝고 부드럽게, 피부는 살짝 화사하게.
 * ctx.filter를 지원하지 않는 아이폰에서도 똑같이 나오도록 픽셀을 직접 다룬다.
 */
export const applySoftBeauty = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  // 1) 밝기·톤: 어두운 곳을 살짝 들어 올리고, 대비는 낮추고, 따뜻한 분홍빛
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    const v = i / 255
    const lifted = Math.pow(v, 0.78) // 밝게(그림자 위주)
    const soft = 0.5 + (lifted - 0.5) * 0.84 // 대비 살짝 낮춤
    lut[i] = Math.round(soft * 255 + 10)
  }
  for (let i = 0; i < data.length; i += 4) {
    let r = lut[data[i]]
    let g = lut[data[i + 1]]
    let b = lut[data[i + 2]]
    // 채도 살짝 올리기
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    r = gray + (r - gray) * 1.06
    g = gray + (g - gray) * 1.06
    b = gray + (b - gray) * 1.06
    // 따뜻한 분홍빛
    data[i] = r + 9
    data[i + 1] = g + 1
    data[i + 2] = b + 5
  }
  ctx.putImageData(imageData, 0, 0)

  // 2) 부드러운 빛번짐(뽀샤시): 작게 줄였다 키운 흐린 사진을 겹친다
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

  // 피부 결 부드럽게 (살짝만 섞어서 눈·입은 또렷하게 남김)
  const smooth = makeBlurred(0.12)
  if (smooth) {
    ctx.globalAlpha = 0.34
    ctx.drawImage(smooth, 0, 0, width, height)
  }

  // 화사한 빛번짐
  const glow = makeBlurred(0.06)
  if (glow) {
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.32
    ctx.drawImage(glow, 0, 0, width, height)
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}
