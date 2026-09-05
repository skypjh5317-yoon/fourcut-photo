export type BackgroundOption = {
  id: string
  name: string
  image: string
  color: string
}

/**
 * Canon SELPHY CP1500 10x15cm 인쇄를 고려한 가로형 캔버스
 * 1800 x 1200, 3:2 비율
 */
export const CANVAS_WIDTH = 1800
export const CANVAS_HEIGHT = 1200

// 전체 디자인 여백
const SIDE_MARGIN = 100

// 사진 영역
const PHOTO_GAP = 24
const TOP_AREA = 140
const BOTTOM_AREA = 80
const PHOTO_WIDTH = Math.floor((CANVAS_WIDTH - SIDE_MARGIN * 2 - PHOTO_GAP) / 2)
const PHOTO_HEIGHT = Math.floor(
  (CANVAS_HEIGHT - TOP_AREA - BOTTOM_AREA - PHOTO_GAP) / 2,
)

const PHOTO_X_POSITIONS = [SIDE_MARGIN, SIDE_MARGIN + PHOTO_WIDTH + PHOTO_GAP]
const PHOTO_Y_POSITIONS = [TOP_AREA, TOP_AREA + PHOTO_HEIGHT + PHOTO_GAP]

function loadImage(source: string): Promise<HTMLImageElement | null> {
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
 * 학생 사진은 원본 비율을 유지하면서 영역 안에 넣음
 *
 * 단순 contain을 사용하면 양옆에 지나치게 큰 흰 여백이
 * 생길 수 있으므로 사진 영역 자체를 세로형으로 설계했다.
 */
function drawContainImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!image.naturalWidth || !image.naturalHeight) return

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

/**
 * 사진 주변의 배경 영역을 자연스럽게 채움
 *
 * 사진이 세로형이라 사진 좌우에 남는 공간을
 * 흰색으로 남겨두지 않고 선택한 배경색으로 채운다.
 */
function drawPhotoBackground(
  context: CanvasRenderingContext2D,
  background: BackgroundOption,
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

  context.fillStyle = background.color
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
 * 2x2 포토부스 이미지 생성
 *
 * images:
 * - 촬영된 사진 배열
 * - 앞에서부터 최대 4장 사용
 */
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

  // --------------------------------------------------
  // 1. 배경
  // --------------------------------------------------

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

    // 배경을 조금 부드럽게
    context.fillStyle = 'rgba(255, 255, 255, 0.18)'
    context.fillRect(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
    )
  } else {
    // 배경 이미지가 없을 경우 선택한 색상 사용
    context.fillStyle = background.color
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

  context.fillText(
    '우리 학교 4컷 사진관',
    CANVAS_WIDTH / 2,
    110,
  )

  context.font =
    '700 28px "Trebuchet MS", "Malgun Gothic", sans-serif'

  context.fillText(
    background.name,
    CANVAS_WIDTH / 2,
    165,
  )

  // --------------------------------------------------
  // 3. 사진 불러오기
  // --------------------------------------------------

  const loadedPhotos = await Promise.all(images.slice(0, 4).map((image) => loadImage(image)))

  // --------------------------------------------------
  // 4. 사진 3장 배치
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
      background,
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

    // 실제 사진
    //
    // 사진은 원본 비율 유지
    // 얼굴과 상체가 잘리지 않음
    drawContainImage(
      context,
      image,
      x,
      y,
      PHOTO_WIDTH,
      PHOTO_HEIGHT,
    )
  })

  // --------------------------------------------------
  // 5. 하단 문구
  // --------------------------------------------------

  context.fillStyle = '#2e4057'

  context.font =
    '700 28px "Trebuchet MS", "Malgun Gothic", sans-serif'

  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.fillText(
    '우리 학교의 특별한 순간',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - 40,
  )

  // --------------------------------------------------
  // 6. JPEG 변환
  // --------------------------------------------------

  return canvas.toDataURL(
    'image/jpeg',
    0.92,
  )
}