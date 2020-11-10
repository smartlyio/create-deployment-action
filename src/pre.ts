import * as core from '@actions/core'
import {Context, getContext, saveExecutionState} from './context'
import {createDeployment} from './deployment'

async function run(): Promise<void> {
  try {
    const context: Context = await getContext()
    if (context.executionStage !== 'pre') {
      // This could happen if there is an error creating the deployment, and state is not saved.
      throw new Error(
        `Unexpected execution stage "${context.executionStage}" when executing pre stage.`
      )
    }
    await createDeployment(context)
    saveExecutionState(context)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
