# Create Github Deployment action

Creates a deployment throught the Github Deployments API

## Inputs

### `ENVIRONMENT_URL`

**Required** Link to put in deployment message.

### `GITHUB_TOKEN`

**Required** Github authorization token.

### `MARK_SUCCEEDED`

Should this deployment also be marked as complete/successful? Default `true`.

### `DEPLOY_TYPE`

Type of deployment to pass to Github API. Accepted values: `"production"`,`"PR"` Default `"production"`.

## Example usage

```yaml
- uses: smartlyio/create-deployment-action@master
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    ENVIRONMENT_URL: "https://here.is.deployment/index.html"
    DEPLOY_TYPE: "PR"
```
