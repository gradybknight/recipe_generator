#!/bin/bash

set -e

# --- Config ---
# This deployment target is intentionally separate from the other demo sites.
BUCKET_NAME=${1:-recipe.gradyknight.com}
REGION=${2:-us-east-1}
BUILD_DIR="./dist"
DISTRIBUTION_ID=${DISTRIBUTION_ID:-E1ZS4IZWQU5LKN}

echo "➡️ Building recipe app..."
npm run build

echo "✅ Build complete"

echo "➡️ Syncing recipe app to S3 bucket: $BUCKET_NAME in region $REGION..."
aws s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME" --delete

echo "✅ Sync complete"

echo "➡️ Invalidating CloudFront cache for distribution: $DISTRIBUTION_ID..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

echo "✅ CloudFront cache invalidation requested"

echo "🌐 Recipe site is likely available at:"
echo "https://recipe.gradyknight.com"
