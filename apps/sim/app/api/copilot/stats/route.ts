import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authenticateCopilotRequestSessionOnly,
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createRequestTracker,
  createUnauthorizedResponse,
} from '@/lib/copilot/auth'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'
import { SIM_AGENT_API_URL_DEFAULT } from '@/lib/sim-agent/constants'

const logger = createLogger('CopilotStatsAPI')
const SIM_AGENT_API_URL = env.SIM_AGENT_API_URL || SIM_AGENT_API_URL_DEFAULT

// Local stats handler
function handleLocalStats(messageId: string, diffCreated: boolean, diffAccepted: boolean): NextResponse {
  logger.info('Handling copilot stats locally', {
    messageId,
    diffCreated,
    diffAccepted,
  })
  
  // For local operation, we just acknowledge the stats
  // In a full implementation, this could store stats in local database
  return NextResponse.json({ 
    success: true, 
    message: 'Stats recorded locally',
    local: true 
  })
}

const BodySchema = z.object({
  messageId: z.string(),
  diffCreated: z.boolean(),
  diffAccepted: z.boolean(),
})

export async function POST(req: NextRequest) {
  const tracker = createRequestTracker()
  try {
    const { userId, isAuthenticated } = await authenticateCopilotRequestSessionOnly()
    if (!isAuthenticated || !userId) {
      return createUnauthorizedResponse()
    }

    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return createBadRequestResponse('Invalid request body for copilot stats')
    }

    const { messageId, diffCreated, diffAccepted } = parsed.data as any

    // LOCAL BYPASS: Handle stats locally if using local providers
    if (env.COPILOT_CHAT_PROVIDER && env.COPILOT_CHAT_PROVIDER !== 'sim-agent') {
      logger.info(`[${tracker.requestId}] Using local stats handler`, {
        provider: env.COPILOT_CHAT_PROVIDER,
        messageId,
      })
      return handleLocalStats(messageId, diffCreated, diffAccepted)
    }

    // Build outgoing payload for Sim Agent with only required fields
    const payload: Record<string, any> = {
      messageId,
      diffCreated,
      diffAccepted,
    }

    logger.info(`[${tracker.requestId}] Forwarding stats to Sim Agent`, {
      messageId,
      agentUrl: `${SIM_AGENT_API_URL}/api/stats`,
    })

    const agentRes = await fetch(`${SIM_AGENT_API_URL}/api/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.COPILOT_API_KEY ? { 'x-api-key': env.COPILOT_API_KEY } : {}),
      },
      body: JSON.stringify(payload),
    })

    // Prefer not to block clients; still relay status
    let agentJson: any = null
    try {
      agentJson = await agentRes.json()
    } catch {}

    if (!agentRes.ok) {
      const message = (agentJson && (agentJson.error || agentJson.message)) || 'Upstream error'
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return createInternalServerErrorResponse('Failed to forward copilot stats')
  }
}
