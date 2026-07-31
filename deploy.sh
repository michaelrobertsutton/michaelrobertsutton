#!/bin/bash
set -e

BUCKET="michaelrobertsutton.com"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:?CLOUDFRONT_DISTRIBUTION_ID is not set — add it to ~/.zshrc}"
PROFILE="personal"

echo "Deploying to s3://$BUCKET..."

aws s3 sync . "s3://$BUCKET" \
  --profile "$PROFILE" \
  --delete \
  --exclude ".git/*" \
  --exclude ".claude/*" \
  --exclude ".gstack/*" \
  --exclude ".worktrees/*" \
  --exclude "*.DS_Store" \
  --exclude "README.md" \
  --exclude "CLAUDE.md" \
  --exclude "deploy.sh" \
  --exclude ".gitignore" \
  --exclude "archive/*" \
  --exclude "DESIGN.md" \
  --exclude "docs/*" \
  --cache-control "max-age=86400" \
  --metadata-directive REPLACE

# Set longer cache for versioned assets (content-type must be explicit with REPLACE)
aws s3 cp "s3://$BUCKET/assets/css/" "s3://$BUCKET/assets/css/" \
  --profile "$PROFILE" \
  --recursive \
  --cache-control "max-age=31536000" \
  --content-type "text/css" \
  --metadata-directive REPLACE

aws s3 cp "s3://$BUCKET/assets/js/" "s3://$BUCKET/assets/js/" \
  --profile "$PROFILE" \
  --recursive \
  --cache-control "max-age=31536000" \
  --content-type "application/javascript" \
  --metadata-directive REPLACE

echo "Invalidating CloudFront cache..."

INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --profile "$PROFILE" \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "Invalidation $INVALIDATION_ID created."
echo "Done. Site is live at https://michaelrobertsutton.com"
