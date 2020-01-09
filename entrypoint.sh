#!/bin/sh -l

# production_env is set by default but transient env is not
# Setting these explicitly since they're preview features and we want to be sure of behaviour
if [ "$INPUT_ENVIRONMENT_NAME" = "production" ]; then
  PRODUCTION_ENV=true
  TRANSIENT_ENV=false
else
  PRODUCTION_ENV=false
  TRANSIENT_ENV=true
fi

# Check inputs
if [ -z "$INPUT_ENVIRONMENT_URL" ] || [ -z "$INPUT_GITHUB_TOKEN" ]; then
  echo "Please specify both the github token and the deployed environment URL"
  exit 1
fi

# Create deployment
PAYLOAD=$(echo '{}' | \
    jq --arg ref "$GITHUB_HEAD_REF" '.ref = $ref' | \
    jq --arg environment "$INPUT_ENVIRONMENT_NAME" '.environment = $environment' | \
    jq --argjson transient_environment "$TRANSIENT_ENV" '.transient_environment = $transient_environment' | \
    jq --argjson production_environment "$PRODUCTION_ENV" '.production_environment = $production_environment' | \
    jq '.auto_merge = false' | \
    jq '.required_contexts = []' \
  )
DEPLOYMENTS_URL="https://api.github.com/repos/$GITHUB_REPOSITORY/deployments"
DEPLOYMENT=$(curl --fail -s -S -H "Authorization: token $INPUT_GITHUB_TOKEN" --header "Content-Type: application/vnd.github.ant-man-preview+json" --data "$PAYLOAD" "$DEPLOYMENTS_URL")
echo $DEPLOYMENT

# Mark Deployment as successful
if [ "$INPUT_MARK_SUCCEEDED" = "true" ]; then
  STATUS_PAYLOAD=$(echo '{}' | \
      jq --arg environment_url "$INPUT_ENVIRONMENT_URL" '.environment_url = $environment_url' | \
      jq '.state = "success"'
    )
  DEPLOYMENT_URL=$(echo $DEPLOYMENT | jq -r .url)
  curl --fail -s -S -H "Authorization: token $INPUT_GITHUB_TOKEN" --header "Content-Type: application/vnd.github.ant-man-preview+json" --data "$STATUS_PAYLOAD" "$DEPLOYMENT_URL/statuses" > /dev/null
fi
