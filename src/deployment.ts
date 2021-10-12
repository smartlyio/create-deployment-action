import * as core from '@actions/core'
import * as github from '@actions/github'
import {Context, JobStatus, saveExecutionState} from './context'
import {Endpoints} from '@octokit/types'

type ReposCreateDeploymentResponse =
  Endpoints['POST /repos/{owner}/{repo}/deployments']['response']

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
  const owner = context.repo.owner
  const repo = context.repo.name
  const ref = context.ref
  core.info(
    `Creating new deployment for ${owner}/${repo} with ref ${ref} and version ${context.version}`
  )
  const deployment: ReposCreateDeploymentResponse =
    await octokit.rest.repos.createDeployment({
      owner,
      repo,
      ref,
      environment: context.environment.name,
      transient_environment: context.environment.isTransient,
      production_environment: context.environment.isProduction,
      required_contexts: context.requiredContexts,
      auto_merge: false,
      mediaType: {
        previews: githubPreviews
      },
      ...options
    })

  if (deployment.status === 201) {
    context.deploymentId = deployment.data.id
    saveExecutionState(context)
    await setDeploymentLogUrl(context)
  } else {
    throw new Error(`Unable to create deployment (unknown error occurred)`)
  }
}

export async function setDeploymentLogUrl(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  if (!context.deploymentId) {
    throw new Error(
      'Deployment ID not available to set deployment status. This is a bug in the action!'
    )
  }
  core.info(`Setting deployment log url to ${context.logUrl}`)
  await octokit.rest.repos.createDeploymentStatus({
    owner: context.repo.owner,
    repo: context.repo.name,
    deployment_id: context.deploymentId,
    state: 'pending',
    log_url: context.logUrl,
    mediaType: {
      previews: githubPreviews
    }
  })
}

export async function setDeploymentInProgress(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  if (!context.deploymentId) {
    throw new Error(
      'Deployment ID not available to set deployment status. This is a bug in the action!'
    )
  }
  core.info('Setting deployment status to in_progress')
  await octokit.rest.repos.createDeploymentStatus({
    owner: context.repo.owner,
    repo: context.repo.name,
    deployment_id: context.deploymentId,
    state: 'in_progress',
    log_url: context.logUrl,
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
  const validJobStatus = ['success', 'failure', 'inactive'].includes(
    context.jobStatus
  )
  const state: JobStatus = validJobStatus
    ? (context.jobStatus as JobStatus)
    : ('error' as JobStatus)
  const options: Record<string, string> = {}
  if (context.environment.url) {
    options.environment_url = context.environment.url
  }

  core.info(`Setting deployment status to ${state}`)
  await octokit.rest.repos.createDeploymentStatus({
    owner: context.repo.owner,
    repo: context.repo.name,
    deployment_id: context.deploymentId,
    state,
    log_url: context.logUrl,
    mediaType: {
      previews: githubPreviews
    },
    ...options
  })
}
