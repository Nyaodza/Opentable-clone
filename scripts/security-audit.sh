#!/bin/bash

# Security Audit Script for OpenTable Clone
# This script performs automated security checks

echo "🔒 OpenTable Clone Security Audit"
echo "================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to print results
print_result() {
    if [ "$1" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    elif [ "$1" = "FAIL" ]; then
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    else
        echo -e "${YELLOW}⚠ WARN${NC}: $2"
        ((WARNINGS++))
    fi
}

echo "Running security audit..."
echo ""

# 1. Check for hardcoded secrets
echo "1. Checking for hardcoded secrets..."
if grep -r "password.*=" --include="*.ts" --include="*.js" --include="*.jsx" --include="*.tsx" . | grep -v node_modules | grep -v ".git" | head -5; then
    print_result "WARN" "Potential hardcoded passwords found"
else
    print_result "PASS" "No hardcoded passwords detected"
fi

# 2. Check for API keys in code
echo ""
echo "2. Checking for exposed API keys..."
if grep -r -i "api.*key.*=" --include="*.ts" --include="*.js" . | grep -v node_modules | grep -v ".git" | grep -v "process.env" | head -3; then
    print_result "WARN" "Potential API keys found in code"
else
    print_result "PASS" "No hardcoded API keys detected"
fi

# 3. Check environment files
echo ""
echo "3. Checking environment configuration..."
if [ -f ".env" ]; then
    if grep -q "JWT_SECRET" .env && [ $(grep "JWT_SECRET" .env | cut -d'=' -f2 | wc -c) -gt 32 ]; then
        print_result "PASS" "JWT_SECRET properly configured"
    else
        print_result "FAIL" "JWT_SECRET missing or too short"
    fi
else
    print_result "WARN" ".env file not found"
fi

# 4. Check for console.log in production files
echo ""
echo "4. Checking for debug statements..."
DEBUG_COUNT=$(find frontend/src backend/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l "console.log" | wc -l)
if [ $DEBUG_COUNT -eq 0 ]; then
    print_result "PASS" "No console.log statements found"
else
    print_result "WARN" "$DEBUG_COUNT files contain console.log statements"
fi

# 5. Check dependencies for vulnerabilities
echo ""
echo "5. Checking for dependency vulnerabilities..."
cd frontend && npm audit --audit-level moderate > /dev/null 2>&1
FRONTEND_AUDIT=$?
cd ../backend && npm audit --audit-level moderate > /dev/null 2>&1
BACKEND_AUDIT=$?
cd ..

if [ $FRONTEND_AUDIT -eq 0 ] && [ $BACKEND_AUDIT -eq 0 ]; then
    print_result "PASS" "No moderate/high vulnerabilities in dependencies"
else
    print_result "FAIL" "Vulnerabilities found in dependencies - run 'npm audit' to see details"
fi

# 6. Check for proper HTTPS redirect
echo ""
echo "6. Checking HTTPS configuration..."
if grep -r "Strict-Transport-Security" . --include="*.ts" --include="*.js" | head -1; then
    print_result "PASS" "HSTS headers configured"
else
    print_result "WARN" "HSTS headers not found"
fi

# 7. Check for SQL injection protection
echo ""
echo "7. Checking SQL injection protection..."
if grep -r "sequelize" backend/src --include="*.ts" | grep -q "QueryTypes.SELECT\|raw("; then
    print_result "WARN" "Raw SQL queries found - ensure proper sanitization"
else
    print_result "PASS" "Using ORM without raw queries"
fi

# 8. Check CORS configuration
echo ""
echo "8. Checking CORS configuration..."
if grep -r "cors" backend/src --include="*.ts" | grep -q "origin.*process.env\|allowedOrigins"; then
    print_result "PASS" "CORS properly configured with environment variables"
else
    print_result "WARN" "CORS configuration not found or hardcoded"
fi

# 9. Check for rate limiting
echo ""
echo "9. Checking rate limiting..."
if grep -r "rate.*limit" backend/src --include="*.ts" | head -1; then
    print_result "PASS" "Rate limiting implemented"
else
    print_result "FAIL" "Rate limiting not found"
fi

# 10. Check file upload security
echo ""
echo "10. Checking file upload security..."
if grep -r "multer\|upload" backend/src --include="*.ts" | grep -q "fileFilter\|limits"; then
    print_result "PASS" "File upload security measures found"
else
    print_result "WARN" "File upload security not configured"
fi

# 11. Check for input validation
echo ""
echo "11. Checking input validation..."
if grep -r "express-validator\|joi\|yup" backend/src --include="*.ts" | head -1; then
    print_result "PASS" "Input validation library found"
else
    print_result "FAIL" "Input validation not implemented"
fi

# 12. Check authentication implementation
echo ""
echo "12. Checking authentication..."
if grep -r "jwt.*verify\|bcrypt" backend/src --include="*.ts" | head -1; then
    print_result "PASS" "JWT and password hashing implemented"
else
    print_result "FAIL" "Authentication mechanisms not found"
fi

# Summary
echo ""
echo "========================================"
echo "Security Audit Summary:"
echo "========================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

SCORE=$((($PASSED * 100) / ($PASSED + $FAILED + $WARNINGS)))
echo ""
echo "Overall Security Score: $SCORE%"

if [ $SCORE -ge 80 ]; then
    echo -e "${GREEN}✓ Good security posture${NC}"
elif [ $SCORE -ge 60 ]; then
    echo -e "${YELLOW}⚠ Moderate security - improvements needed${NC}"
else
    echo -e "${RED}✗ Poor security - immediate action required${NC}"
fi

echo ""
echo "Recommendations:"
echo "- Fix all FAILED items immediately"
echo "- Address WARNINGS in next sprint"  
echo "- Run 'npm audit fix' to resolve dependency vulnerabilities"
echo "- Enable security headers in production"
echo "- Implement proper logging and monitoring"

exit $FAILED
