import {
  Context,
  Environment,
  getContext,
  saveExecutionState,
  executionStage,
  PRE_HAS_RUN,
  MAIN_HAS_RUN,
  DEPLOYMENT_ID
} from '../src/context'
import {mocked} from 'ts-jest/utils';
import {getInput, saveState, getState, info} from '@actions/core';

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  saveState: jest.fn(),
  getState: jest.fn(),
  info: jest.fn()
}));

const OLD_ENV = process.env;
beforeEach(() => {
  process.env = {...OLD_ENV};
});

afterEach(() => {
  process.env = OLD_ENV;
});

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
    repo: {
      owner: '',
      name: '',
    },
    environment: {
      name: '',
      url: '',
      isProduction: false,
      isTransient: true
    },
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

describe('context', () => {
  delete process.env[`STATE_${PRE_HAS_RUN}`]
  delete process.env[`STATE_${MAIN_HAS_RUN}`]
  delete process.env[`STATE_${DEPLOYMENT_ID}`]
  process.env[`GITHUB_REPOSITORY`] = 'smartlyio/ci-sla'
  process.env[`GITHUB_REF`] = 'refs/heads/master'

  test('no repository inputs', async () => {
    delete process.env[`GITHUB_REPOSITORY`]
    await expect(getContext()).rejects.toThrow(/Unexpectedly missing.*GITHUB_REPOSITORY/)
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
    expect(context).toEqual(expect.objectContaining({
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
      jobStatus
    }))
  })
})
