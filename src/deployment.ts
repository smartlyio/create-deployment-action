import * as github from '@actions/github'
import {Context} from './context'

const inProgressMediatype = 'application/vnd.github.flash-preview+json'
const mediatype = 'application/vnd.github.ant-man-preview+json'

export async function createDeployment(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  await octokit.createDeployment({
    owner: context.repoOwner,
    repo: context.repoName,
    ref: context.ref,
    transient_environment: context.environment.isTransient,
    production_environment: context.environment.isProduction,
    required_contexts: context.requiredContexts,
    auto_merge: false,
    payload: {
      version: context.version
    },
    mediaType: {
      format: mediatype
    }
  })
}

export async function setDeploymentInProgress(context: Context): Promise<void> {
  const octokit = github.getOctokit(context.token)
  await octokit.createDeployment({
    owner: context.repoOwner,
    repo: context.repoName,
    deployment_id: context.deploymentId,
    state: 'in_progress',
    mediaType: {
      format: inProgressMediatype
    }
  })
}

export async function setDeploymentEnded(
  context: Context,
  success: boolean
): Promise<void> {
  const octokit = github.getOctokit(context.token)
  const state = success ? 'success' : 'failure'
  const options: Record<string, string> = {}
  if (context.environment.url) {
    options.environment_url = context.environment.url
  }
  await octokit.createDeployment({
    owner: context.repoOwner,
    repo: context.repoName,
    deployment_id: context.deploymentId,
    state,
    mediaType: {
      format: mediatype
    },
    ...options
  })
}
