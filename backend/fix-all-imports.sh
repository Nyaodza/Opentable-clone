#!/bin/bash

echo "Fixing all model imports comprehensively..."

# Fix all variations of model imports
find src -name "*.ts" -type f -print0 | xargs -0 sed -i '' \
  -e "s|from '\.\./models/User\.model'|from '../models/User'|g" \
  -e "s|from '\./models/User\.model'|from './models/User'|g" \
  -e "s|from '\.\./models/Restaurant\.model'|from '../models/Restaurant'|g" \
  -e "s|from '\./models/Restaurant\.model'|from './models/Restaurant'|g" \
  -e "s|from '\.\./models/Reservation\.model'|from '../models/Reservation'|g" \
  -e "s|from '\./models/Reservation\.model'|from './models/Reservation'|g" \
  -e "s|from '\.\./models/Review\.model'|from '../models/Review'|g" \
  -e "s|from '\./models/Review\.model'|from './models/Review'|g" \
  -e "s|from '\.\./models/Table\.model'|from '../models/Table'|g" \
  -e "s|from '\./models/Table\.model'|from './models/Table'|g" \
  -e "s|from '\.\./models/Payment\.model'|from '../models/Payment'|g" \
  -e "s|from '\./models/Payment\.model'|from './models/Payment'|g" \
  -e "s|from '\.\./models/Waitlist\.model'|from '../models/Waitlist'|g" \
  -e "s|from '\./models/Waitlist\.model'|from './models/Waitlist'|g" \
  -e "s|from '\.\./models/Tenant\.model'|from '../models/Tenant'|g" \
  -e "s|from '\./models/Tenant\.model'|from './models/Tenant'|g"

echo "✅ All imports fixed!"
