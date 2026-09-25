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
  if (!response.ok) throw new Error(`GitHub API 오류: ${response.status}`)
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

export default async function handler(request: AdminRequest, response: AdminResponse) {
  if (request.method !== 'PUT') {
    response.status(405).json({ error: 'Method Not Allowed' })
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
  } catch {
    response.status(500).json({ error: '저장에 실패했습니다.' })
  }
}