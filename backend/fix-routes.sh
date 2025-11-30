#!/bin/bash

echo "Fixing all route files..."

# Fix auth middleware imports across all route files
find src/routes -name "*.ts" -type f -exec sed -i '' \
  -e 's/import.*{.*authorize.*}.*auth\.middleware/import { authenticate, requireRestaurantUser, requireAdmin } from "..\/middleware\/auth.middleware"/g' \
  -e 's/, *authorize//g' \
  -e 's/authorize, *//g' \
  -e 's/isRestaurantOwner/requireRestaurantUser/g' \
  -e 's/isOwner/requireRestaurantUser/g' \
  {} \;

echo "✅ All route files fixed!"
