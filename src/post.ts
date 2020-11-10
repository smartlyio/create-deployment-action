import * as core from '@actions/core'
import {Context, getContext, saveExecutionState} from './context'
import {setDeploymentEnded} from './deployment'

async function run(): Promise<void> {
  try {
    core.info(`Executing action post-run stage`)
    const context: Context = await getContext()
    if (context.executionStage !== 'post') {
      // This will happen if the 'main' stage was skipped, e.g. due to
      // an `if:` condition in the workflow.
      context.jobStatus = 'inactive'
      core.warning(
        'Action main stage not detected to have run. Deploy status set to "inactive"'
      )
    }
    await setDeploymentEnded(context)
    saveExecutionState(context)
  } catch (error) {
    core.error(error.message)
    core.setFailed(error.message)
  }
}

run()
