/**
 * Publishing backend: the admin dashboard saves posts by committing to this GitHub repo.
 * Vercel sees the commit and redeploys (~1 minute), so published posts are fully static
 * and SEO-friendly — no database needed.
 *
 * Env vars:
 *   GITHUB_TOKEN   fine-grained token with "Contents: Read and write" on this repo only
 *   GITHUB_REPO    e.g. meetrumi/Web-Game
 *   GITHUB_BRANCH  default "main"
 */
const API = 'https://api.github.com'

function config() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPO must be set to publish from the dashboard')
  return { token, repo, branch: process.env.GITHUB_BRANCH || 'main' }
}

async function gh(path, init = {}) {
  const { token } = config()
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  return res
}

export async function readFile(filePath) {
  const { repo, branch } = config()
  const res = await gh(`/repos/${repo}/contents/${filePath}?ref=${branch}`)
  if (res.status === 404) return null
  const json = await res.json()
  return { sha: json.sha, content: Buffer.from(json.content, 'base64') }
}

export async function writeFile(filePath, buffer, message, sha) {
  const { repo, branch } = config()
  await gh(`/repos/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, branch, sha, content: Buffer.from(buffer).toString('base64') }),
  })
}

export async function readPosts() {
  const file = await readFile('data/posts.json')
  return { sha: file?.sha, posts: file ? JSON.parse(file.content.toString('utf8')) : [] }
}

export async function writePosts(posts, sha, message) {
  await writeFile('data/posts.json', JSON.stringify(posts, null, 2) + '\n', message, sha)
}
