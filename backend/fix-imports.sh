#!/bin/bash

# Fix all model imports to use PascalCase names with named exports

echo "Fixing model imports..."

# Find all TypeScript files and fix common import patterns
find src -name "*.ts" -type f -exec sed -i '' \
  -e "s/from '\.\.\/models\/user\.model'/from '..\/models\/User'/g" \
  -e "s/from '\.\/models\/user\.model'/from '.\/models\/User'/g" \
  -e "s/from '\.\.\/models\/restaurant\.model'/from '..\/models\/Restaurant'/g" \
  -e "s/from '\.\/models\/restaurant\.model'/from '.\/models\/Restaurant'/g" \
  -e "s/from '\.\.\/models\/reservation\.model'/from '..\/models\/Reservation'/g" \
  -e "s/from '\.\/models\/reservation\.model'/from '.\/models\/Reservation'/g" \
  -e "s/from '\.\.\/models\/review\.model'/from '..\/models\/Review'/g" \
  -e "s/from '\.\/models\/review\.model'/from '.\/models\/Review'/g" \
  -e "s/from '\.\.\/models\/table\.model'/from '..\/models\/Table'/g" \
  -e "s/from '\.\/models\/table\.model'/from '.\/models\/Table'/g" \
  -e "s/import User from/import { User } from/g" \
  -e "s/import Restaurant from/import { Restaurant } from/g" \
  -e "s/import Reservation from/import { Reservation } from/g" \
  -e "s/import Review from/import { Review } from/g" \
  -e "s/import Table from/import { Table } from/g" \
  -e "s/import Payment from/import { Payment } from/g" \
  -e "s/import Waitlist from/import { Waitlist } from/g" \
  -e "s/import AuditLog from/import { AuditLog } from/g" \
  -e "s/import Tenant from/import { Tenant } from/g" \
  {} \;

echo "✅ Model imports fixed!"
echo ""
echo "Note: This fixed common patterns. Some files may need manual review."
