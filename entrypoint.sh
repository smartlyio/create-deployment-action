#!/bin/sh -l

if [[ "$INPUT_DEPLOY_TYPE" == "production" ]]; then
    PRODUCTION_ENV=true
    TRANSIENT_ENV=false
elif [[ "$INPUT_DEPLOY_TYPE" == "PR" ]]; then
    PRODUCTION_ENV=false
    TRANSIENT_ENV=true
else
    echo "INVALID ENVIRONMENT"
    echo "Allowed values are \"Production\" and \"PR\""
    exit 1
fi

# Create deployment
PAYLOAD=$(echo '{}' | \
    jq --arg ref "$GITHUB_HEAD_REF" '.ref = $ref' | \
    jq --arg transient_environment "$TRANSIENT_ENV" '.transient_environment = $transient_environment' | \
    jq --arg production_environment "$PRODUCTION_ENV" '.production_environment = $production_environment' | \
    jq '.auto_merge = false' | \
    jq '.required_contexts = []' \
  )
DEPLOYMENTS_URL="https://api.github.com/repos/$GITHUB_REPOSITORY/deployments"
DEPLOYMENT=$(curl --fail -s -S -H "Authorization: token $INPUT_GITHUB_TOKEN" --header "Content-Type: application/vnd.github.ant-man-preview+json" --data "$PAYLOAD" "$DEPLOYMENTS_URL")
echo $DEPLOYMENT

# Mark Deployment as successful
STATUS_PAYLOAD=$(echo '{}' | \
    jq --arg environment_url "$INPUT_ENVIRONMENT_URL" '.environment_url = $environment_url' | \
    jq '.state = "success"'
  )
DEPLOYMENT_URL=$(echo $DEPLOYMENT | jq -r .url)
curl --fail -s -S -H "Authorization: token $INPUT_GITHUB_TOKEN" --header "Content-Type: application/vnd.github.ant-man-preview+json" --data "$STATUS_PAYLOAD" "$DEPLOYMENT_URL/statuses" > /dev/null
