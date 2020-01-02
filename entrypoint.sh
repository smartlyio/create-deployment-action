#!/bin/sh -l

PAYLOAD=$(echo '{}' | jq --arg ref "$GITHUB_HEAD_REF" '.ref = $ref' | jq '.transient_environment = true' | jq '.production_environment = false' | jq '.auto_merge = false' | jq '.required_contexts = []' )
DEPLOYMENTS_URL="https://api.github.com/repos/$GITHUB_REPOSITORY/deployments"
echo "$PAYLOAD"
echo "$DEPLOYMENTS_URL"
DEPLOYMENT=$(curl --fail -s -S -H "Authorization: token $GITHUB_TOKEN" --header "Content-Type: application/vnd.github.ant-man-preview+json" --data "$PAYLOAD" "$DEPLOYMENTS_URL")
echo $DEPLOYMENT
STATUS_PAYLOAD=$(echo '{}' | jq --arg environment_url "$ENVIRONMENT_URL" '.environment_url = $environment_url' | jq '.state = "success"' )
DEPLOYMENT_URL=$(echo $DEPLOYMENT | jq -r .url)
echo "$STATUS_PAYLOAD"
echo "$DEPLOYMENT_URL/statuses"
curl --fail -s -S -H "Authorization: token $GITHUB_TOKEN" --header "Content-Type: application/vnd.github.ant-man-preview+json" --data "$STATUS_PAYLOAD" "$DEPLOYMENT_URL/statuses" > /dev/null
