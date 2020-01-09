# Create Github Deployment action

Creates a deployment throught the Github Deployments API

## Inputs

### `GITHUB_TOKEN`

**Required** Github authorization token.

### `ENVIRONMENT_URL`

**Required** Link to put in deployment message.

### `ENVIRONMENT_NAME`

Name of deployment environment to pass to Github API. Default `"production"`.

### `MARK_SUCCEEDED`

Should this deployment also be marked as complete/successful? Default `true`.

## Example usage

```yaml
- uses: smartlyio/create-deployment-action@master
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    ENVIRONMENT_URL: "https://here.is.deployment/index.html"
    ENVIRONMENT_NAME: "test"
```
