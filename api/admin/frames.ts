interface FrameRecord {
  id: string
  name: string
  enabled: boolean
  sortOrder: number
  [key: string]: unknown
}

interface AdminRequest {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

interface AdminResponse {
  status: (code: number) => AdminResponse
  json: (body: unknown) => void
}

const filePath = 'public/frames/frames.json'

const getConfig = () => {
  const repository = process.env.GITHUB_REPOSITORY
  const token = process.env.GITHUB_TOKEN
  if (!repository || !token) throw new Error('GitHub 저장 환경변수가 없습니다.')
  return { repository, token, branch: process.env.GITHUB_BRANCH ?? 'main' }
}

class GitHubError extends Error {
  status: number
  constructor(status: number) {
    super(`GitHub API 오류: ${status}`)
    this.status = status
  }
}

// 저장 실패 원인을 선생님이 알아볼 수 있는 말로 바꿔준다.
const explainError = (error: unknown) => {
  if (error instanceof GitHubError) {
    if (error.status === 401) return 'GitHub 토큰(GITHUB_TOKEN)이 만료되었거나 잘못되었어요. 새 토큰을 만들어 Vercel에 넣어주세요.'
    if (error.status === 403) return 'GitHub 토큰에 저장소 쓰기 권한(Contents: Read and write)이 없어요.'
    if (error.status === 404) return 'GITHUB_REPOSITORY 값이 틀렸거나, 토큰이 이 저장소에 접근할 수 없어요.'
    if (error.status === 409 || error.status === 422) return '다른 저장과 겹쳤어요. 새로고침한 뒤 다시 저장해주세요.'
    return `GitHub 저장 중 오류가 났어요. (코드 ${error.status})`
  }
  if (error instanceof Error && error.message.includes('환경변수')) {
    return 'Vercel에 GITHUB_TOKEN 또는 GITHUB_REPOSITORY 환경변수가 없어요.'
  }
  return '저장에 실패했습니다.'
}

const githubRequest = async (path: string, options: RequestInit, token: string) => {
  const response = await fetch(`https://api.github.com/repos/${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  })
  if (!response.ok) throw new GitHubError(response.status)
  return response
}

const readFrames = async (repository: string, token: string, branch: string) => {
  const response = await githubRequest(
    `${repository}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
    {},
    token,
  )
  const content = (await response.json()) as { content: string; sha: string }
  const json = Buffer.from(content.content.replace(/\n/g, ''), 'base64').toString('utf8')
  return { frames: JSON.parse(json) as FrameRecord[], sha: content.sha }
}

// ---------------------------------------------------------------
// 새 프레임 추가 (POST)
// 그림 파일과 frames.json 수정을 커밋 한 번으로 저장해서 배포도 한 번만 일어나게 한다.
// ---------------------------------------------------------------

interface NewFrameRequest {
  name?: unknown
  image?: unknown
  enabled?: unknown
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const MAX_NAME_LENGTH = 30

const parseNewFrame = (body: unknown) => {
  const { name, image, enabled } = (body ?? {}) as NewFrameRequest
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) return { error: '프레임 이름을 입력해주세요.' }
  if (trimmedName.length > MAX_NAME_LENGTH) return { error: `프레임 이름은 ${MAX_NAME_LENGTH}자 이하로 써주세요.` }
  const match = typeof image === 'string' ? image.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/) : null
  if (!match) return { error: '프레임 그림은 JPG 또는 PNG 파일이어야 해요.' }
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length === 0) return { error: '프레임 그림을 읽지 못했어요.' }
  if (bytes.length > MAX_IMAGE_BYTES) return { error: '프레임 그림이 너무 커요. (3MB 이하)' }
  return {
    name: trimmedName,
    extension: match[1] === 'png' ? 'png' : 'jpg',
    base64: match[2],
    enabled: enabled !== false,
  }
}

const gitJson = async <T,>(path: string, token: string, method = 'GET', body?: unknown) => {
  const response = await githubRequest(
    path,
    body === undefined
      ? { method }
      : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    token,
  )
  return (await response.json()) as T
}

