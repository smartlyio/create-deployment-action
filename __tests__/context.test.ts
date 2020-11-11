import {
  Context,
  Environment,
  getContext,
  getVersion,
  getRef,
  saveExecutionState,
  executionStage,
  createLogUrl,
  PRE_HAS_RUN,
  MAIN_HAS_RUN,
  DEPLOYMENT_ID
} from '../src/context'
import {mocked} from 'ts-jest/utils'
import {getInput, saveState, getState, info} from '@actions/core'
import * as path from 'path'
import {promises as fs} from 'fs'

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  saveState: jest.fn(),
  getState: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warning: jest.fn()
}))

const OLD_ENV = process.env
beforeEach(() => {
  process.env = {...OLD_ENV}
})

afterEach(() => {
  process.env = OLD_ENV
})

describe('executionStage', () => {
  test('return pre if no stages have completed yet', () => {
    delete process.env[`STATE_${PRE_HAS_RUN}`]
    delete process.env[`STATE_${MAIN_HAS_RUN}`]
    expect(executionStage()).toEqual('pre')
  })

  test('return main if only the pre stage has completed', () => {
    process.env[`STATE_${PRE_HAS_RUN}`] = 'true'
    delete process.env[`STATE_${MAIN_HAS_RUN}`]
    expect(executionStage()).toEqual('main')
  })

  test('return post if the main stage has completed', () => {
    process.env[`STATE_${PRE_HAS_RUN}`] = 'true'
    process.env[`STATE_${MAIN_HAS_RUN}`] = 'true'
    expect(executionStage()).toEqual('post')
  })

  test('return post if only the main stage has completed', () => {
    delete process.env[`STATE_${PRE_HAS_RUN}`]
    process.env[`STATE_${MAIN_HAS_RUN}`] = 'true'
    expect(executionStage()).toEqual('post')
  })
})

describe('saveExecutionState', () => {
  const context: Context = {
    executionStage: 'pre',
    token: '',
    ref: '',
    version: '',
    requiredContexts: [],
    jobStatus: 'success',
    logUrl: '',
    repo: {
      owner: '',
      name: ''
    },
    environment: {
      name: '',
      url: '',
      isProduction: false,
      isTransient: true
    }
  }
  it('should save the execution stage in pre execution', async () => {
    const mockSaveState = mocked(saveState)
    saveExecutionState(context)
    expect(mockSaveState).toHaveBeenCalledTimes(1)
    expect(mockSaveState).toHaveBeenCalledWith(PRE_HAS_RUN, 'true')
  })

  it('should save the execution stage in main execution', async () => {
    const mockSaveState = mocked(saveState)
    context.executionStage = 'main'
    saveExecutionState(context)
    expect(mockSaveState).toHaveBeenCalledTimes(2)
    expect(mockSaveState).toHaveBeenCalledWith(PRE_HAS_RUN, 'true')
    expect(mockSaveState).toHaveBeenCalledWith(MAIN_HAS_RUN, 'true')
  })

  it('should save the execution stage in post execution', async () => {
    const mockSaveState = mocked(saveState)
    context.executionStage = 'post'
    saveExecutionState(context)
    expect(mockSaveState).toHaveBeenCalledTimes(2)
    expect(mockSaveState).toHaveBeenCalledWith(PRE_HAS_RUN, 'true')
    expect(mockSaveState).toHaveBeenCalledWith(MAIN_HAS_RUN, 'true')
  })

  it('should save deployment ID', async () => {
    const mockSaveState = mocked(saveState)
    context.executionStage = 'post'
    context.deploymentId = 7
    saveExecutionState(context)
    expect(mockSaveState).toHaveBeenCalledTimes(3)
    expect(mockSaveState).toHaveBeenCalledWith(PRE_HAS_RUN, 'true')
    expect(mockSaveState).toHaveBeenCalledWith(MAIN_HAS_RUN, 'true')
    expect(mockSaveState).toHaveBeenCalledWith(DEPLOYMENT_ID, '7')
  })
})

describe('getRef', () => {
  test('throws an error with no input and no environment', () => {
    delete process.env['GITHUB_REF']
    delete process.env['GITHUB_HEAD_REF']
    expect(getRef).toThrow(/^No 'ref'.*/)
  })

  test('Gets a ref from input as top priority', () => {
    const expectedRef = 'inputRef'
    mocked(getInput).mockImplementationOnce(() => {
      return expectedRef
    })
    process.env['GITHUB_EVENT'] = 'pull_request'
    process.env['GITHUB_HEAD_REF'] = 'headRef'
    process.env['GITHUB_REF'] = 'ref'
    expect(getRef()).toEqual(expectedRef)
  })

  test('Gets a ref from HEAD_REF as second priority if PR', () => {
    const expectedRef = 'headRef'
    mocked(getInput).mockImplementationOnce(() => {
      return ''
    })
    process.env['GITHUB_EVENT'] = 'pull_request'
    process.env['GITHUB_HEAD_REF'] = expectedRef
    process.env['GITHUB_REF'] = 'ref'
    expect(getRef()).toEqual(expectedRef)
  })

  test('Gets a ref from REF as third priority if PR', () => {
    const expectedRef = 'ref'
    mocked(getInput).mockImplementationOnce(() => {
      return ''
    })
    process.env['GITHUB_EVENT'] = 'push'
    delete process.env['GITHUB_HEAD_REF']
    process.env['GITHUB_REF'] = expectedRef
    expect(getRef()).toEqual(expectedRef)
  })

  test('Gets a ref from REF as second priority if not PR', () => {
    const expectedRef = 'ref'
    mocked(getInput).mockImplementationOnce(() => {
      return ''
    })
    process.env['GITHUB_EVENT'] = 'push'
    process.env['GITHUB_HEAD_REF'] = 'head'
    process.env['GITHUB_REF'] = expectedRef
    expect(getRef()).toEqual(expectedRef)
  })
})

