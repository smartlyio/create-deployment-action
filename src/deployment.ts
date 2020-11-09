import * as github from '@actions/github'
import {
  OctokitResponse,
  ReposCreateDeploymentResponseData
} from '@octokit/types'
import {Context, saveExecutionState, JobStatus} from './context'

export const githubPreviews = [
  'flash', // More deployment statuses
  'ant-man' // Allow environment_url paramater
]

export async function createDeployment(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  const options: Record<string, Record<string, string>> = {}
  if (context.version) {
    options.payload = {
      version: context.version
    }
  }
  const deployment = (await octokit.repos.createDeployment({
    owner: context.repo.owner,
    repo: context.repo.name,
    ref: context.ref,
    environment: context.environment.name,
    transient_environment: context.environment.isTransient,
    production_environment: context.environment.isProduction,
    required_contexts: context.requiredContexts,
    auto_merge: false,
    mediaType: {
      previews: githubPreviews
    },
    ...options
  })) as OctokitResponse<ReposCreateDeploymentResponseData>
  context.deploymentId = deployment.data.id
  saveExecutionState(context)
}

export async function setDeploymentInProgress(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  if (!context.deploymentId) {
    throw new Error(
      'Deployment ID not available to set deployment status. This is a bug in the action!'
    )
  }
  await octokit.repos.createDeploymentStatus({
    owner: context.repo.owner,
    repo: context.repo.name,
    deployment_id: context.deploymentId,
    state: 'in_progress',
    mediaType: {
      previews: githubPreviews
    }
  })
}

export async function setDeploymentEnded(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  if (!context.deploymentId) {
    throw new Error(
      'Deployment ID not available to set deployment status. This is a bug in the action!'
    )
  }
  const state: JobStatus = ['success', 'failure'].includes(context.jobStatus)
    ? (context.jobStatus as JobStatus)
    : ('error' as JobStatus)
  const options: Record<string, string> = {}
  if (context.environment.url) {
    options.environment_url = context.environment.url
  }
  await octokit.repos.createDeploymentStatus({
    owner: context.repo.owner,
    repo: context.repo.name,
    deployment_id: context.deploymentId,
    state,
    mediaType: {
      previews: githubPreviews
    },
    ...options
  })
}
