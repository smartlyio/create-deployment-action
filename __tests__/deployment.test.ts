jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  saveState: jest.fn(),
  getState: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warning: jest.fn()
}))

import nock from 'nock'
import {
  Context,
  Environment,
  PRE_HAS_RUN,
  MAIN_HAS_RUN,
  DEPLOYMENT_ID
} from '../src/context'
import {
  createDeployment,
  setDeploymentInProgress,
  setDeploymentEnded
} from '../src/deployment'
import {mocked} from 'ts-jest/utils'
import {getInput, saveState, getState, info} from '@actions/core'
import {getOctokit} from '@actions/github'

const GITHUB_API = 'https://api.github.com'
const OLD_ENV = process.env
beforeEach(() => {
  process.env = {...OLD_ENV}
})

afterEach(() => {
  process.env = OLD_ENV
})

nock.disableNetConnect()

describe('pre-build stage', () => {
  const context: Context = {
    executionStage: 'pre',
    token: 'abc123',
    ref: 'master',
    version: 'v1.2.3',
    requiredContexts: [],
    jobStatus: 'success',
    logUrl: 'https://example.com/logs',
    repo: {
      owner: 'smartlyio',
      name: 'ci-sla'
    },
    environment: {
      name: 'production',
      url: 'https://example.com',
      isProduction: true,
      isTransient: false
    }
  }
  test('create deployment and set log URL', async () => {
    const deploymentId = 27
    const deploymentsScope = nock(GITHUB_API)
      .post(
        `/repos/${context.repo.owner}/${context.repo.name}/deployments`,
        body => {
          return (
            body.ref === context.ref &&
            body.environment === context.environment.name &&
            body.transient_environment === context.environment.isTransient &&
            body.production_environment === context.environment.isProduction &&
            body.auto_merge === false &&
            body.payload.version === context.version
          )
        }
      )
      .reply(200, {id: deploymentId})
    const statusScope = nock(GITHUB_API)
      .post(
        `/repos/${context.repo.owner}/${context.repo.name}/deployments/${deploymentId}/statuses`,
        body => {
          return body.state === 'pending' && body.log_url === context.logUrl
        }
      )
      .reply(200)
    const mockSaveState = mocked(saveState)
    await createDeployment(context)

    expect(mockSaveState).toHaveBeenCalledTimes(2)
    expect(mockSaveState).toHaveBeenCalledWith(PRE_HAS_RUN, 'true')
    expect(mockSaveState).toHaveBeenCalledWith(
      DEPLOYMENT_ID,
      JSON.stringify(deploymentId)
    )
    deploymentsScope.done()
    statusScope.done()
  })
})

describe('main build stage', () => {
  const context: Context = {
    executionStage: 'main',
    deploymentId: 78,
    token: 'abc123',
    ref: 'master',
    version: 'v1.2.3',
    requiredContexts: [],
    jobStatus: 'success',
    logUrl: '',
    repo: {
      owner: 'smartlyio',
      name: 'ci-sla'
    },
    environment: {
      name: 'production',
      url: 'https://example.com',
      isProduction: true,
      isTransient: false
    }
  }
  test('set status in progress deployment', async () => {
    const deploymentId = 27
    const scope = nock(GITHUB_API)
      .post(
        `/repos/${context.repo.owner}/${context.repo.name}/deployments/${context.deploymentId}/statuses`,
        body => {
          return body.state === 'in_progress'
        }
      )
      .reply(200)
    const mockSaveState = mocked(saveState)
    await setDeploymentInProgress(context)

    expect(mockSaveState).toHaveBeenCalledTimes(0)
    scope.done()
  })
})

describe('post build stage', () => {
  const context: Context = {
    executionStage: 'main',
    deploymentId: 78,
    token: 'abc123',
    ref: 'master',
    version: 'v1.2.3',
    requiredContexts: [],
    jobStatus: 'success',
    logUrl: '',
    repo: {
      owner: 'smartlyio',
      name: 'ci-sla'
    },
    environment: {
      name: 'production',
      isProduction: true,
      isTransient: false
    }
  }

  test('set environment url and status success', async () => {
    const deploymentId = 27
    context.environment.url = 'https://example.com'
    const scope = nock(GITHUB_API)
      .post(
        `/repos/${context.repo.owner}/${context.repo.name}/deployments/${context.deploymentId}/statuses`,
        body => {
          return (
            body.state === 'success' &&
            body.environment_url === context.environment.url
          )
        }
      )
      .reply(200)
    const mockSaveState = mocked(saveState)
    await setDeploymentEnded(context)

    expect(mockSaveState).toHaveBeenCalledTimes(0)
    scope.done()
  })

  test('set status failure', async () => {
    const deploymentId = 27
    context.jobStatus = 'failure'
    const scope = nock(GITHUB_API)
      .post(
        `/repos/${context.repo.owner}/${context.repo.name}/deployments/${context.deploymentId}/statuses`,
        body => {
          return (
            body.state === 'failure' &&
            body.environment_url === context.environment.url
          )
        }
      )
      .reply(200)
    const mockSaveState = mocked(saveState)
    await setDeploymentEnded(context)

    expect(mockSaveState).toHaveBeenCalledTimes(0)
    scope.done()
  })

  test('set status failure', async () => {
    const deploymentId = 27
    context.jobStatus = 'cancelled'
    const scope = nock(GITHUB_API)
      .post(
        `/repos/${context.repo.owner}/${context.repo.name}/deployments/${context.deploymentId}/statuses`,
        body => {
          return (
            body.state === 'error' &&
            body.environment_url === context.environment.url
          )
        }
      )
      .reply(200)
    const mockSaveState = mocked(saveState)
    await setDeploymentEnded(context)

    expect(mockSaveState).toHaveBeenCalledTimes(0)
    scope.done()
  })
})
