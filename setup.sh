#!/bin/bash
set -euo pipefail

# Write Your Senator - Setup Script
# Run this after authenticating with: gcloud auth login && firebase login

PROJECT_ID="write-your-senator"
WIF_SA="github-ci@github-ci-blanxlait.iam.gserviceaccount.com"

echo "=== Write Your Senator Setup ==="
echo ""

# Step 1: Create Firebase project
echo "Step 1: Creating Firebase project..."
if firebase projects:list 2>/dev/null | grep -q "$PROJECT_ID"; then
  echo "  Project already exists."
else
  firebase projects:create "$PROJECT_ID" --display-name "Write Your Senator"
  echo "  Project created."
fi

# Step 2: Add Firebase to the GCP project
echo ""
echo "Step 2: Adding Firebase to project..."
firebase projects:addfirebase "$PROJECT_ID" 2>/dev/null || echo "  Firebase already added."

# Step 3: Enable required APIs
echo ""
echo "Step 3: Enabling APIs..."
gcloud services enable \
  civicinfo.googleapis.com \
  aiplatform.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --project="$PROJECT_ID"
echo "  APIs enabled."

# Step 4: Create Civic API key
echo ""
echo "Step 4: Creating Civic API key..."
EXISTING_KEY=$(gcloud services api-keys list --project="$PROJECT_ID" --format="value(name)" --filter="displayName=civic-api-key" 2>/dev/null || true)
if [ -n "$EXISTING_KEY" ]; then
  echo "  API key already exists."
  KEY_STRING=$(gcloud services api-keys get-key-string "$EXISTING_KEY" --format="value(keyString)")
else
  KEY_RESULT=$(gcloud services api-keys create \
    --display-name="civic-api-key" \
    --api-target=service=civicinfo.googleapis.com \
    --project="$PROJECT_ID" \
    --format="value(response.keyString)")
  KEY_STRING="$KEY_RESULT"
  echo "  API key created."
fi

# Save to .env
echo "CIVIC_API_KEY=$KEY_STRING" > functions/.env
echo "  Saved to functions/.env"

# Step 5: Grant WIF service account permissions
echo ""
echo "Step 5: Granting WIF service account permissions..."
for role in "roles/firebase.admin" "roles/firebasehosting.admin" "roles/cloudfunctions.admin" "roles/iam.serviceAccountUser" "roles/artifactregistry.admin" "roles/run.admin" "roles/aiplatform.user"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$WIF_SA" \
    --role="$role" \
    --quiet 2>/dev/null || true
done
echo "  Permissions granted."

# Step 6: Enable APIs in WIF project (for cross-project access)
echo ""
echo "Step 6: Enabling APIs in WIF project for cross-project access..."
gcloud services enable \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  cloudfunctions.googleapis.com \
  --project=github-ci-blanxlait 2>/dev/null || echo "  (may require permissions)"

# Step 7: Update WIF bindings
echo ""
echo "Step 7: Updating WIF bindings..."
echo "  Running WIF setup script..."
cd ~/dev/github-gcloud-wif-setup && ./setup.sh << EOF
y
EOF
cd - > /dev/null

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Create GitHub repo: gh repo create BLANXLAIT/write-your-senator --public --source=. --push"
echo "  2. Test locally: firebase emulators:start"
echo "  3. Deploy: git push origin main"
echo ""
echo "Civic API key saved to: functions/.env"
echo "Project URL: https://$PROJECT_ID.web.app"
