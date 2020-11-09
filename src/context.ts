import * as core from '@actions/core'

export const PRE_HAS_RUN = 'preHasRun'
export const MAIN_HAS_RUN = 'mainHasRun'
export const DEPLOYMENT_ID = 'deploymentId'

export function executionStage(): string {
  const isMain = !!process.env[`STATE_${PRE_HAS_RUN}`]
  const isPost = !!process.env[`STATE_${MAIN_HAS_RUN}`]
  if (!isMain && !isPost) {
    return 'pre'
  } else if (isMain && !isPost) {
    return 'main'
  } else if (isPost) {
    return 'post'
  }
  throw new Error('It should not be possible to reach this')
}

export function saveExecutionState(context: Context): void {
  if (['pre', 'main', 'post'].includes(context.executionStage)) {
    core.saveState(PRE_HAS_RUN, 'true')
  }
  if (['main', 'post'].includes(context.executionStage)) {
    core.saveState(MAIN_HAS_RUN, 'true')
  }
  if (context.deploymentId) {
    core.saveState(DEPLOYMENT_ID, JSON.stringify(context.deploymentId))
  }
}

export interface Environment {
  name: string
  isProduction: boolean
  isTransient: boolean
  url?: string
}

export interface Context {
  executionStage: string
  token: string
  jobStatus: string
  environment: Environment
  repoOwner: string
  repoName: string
  ref: string
  version?: string
  requiredContexts: string[] | null
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
  const stage = executionStage()

  const githubRepository: string | undefined = process.env['GITHUB_REPOSITORY']
  if (!githubRepository) {
    throw new Error('Unexpectedly missing Github context GITHUB_REPOSITORY!')
  }
  const [repoOwner, repoName] = githubRepository.split('/')

  const ref: string | undefined =
    core.getInput('ref') || process.env['GITHUB_REF']
  if (!ref) {
    throw new Error(
      "No 'ref' input provided and GITHUB_REF not available in the environment!"
    )
  }

  const version: string = core.getInput('version')
  const deploymentId = core.getState('deploymentId')
  const requiredContexts = core.getInput('required_contexts') || ''

  const environmentName: string = core.getInput('environment_name')
  const isProduction: boolean = environmentName === 'production'
  const environmentUrl: string = core.getInput('environment_url')
  const environment: Environment = {
    name: environmentName,
    isProduction,
    isTransient: !isProduction
  }
  if (environmentUrl) {
    environment.url = environmentUrl
  }

  const context: Context = {
    executionStage: stage,
    token: core.getInput('github_token', {required: true}),
    jobStatus: core.getInput('job_status', {required: true}),
    requiredContexts: parseArray(requiredContexts),
    repoOwner,
    repoName,
    ref,
    environment
  }
  if (version) {
    context.version = version
  }
  if (deploymentId) {
    context.deploymentId = parseInt(deploymentId)
  }

  saveExecutionState(context)
  return context
}
