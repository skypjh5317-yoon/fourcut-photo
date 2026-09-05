export type BackgroundOption = {
  id: string
  name: string
  image: string
  color: string
}

// 최종 인화 이미지: 4×6 세로 비율
export const CANVAS_WIDTH = 1200
export const CANVAS_HEIGHT = 1776

// ─────────────────────────────────────
// 3컷 레이아웃
// ─────────────────────────────────────

// 좌우 여백
const SIDE_MARGIN = 100

// 사진 실제 표시 영역
const PHOTO_WIDTH = CANVAS_WIDTH - SIDE_MARGIN * 2

// 사진 사이 간격
const PHOTO_GAP = 18

// 제목 영역
const TOP_AREA = 245

// 하단 문구 영역
const BOTTOM_AREA = 90

// 3장의 사진에 사용할 전체 높이
const AVAILABLE_PHOTO_HEIGHT =
  CANVAS_HEIGHT -
  TOP_AREA -
  BOTTOM_AREA -
  PHOTO_GAP * 2

// 사진 한 장당 슬롯 높이
const PHOTO_HEIGHT = Math.floor(AVAILABLE_PHOTO_HEIGHT / 3)

// 사진 X 위치
const PHOTO_X = (CANVAS_WIDTH - PHOTO_WIDTH) / 2

// 첫 번째 사진 Y 위치
const PHOTO_START_Y = TOP_AREA

function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)

    image.src = source
  })
}

// 배경용
// 캔버스 전체를 채우기 위해 사용
// 학생 사진에는 사용하지 않음
function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
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

// 학생 사진용
// 원본 비율을 유지하면서 사진을 최대한 크게 표시
// 절대로 사진을 자르지 않음
function drawContainImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(
    width / image.naturalWidth,
    height / image.naturalHeight,
  )

  const drawnWidth = image.naturalWidth * scale
  const drawnHeight = image.naturalHeight * scale

  const drawnX = x + (width - drawnWidth) / 2
  const drawnY = y + (height - drawnHeight) / 2

  context.drawImage(
    image,
    drawnX,
    drawnY,
    drawnWidth,
    drawnHeight,
  )
}

export async function createFourCutImage(
  images: string[],
  background: BackgroundOption,
): Promise<string> {
  const canvas = document.createElement('canvas')

  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas를 사용할 수 없습니다.')
  }

  // ─────────────────────────────────────
  // 1. 배경
  // ─────────────────────────────────────

  const backgroundImage = await loadImage(background.image)

  if (backgroundImage) {
    drawCoverImage(
      context,
      backgroundImage,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    )

    context.fillStyle = 'rgba(255, 255, 255, 0.22)'
    context.fillRect(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    )
  } else {
    context.fillStyle = background.color
    context.fillRect(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    )

    context.fillStyle = 'rgba(255, 255, 255, 0.36)'

    context.fillRect(
      70,
      70,
      CANVAS_WIDTH - 140,
      CANVAS_HEIGHT - 140,
    )
  }

  // ─────────────────────────────────────
  // 2. 제목
  // ─────────────────────────────────────

  context.fillStyle = '#2e4057'

  context.font =
    '800 58px "Trebuchet MS", "Malgun Gothic", sans-serif'

  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'

  context.fillText(
    '우리의 3컷 사진',
    CANVAS_WIDTH / 2,
    155,
  )

  context.font =
    '700 30px "Trebuchet MS", "Malgun Gothic", sans-serif'

  context.fillText(
    background.name,
    CANVAS_WIDTH / 2,
    215,
  )

  // ─────────────────────────────────────
  // 3. 사진 3장
  // ─────────────────────────────────────

  // 촬영된 사진 중 최대 3장만 사용
  const loadedPhotos = await Promise.all(
    images
      .slice(0, 3)
      .map((image) => loadImage(image)),
  )

  loadedPhotos.forEach((image, index) => {
    if (!image) return

    const y =
      PHOTO_START_Y +
      index * (PHOTO_HEIGHT + PHOTO_GAP)

    // 사진 주변 흰색 테두리
    const FRAME_PADDING = 10

    context.fillStyle = '#ffffff'

    context.fillRect(
      PHOTO_X - FRAME_PADDING,
      y - FRAME_PADDING,
      PHOTO_WIDTH + FRAME_PADDING * 2,
      PHOTO_HEIGHT + FRAME_PADDING * 2,
    )

    // 학생 사진
    // contain 방식 → 얼굴과 상반신을 자르지 않음
    drawContainImage(
      context,
      image,
      PHOTO_X,
      y,
      PHOTO_WIDTH,
      PHOTO_HEIGHT,
    )
  })

  // ─────────────────────────────────────
  // 4. 하단 문구
  // ─────────────────────────────────────

  context.fillStyle = '#2e4057'

  context.font =
    '700 30px "Trebuchet MS", "Malgun Gothic", sans-serif'

  context.fillText(
    '우리의 특별한 순간',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - 45,
  )

  // ─────────────────────────────────────
  // 5. JPEG 생성
  // ─────────────────────────────────────

  return canvas.toDataURL(
    'image/jpeg',
    0.92,
  )
}