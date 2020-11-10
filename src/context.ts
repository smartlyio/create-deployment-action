import * as core from '@actions/core'

export const PRE_HAS_RUN = 'preHasRun'
export const MAIN_HAS_RUN = 'mainHasRun'
export const DEPLOYMENT_ID = 'deploymentId'

export function createLogUrl(
  githubRepository: string,
  githubRunId: string
): string {
  return `https://github.com/${githubRepository}/actions/runs/${githubRunId}`
}

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

export interface Repository {
  owner: string
  name: string
}

export interface Environment {
  name: string
  isProduction: boolean
  isTransient: boolean
  url?: string
}

export declare type JobStatus =
  | 'error'
  | 'failure'
  | 'inactive'
  | 'in_progress'
  | 'queued'
  | 'pending'
  | 'success'

export interface Context {
  executionStage: string
  token: string
  jobStatus: string
  logUrl: string
  environment: Environment
  repo: Repository
  ref: string
  version?: string
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
  const stage = executionStage()

  const githubRepository: string | undefined = process.env['GITHUB_REPOSITORY']
  const githubRunId: string | undefined = process.env['GITHUB_RUN_ID']
  if (!githubRepository) {
    throw new Error('Unexpectedly missing Github context GITHUB_REPOSITORY!')
  }
  if (!githubRunId) {
    throw new Error('Unexpectedly missing Github context GITHUB_RUN_ID!')
  }

  const ref: string | undefined =
    core.getInput('ref') || process.env['GITHUB_REF']
  if (!ref) {
    throw new Error(
      "No 'ref' input provided and GITHUB_REF not available in the environment!"
    )
  }

  const [repoOwner, repoName] = githubRepository.split('/')
  const repo: Repository = {
    owner: repoOwner,
    name: repoName
  }

  const logUrl = createLogUrl(githubRepository, githubRunId)

  const version: string = core.getInput('version')
  const deploymentId = core.getState('deploymentId')
  const requiredContexts = core.getInput('required_contexts') || ''

  const environmentName: string = core.getInput('environment_name')
  const isProduction: boolean =
    toBoolean(core.getInput('is_production')) ||
    environmentName === 'production' ||
    !!environmentName.match(/^kube-prod\d+$/)
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
    token: core.getInput('token', {required: true}),
    jobStatus: core.getInput('job_status', {required: true}),
    requiredContexts: parseArray(requiredContexts),
    repo,
    ref,
    logUrl,
    environment
  }
  if (version) {
    context.version = version
  }
  if (deploymentId) {
    context.deploymentId = parseInt(deploymentId)
  }

  return context
}