const addFrame = async (body: unknown, response: AdminResponse) => {
  const parsed = parseNewFrame(body)
  if ('error' in parsed) {
    response.status(400).json({ error: parsed.error })
    return
  }

  const { repository, token, branch } = getConfig()

  // 1. 지금 브랜치의 최신 커밋과 frames.json
  const ref = await gitJson<{ object: { sha: string } }>(
    `${repository}/git/ref/heads/${encodeURIComponent(branch)}`,
    token,
  )
  const headSha = ref.object.sha
  const headCommit = await gitJson<{ tree: { sha: string } }>(`${repository}/git/commits/${headSha}`, token)
  const { frames } = await readFrames(repository, token, headSha)

  // 2. 새 프레임 정보 (id는 겹치지 않게 시간으로 만든다)
  let id = `frame-${Date.now().toString(36)}`
  while (frames.some((frame) => frame.id === id)) id = `${id}x`
  const imagePath = `/frames/${id}.${parsed.extension}`
  const maxOrder = frames.reduce((max, frame) => Math.max(max, Number(frame.sortOrder) || 0), 0)
  const newFrame: FrameRecord = {
    id,
    name: parsed.name,
    enabled: parsed.enabled,
    sortOrder: maxOrder + 1,
    image: imagePath,
    category: 'custom',
    title: '',
    subtitle: '',
    footerText: '',
  }
  const savedFrames = [...frames, newFrame].sort((a, b) => a.sortOrder - b.sortOrder)

  // 3. 그림 + frames.json을 한 커밋으로
  const blob = await gitJson<{ sha: string }>(`${repository}/git/blobs`, token, 'POST', {
    content: parsed.base64,
    encoding: 'base64',
  })
  const tree = await gitJson<{ sha: string }>(`${repository}/git/trees`, token, 'POST', {
    base_tree: headCommit.tree.sha,
    tree: [
      { path: `public${imagePath}`, mode: '100644', type: 'blob', sha: blob.sha },
      { path: filePath, mode: '100644', type: 'blob', content: `${JSON.stringify(savedFrames, null, 2)}\n` },
    ],
  })
  const commit = await gitJson<{ sha: string }>(`${repository}/git/commits`, token, 'POST', {
    message: `Add frame: ${parsed.name}`,
    tree: tree.sha,
    parents: [headSha],
  })
  await gitJson(`${repository}/git/refs/heads/${encodeURIComponent(branch)}`, token, 'PATCH', {
    sha: commit.sha,
  })

  response.status(200).json({ frame: newFrame, frames: savedFrames })
}

export default async function handler(request: AdminRequest, response: AdminResponse) {
  if (request.method !== 'PUT' && request.method !== 'POST') {
    response.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  // 관리자 비밀번호 확인 (Vercel 환경변수 ADMIN_PASSWORD)
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    response.status(500).json({ error: '관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았어요.' })
    return
  }
  const sentPassword = request.headers?.['x-admin-password']
  const password = Array.isArray(sentPassword) ? sentPassword[0] : sentPassword
  let decodedPassword = ''
  try {
    decodedPassword = password ? decodeURIComponent(password) : ''
  } catch {
    decodedPassword = ''
  }
  if (!decodedPassword || decodedPassword !== adminPassword) {
    response.status(401).json({ error: '비밀번호가 맞지 않아요.' })
    return
  }

  if (request.method === 'POST') {
    try {
      await addFrame(request.body, response)
    } catch (error) {
      console.error('[admin/frames] 프레임 추가 실패:', error)
      response.status(500).json({ error: explainError(error) })
    }
    return
  }

  try {
    const { repository, token, branch } = getConfig()
    const { frames, sha } = await readFrames(repository, token, branch)
    if (!Array.isArray(request.body)) {
      response.status(400).json({ error: '잘못된 프레임 데이터입니다.' })
      return
    }

    const updates = request.body as Array<Pick<FrameRecord, 'id' | 'name' | 'enabled' | 'sortOrder'>>
    const updateMap = new Map(updates.map((frame) => [frame.id, frame]))
    const savedFrames = frames.map((frame) => {
      const update = updateMap.get(frame.id)
      return update ? { ...frame, name: update.name, enabled: update.enabled, sortOrder: update.sortOrder } : frame
    }).sort((a, b) => a.sortOrder - b.sortOrder)

    const commitResponse = await githubRequest(
      `${repository}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Update frame settings',
          branch,
          sha,
          content: Buffer.from(`${JSON.stringify(savedFrames, null, 2)}\n`).toString('base64'),
        }),
      },
      token,
    )
    response.status(200).json(savedFrames)
    void commitResponse
  } catch (error) {
    console.error('[admin/frames] 저장 실패:', error)
    response.status(500).json({ error: explainError(error) })
  }
}