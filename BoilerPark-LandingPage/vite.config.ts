import path from 'node:path'

import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

type EnvSource = Record<string, string>

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

function pickEnvValue(sources: EnvSource[], keys: string[]): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]?.trim()
      if (value) {
        return value
      }
    }
  }

  return undefined
}

function isLocalHttpUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) {
    return false
  }

  try {
    const parsed = new URL(rawUrl)
    return LOCAL_HOSTS.has(parsed.hostname)
  } catch {
    return false
  }
}

function resolveApiBaseUrl(mode: string): { apiBaseUrl: string; source: string } {
  const localEnv = loadEnv(mode, __dirname, '')
  const mobileEnv = loadEnv(mode, path.resolve(__dirname, '../Frontend/mobile'), '')
  const workspaceEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const sources = [localEnv, mobileEnv, workspaceEnv]

  const devBaseUrl = pickEnvValue(sources, ['VITE_API_BASE_URL_DEV', 'API_BASE_URL_DEV'])
  const prodBaseUrl = pickEnvValue(sources, ['VITE_API_BASE_URL_PROD', 'API_BASE_URL_PROD'])

  if (mode === 'production') {
    if (prodBaseUrl) {
      return { apiBaseUrl: prodBaseUrl, source: 'API_BASE_URL_PROD' }
    }

    if (devBaseUrl) {
      return { apiBaseUrl: devBaseUrl, source: 'API_BASE_URL_DEV (production fallback)' }
    }
  } else {
    if (devBaseUrl && !isLocalHttpUrl(devBaseUrl)) {
      return { apiBaseUrl: devBaseUrl, source: 'API_BASE_URL_DEV' }
    }

    if (prodBaseUrl) {
      return {
        apiBaseUrl: prodBaseUrl,
        source: devBaseUrl ? 'API_BASE_URL_PROD (DEV localhost fallback)' : 'API_BASE_URL_PROD',
      }
    }

    if (devBaseUrl) {
      return { apiBaseUrl: devBaseUrl, source: 'API_BASE_URL_DEV' }
    }
  }

  throw new Error(
    'Missing API_BASE_URL_DEV / API_BASE_URL_PROD for BoilerPark-LandingPage. Add them to an env file.'
  )
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { apiBaseUrl, source } = resolveApiBaseUrl(mode)
  const apiOrigin = new URL(apiBaseUrl).origin
  const wsOrigin = apiOrigin.replace(/^http/i, 'ws')

  console.info(`[vite] BoilerPark API proxy target (${source}): ${apiOrigin}`)

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __BP_API_ORIGIN__: JSON.stringify(apiOrigin),
    },
    server: {
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: wsOrigin,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
