import * as core from '@actions/core'

interface Environment {
  name: string
  isProduction: boolean
  isTransient: boolean
  url?: string
}

export interface Context {
  token: string
  environment: Environment
  repoOwner: string
  repoName: string
  ref: string
  version: string
  requiredContexts: string[]
  deploymentId?: number
}

export function toBoolean(value: string): boolean {
  const regexp = new RegExp(/^(true|1|on|yes)$/i)
  return regexp.test(value.trim())
}

export function parseArray(value: string): string[] {
  if (!value.trim()) {
    return []
  }
  return value.trim().split(/\s+/)
}

export async function getContext(): Promise<Context> {
  const environmentName: string = core.getInput('environment_name')
  const isProduction: boolean = environment === 'production'
  const environmentUrl: string = core.getInput('environment_url')
  const environment: Environment = {
    name: environmentName,
    url: environmentUrl,
    isProduction,
    isTransient: !isProduction
  }

  const ref: string = core.getInput('ref')
  const version: string = core.getInput('version')

  const deploymentId = core.getState('deploymentId')

  const context: Context = {
    token: core.getInput('github_token'),
    requiredContexts: parseArray(core.getInput('required_contexts')),
    ref,
    version,
    environment
  }
  if (deploymentId) {
    context.deploymentId = parseInt(deploymentId)
  }
  return context
}