describe('getVersion', () => {
  test('throws an error with no input and no environment', async () => {
    delete process.env['GITHUB_SHA']
    delete process.env['GITHUB_EVENT']
    await expect(getVersion()).rejects.toThrow(/^No 'version'.*/)
  })

  test('Returns input version as first priority', async () => {
    const expectedVersion = 'version'
    mocked(getInput).mockImplementationOnce(() => {
      return expectedVersion
    })
    delete process.env['GITHUB_SHA']
    delete process.env['GITHUB_EVENT']
    expect(await getVersion()).toEqual(expectedVersion)
  })

  test('Returns PR head sha from event file as second priority in PR', async () => {
    const eventPath = path.join(__dirname, 'pr_event.json')
    const eventData = await fs.readFile(eventPath)
    const event = JSON.parse(eventData.toString())
    const expectedVersion = event.pull_request.head.sha
    mocked(getInput).mockImplementationOnce(() => {
      return ''
    })
    delete process.env['GITHUB_SHA']
    process.env['GITHUB_EVENT'] = 'pull_request'
    process.env['GITHUB_EVENT_PATH'] = eventPath
    expect(await getVersion()).toEqual(expectedVersion)
  })

  test('Returns sha as second priority not in PR', async () => {
    const expectedVersion = 'headSha'
    mocked(getInput).mockImplementationOnce(() => {
      return ''
    })
    process.env['GITHUB_SHA'] = expectedVersion
    process.env['GITHUB_EVENT'] = 'push'
    expect(await getVersion()).toEqual(expectedVersion)
  })
})

describe('context', () => {
  delete process.env[`STATE_${PRE_HAS_RUN}`]
  delete process.env[`STATE_${MAIN_HAS_RUN}`]
  delete process.env[`STATE_${DEPLOYMENT_ID}`]

  const repository = 'smartlyio/ci-sla'
  const runId = '1234'
  process.env['GITHUB_REPOSITORY'] = repository
  process.env['GITHUB_REF'] = 'refs/heads/master'
  process.env['GITHUB_RUN_ID'] = runId

  test('no repository input', async () => {
    delete process.env[`GITHUB_REPOSITORY`]
    await expect(getContext()).rejects.toThrow(
      /Unexpectedly missing.*GITHUB_REPOSITORY/
    )
  })

  test('no runId input', async () => {
    delete process.env['GITHUB_RUN_ID']
    await expect(getContext()).rejects.toThrow(
      /Unexpectedly missing.*GITHUB_RUN_ID/
    )
  })

  test('no ref inputs', async () => {
    delete process.env[`GITHUB_REF`]
    await expect(getContext()).rejects.toThrow(/No 'ref' input provided/)
  })

  test('basic context construction with all inputs', async () => {
    const mockGetInput = mocked(getInput)
    const ref = 'refs/heads/master'
    const version = 'v0.12.4'
    const environment = 'production'
    const environmentUrl = 'envurl'
    const token = 'token'
    const jobStatus = 'success'
    mockGetInput.mockImplementation((name: string): string => {
      switch (name) {
        case 'ref':
          return ref
        case 'version':
          return version
        case 'required_contexts':
          return ''
        case 'environment_name':
          return environment
        case 'environment_url':
          return environmentUrl
        case 'token':
          return token
        case 'job_status':
          return jobStatus
        default:
          return ''
      }
    })

    const context = await getContext()
    expect(context).toEqual(
      expect.objectContaining({
        executionStage: 'pre',
        token,
        environment: expect.objectContaining({
          name: environment,
          url: environmentUrl,
          isProduction: true,
          isTransient: false
        }),
        requiredContexts: [],
        ref,
        version,
        jobStatus,
        logUrl: createLogUrl(repository, runId)
      })
    )
  })

  test('kube-prodN is production', async () => {
    const mockGetInput = mocked(getInput)
    const environment = 'kube-prod5'
    mockGetInput.mockImplementation((name: string): string => {
      switch (name) {
        case 'environment_name':
          return environment
        case 'version':
          return '1.2.3'
        default:
          return ''
      }
    })

    const context = await getContext()
    expect(context).toEqual(
      expect.objectContaining({
        environment: expect.objectContaining({
          name: environment,
          isProduction: true,
          isTransient: false
        })
      })
    )
  })

  test('is_production input overrides default', async () => {
    const mockGetInput = mocked(getInput)
    const environment = 'dev'
    mockGetInput.mockImplementation((name: string): string => {
      switch (name) {
        case 'environment_name':
          return environment
        case 'is_production':
          return 'true'
        case 'version':
          return '1.2.3'
        default:
          return ''
      }
    })

    const context = await getContext()
    expect(context).toEqual(
      expect.objectContaining({
        environment: expect.objectContaining({
          name: environment,
          isProduction: true,
          isTransient: false
        })
      })
    )
  })

  test('default is_production when not prod', async () => {
    const mockGetInput = mocked(getInput)
    const environment = 'dev'
    mockGetInput.mockImplementation((name: string): string => {
      switch (name) {
        case 'environment_name':
          return environment
        case 'version':
          return '1.2.3'
        default:
          return ''
      }
    })

    const context = await getContext()
    expect(context).toEqual(
      expect.objectContaining({
        environment: expect.objectContaining({
          name: environment,
          isProduction: false,
          isTransient: true
        })
      })
    )
  })
})
