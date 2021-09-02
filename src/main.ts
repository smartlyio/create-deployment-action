import * as core from '@actions/core'
import {Context, getContext, saveExecutionState} from './context'
import {
  createDeployment,
  setDeploymentEnded,
  setDeploymentInProgress
} from './deployment'

export async function runPre(): Promise<void> {
  try {
    core.info(`Executing action pre-run stage`)
    const context: Context = await getContext()

    if (context.executionStage !== 'pre') {
      // This could happen if there is an error creating the deployment, and state is not saved.
      throw new Error(
        `Unexpected execution stage "${context.executionStage}" when executing pre stage.`
      )
    }

    if (context.skipPreAction) {
      core.info(
        `Skipping action pre-run stage; deployment will be created in the main stage`
      )
    } else {
      await createDeployment(context)
    }
    saveExecutionState(context)
  } catch (error) {
    core.error(`${error}`)
    core.setFailed(`${error}`)
  }
}

export async function runMain(): Promise<void> {
  try {
    core.info(`Executing action main stage`)
    const context: Context = await getContext()

    if (context.skipPreAction) {
      if (!['pre', 'main'].includes(context.executionStage)) {
        throw new Error(
          `Unexpected execution stage "${context.executionStage}" when executing main stage`
        )
      }
      context.executionStage = 'main'
      await createDeployment(context)
    }

    if (context.executionStage !== 'main') {
      throw new Error(
        `Unexpected execution stage "${context.executionStage}" when executing main stage`
      )
    }

    await setDeploymentInProgress(context)
    saveExecutionState(context)
  } catch (error) {
    core.error(`${error}`)
    core.setFailed(`${error}`)
  }
}

export async function runPost(): Promise<void> {
  try {
    core.info(`Executing action post-run stage`)
    const context: Context = await getContext()
    if (!context.deploymentId) {
      core.warning(
        'The deployment creation step seems to have been skipped. Skipping post-run stage.'
      )
      return
    }
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
    core.error(`${error}`)
    core.setFailed(`${error}`)
  }
}
