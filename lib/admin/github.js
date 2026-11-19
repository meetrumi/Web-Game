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
const API = process.env.GITHUB_API_URL || 'https://api.github.com'

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

/**
 * Read-modify-write with retry. GitHub rejects a write whose sha is stale (409/422),
 * which happens when two saves land close together; re-read and re-apply up to 3 times.
 * `change(posts)` returns { posts, message } or throws a user-facing Error.
 */
export async function mutatePosts(change) {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    const { sha, posts } = await readPosts()
    const { posts: next, message, result } = change(posts)
    try {
      await writePosts(next, sha, message)
      return result
    } catch (e) {
      lastErr = e
      if (!/GitHub (409|422)/.test(e.message)) throw e
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
    }
  }
  throw lastErr
}

/** Checks the publishing setup and returns a list of human-readable problems. */
export async function health() {
  const problems = []
  if (!process.env.GITHUB_TOKEN) problems.push('GITHUB_TOKEN is not set in Vercel, so publishing and deleting cannot work.')
  if (!process.env.GITHUB_REPO) problems.push('GITHUB_REPO is not set in Vercel.')
  if (problems.length) return problems
  try {
    const res = await gh(`/repos/${process.env.GITHUB_REPO}`)
    if (res.status === 404) problems.push('GitHub cannot find the repo ' + process.env.GITHUB_REPO + ' with this token — check the token has access to it.')
    else {
      const json = await res.json()
      if (json.permissions && !json.permissions.push) problems.push('The GitHub token can read but not write. Give it "Contents: Read and write".')
    }
  } catch (e) {
    problems.push(/401/.test(e.message) ? 'The GitHub token is invalid or expired. Create a new one and update GITHUB_TOKEN in Vercel.' : e.message)
  }
  return problems
}
