import * as github from '@actions/github'
import {Context, saveExecutionState} from './context'

export const githubPreviews = [
  'flash', // More deployment statuses
  'ant-man' // Allow environment_url paramater
]

export async function createDeployment(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  const options: Record<string, string> = {}
  if (context.version) {
    options.version = context.version
  }
  const deployment = await octokit.createDeployment({
    owner: context.repoOwner,
    repo: context.repoName,
    ref: context.ref,
    transient_environment: context.environment.isTransient,
    production_environment: context.environment.isProduction,
    required_contexts: context.requiredContexts,
    auto_merge: false,
    mediaType: {
      previews: githubPreviews
    },
    ...options
  })
  context.deploymentId = deployment.id
  saveExecutionState(context)
}

export async function setDeploymentInProgress(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  await octokit.createDeploymentStatus({
    owner: context.repoOwner,
    repo: context.repoName,
    deployment_id: context.deploymentId,
    state: 'in_progress',
    mediaType: {
      previews: githubPreviews
    }
  })
}

export async function setDeploymentEnded(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  const state = ['success', 'failure'].includes(context.jobStatus)
    ? context.jobStatus
    : 'error'
  const options: Record<string, string> = {}
  if (context.environment.url) {
    options.environment_url = context.environment.url
  }
  await octokit.createDeploymentStatus({
    owner: context.repoOwner,
    repo: context.repoName,
    deployment_id: context.deploymentId,
    state,
    mediaType: {
      previews: githubPreviews
    },
    ...options
  })
}
