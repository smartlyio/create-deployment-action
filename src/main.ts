import * as core from '@actions/core'
import {Context, getContext} from './context'
import {
  createDeployment,
  setDeploymentInProgress,
  setDeploymentEnded
} from './deployment'

async function run(): Promise<void> {
  try {
    const context: Context = await getContext()
    switch (context.executionStage) {
      case 'pre':
        await createDeployment(context)
        break
      case 'main':
        await setDeploymentInProgress(context)
        break
      case 'post':
        await setDeploymentEnded(context)
        break
      default:
        throw new Error(`Unexpected execution stage ${context.executionStage}`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
