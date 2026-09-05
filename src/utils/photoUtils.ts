export type BackgroundOption = {
  id: string
  name: string
  image: string
  color: string
}

export const CANVAS_WIDTH = 1200
export const CANVAS_HEIGHT = 1776
const SAFE_MARGIN = 80
const PHOTO_WIDTH = CANVAS_WIDTH - SAFE_MARGIN * 2
const PHOTO_GAP = 18
const TOP_AREA = 270
const BOTTOM_AREA = 100
const AVAILABLE_PHOTO_HEIGHT =
  CANVAS_HEIGHT - TOP_AREA - BOTTOM_AREA - PHOTO_GAP * 2
const PHOTO_HEIGHT = Math.floor(AVAILABLE_PHOTO_HEIGHT / 3)
const PHOTO_X = (CANVAS_WIDTH - PHOTO_WIDTH) / 2
const PHOTO_START_Y = TOP_AREA

function loadImage(source: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = source
  })
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
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

function drawContainImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const drawnWidth = image.naturalWidth * scale
  const drawnHeight = image.naturalHeight * scale
  const drawnX = x + (width - drawnWidth) / 2
  const drawnY = y + (height - drawnHeight) / 2

  context.drawImage(image, drawnX, drawnY, drawnWidth, drawnHeight)
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

  const backgroundImage = await loadImage(background.image)
  if (backgroundImage) {
    drawCoverImage(context, backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    context.fillStyle = 'rgba(255, 255, 255, 0.22)'
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  } else {
    context.fillStyle = background.color
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    context.fillStyle = 'rgba(255, 255, 255, 0.36)'
    context.fillRect(70, 70, CANVAS_WIDTH - 140, CANVAS_HEIGHT - 140)
  }

  context.fillStyle = '#2e4057'
  context.font = '800 58px "Trebuchet MS", "Malgun Gothic", sans-serif'
  context.textAlign = 'center'
  context.fillText('우리의 4컷 사진', CANVAS_WIDTH / 2, 175)
  context.font = '700 30px "Trebuchet MS", "Malgun Gothic", sans-serif'
  context.fillText(background.name, CANVAS_WIDTH / 2, 235)

  const loadedPhotos = await Promise.all(images.slice(0, 3).map((image) => loadImage(image)))
  loadedPhotos.forEach((image, index) => {
    if (!image) return

    const y = PHOTO_START_Y + index * (PHOTO_HEIGHT + PHOTO_GAP)
    context.fillStyle = '#ffffff'
    context.fillRect(PHOTO_X - 14, y - 14, PHOTO_WIDTH + 28, PHOTO_HEIGHT + 28)
    drawContainImage(context, image, PHOTO_X, y, PHOTO_WIDTH, PHOTO_HEIGHT)
  })

  context.fillStyle = '#2e4057'
  context.font = '700 30px "Trebuchet MS", "Malgun Gothic", sans-serif'
  context.fillText('우리의 특별한 순간', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 55)

  return canvas.toDataURL('image/jpeg', 0.92)
}
