import * as core from '@actions/core'
import {Context, getContext, saveExecutionState} from './context'
import {setDeploymentEnded} from './deployment'

async function run(): Promise<void> {
  try {
    const context: Context = await getContext()
    if (context.executionStage !== 'post') {
      // This will happen if the 'main' stage was skipped, e.g. due to
      // an `if:` condition in the workflow.
      context.jobStatus = 'error'
    }
    await setDeploymentEnded(context)
    saveExecutionState(context)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
