import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'
import { SIM_AGENT_API_URL_DEFAULT } from '@/lib/sim-agent/constants'

const logger = createLogger('CopilotAPIKeysAPI')

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // LOCAL BYPASS: Return local provider keys if using local providers
    if (env.COPILOT_CHAT_PROVIDER && env.COPILOT_CHAT_PROVIDER !== 'sim-agent') {
      logger.info('Returning local provider configuration', {
        provider: env.COPILOT_CHAT_PROVIDER,
        userId,
      })
      
      return NextResponse.json({
        keys: [{
          id: 'local-provider-key',
          displayKey: `***...local (${env.COPILOT_CHAT_PROVIDER})`,
        }]
      })
    }

    const SIM_AGENT_API_URL = env.SIM_AGENT_API_URL || SIM_AGENT_API_URL_DEFAULT

    logger.info('Fetching API keys from Sim Agent', {
      userId,
      agentUrl: `${SIM_AGENT_API_URL}/api/validate-key/get-api-keys`,
    })

    const res = await fetch(`${SIM_AGENT_API_URL}/api/validate-key/get-api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.COPILOT_API_KEY ? { 'x-api-key': env.COPILOT_API_KEY } : {}),
      },
      body: JSON.stringify({ userId }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to get keys' }, { status: res.status || 500 })
    }

    const apiKeys = (await res.json().catch(() => null)) as { id: string; apiKey: string }[] | null

    if (!Array.isArray(apiKeys)) {
      return NextResponse.json({ error: 'Invalid response from Sim Agent' }, { status: 500 })
    }

    const keys = apiKeys.map((k) => {
      const value = typeof k.apiKey === 'string' ? k.apiKey : ''
      const last6 = value.slice(-6)
      const displayKey = `•••••${last6}`
      return { id: k.id, displayKey }
    })

    return NextResponse.json({ keys }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get keys' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // LOCAL BYPASS: Handle local provider key deletion
    if (env.COPILOT_CHAT_PROVIDER && env.COPILOT_CHAT_PROVIDER !== 'sim-agent') {
      logger.info('Handling local provider key deletion', {
        provider: env.COPILOT_CHAT_PROVIDER,
        keyId: id,
        userId,
      })
      
      return NextResponse.json({
        success: true,
        message: 'Local provider keys are managed through environment variables'
      })
    }

    const SIM_AGENT_API_URL = env.SIM_AGENT_API_URL || SIM_AGENT_API_URL_DEFAULT

    logger.info('Deleting API key via Sim Agent', {
      keyId: id,
      userId,
      agentUrl: `${SIM_AGENT_API_URL}/api/validate-key/delete`,
    })

    const res = await fetch(`${SIM_AGENT_API_URL}/api/validate-key/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.COPILOT_API_KEY ? { 'x-api-key': env.COPILOT_API_KEY } : {}),
      },
      body: JSON.stringify({ userId, apiKeyId: id }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to delete key' }, { status: res.status || 500 })
    }

    const data = (await res.json().catch(() => null)) as { success?: boolean } | null
    if (!data?.success) {
      return NextResponse.json({ error: 'Invalid response from Sim Agent' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 })
  }
}
