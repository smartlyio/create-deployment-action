import * as core from '@actions/core'
import {Context, getContext, saveExecutionState} from './context'
import {setDeploymentInProgress} from './deployment'

async function run(): Promise<void> {
  try {
    core.info(`Executing action main stage`)
    const context: Context = await getContext()
    if (context.executionStage !== 'main') {
      throw new Error(
        `Unexpected execution stage "${context.executionStage}" when executing main stage`
      )
    }
    await setDeploymentInProgress(context)
    saveExecutionState(context)
  } catch (error) {
    core.error(error.message)
    core.setFailed(error.message)
  }
}

run()
