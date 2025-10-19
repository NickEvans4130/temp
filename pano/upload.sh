#!/bin/bash

# Parse command line arguments
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "DRY RUN MODE - No files will actually be uploaded"
fi

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^//' | grep -v '^$' | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$R2_SECRET_ACCESS_KEY" ] || [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_ACCOUNT_ID" ] || [ -z "$R2_URL" ] || [ -z "$R2_BUCKET_NAME" ]; then
    echo "Error: Required R2 environment variables not set in .env file"
    echo "Required variables: R2_SECRET_ACCESS_KEY, R2_ACCESS_KEY_ID, R2_ACCOUNT_ID, R2_URL, R2_BUCKET_NAME"
fi

# Configure rclone remote if it doesn't exist
echo "Configuring rclone remote 'r2'..."
rclone config create r2 s3 \
    provider=Cloudflare \
    access_key_id="$R2_ACCESS_KEY_ID" \
    secret_access_key="$R2_SECRET_ACCESS_KEY" \
    endpoint="$R2_URL" \
    --non-interactive

# Copy img directory to R2 bucket (skip existing files)
if [ "$DRY_RUN" = true ]; then
    echo "DRY RUN: Checking how many files would be uploaded..."
    # Count files that would be uploaded by counting the "NOTICE" lines in dry run output
    UPLOAD_COUNT=$(rclone copy ./img r2:$R2_BUCKET_NAME/img --ignore-existing --dry-run 2>&1 | grep -c "NOTICE.*Skipped copy as --dry-run is set")
    echo "Would upload: $UPLOAD_COUNT files"
    echo ""
    echo "Files that would be uploaded:"
    rclone copy ./img r2:$R2_BUCKET_NAME/img --ignore-existing --dry-run 2>&1 | grep "NOTICE.*Skipped copy as --dry-run is set" | sed 's/.*NOTICE: //' | sed 's/: Skipped copy as --dry-run is set.*//'
else
    echo "Copying img directory to R2 bucket '$R2_BUCKET_NAME' (skipping existing files)..."
    rclone copy ./img r2:$R2_BUCKET_NAME/img --progress --verbose --ignore-existing
fi

echo "Upload complete!"
