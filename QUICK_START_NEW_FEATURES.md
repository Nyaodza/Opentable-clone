# 🚀 Quick Start Guide - New Features

## Critical Features Implementation

This guide covers the setup and testing of newly implemented critical features.

---

## 1. SMS Reminder System Setup

### Prerequisites:
1. Twilio account (free $15 credit): https://www.twilio.com/try-twilio
2. Phone number for testing

### Setup Steps:

```bash
# 1. Add to .env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token  
TWILIO_PHONE_NUMBER=+1234567890
ENABLE_SMS_REMINDERS=true
```

```bash
# 2. Install dependencies (already done)
cd backend
npm install

# 3. Test SMS service
node -e "
const sms = require('./dist/services/sms.service').default;
sms.sendSMS({
  to: '+1YOUR_PHONE',
  message: 'Test from OpenTable Clone!'
});
"
```

### Start Reminder Scheduler:

```javascript
// In backend/src/main.ts, add:
import reminderScheduler from './services/reminder-scheduler.service';

// After app starts:
reminderScheduler.start();
```

### Testing:
```bash
# Manual trigger for testing
curl -X POST http://localhost:3001/api/admin/trigger-reminders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 2. Guest Booking (No Login Required)

### Setup:
Already configured! No additional setup needed.

### Testing:

```bash
# 1. Create guest reservation
curl -X POST http://localhost:3001/api/guest-reservations \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "RESTAURANT_UUID",
    "guestName": "John Smith",
    "guestEmail": "john@example.com",
    "guestPhone": "+1234567890",
    "date": "2025-10-15",
    "time": "19:00",
    "partySize": 2
  }'

# Response will include:
# - confirmationCode: "ABC123"
# - managementToken: "long_secure_token"
# - managementUrl: "http://localhost:3000/guest-reservations/{token}"
```

### Frontend Testing:
1. Navigate to: `http://localhost:3000/guest-booking?restaurantId=UUID&restaurantName=Test%20Restaurant&date=2025-10-15&time=19:00`
2. Fill out form (no login needed)
3. Submit and receive confirmation
4. Use management link to modify/cancel

---

## 3. Dine Now (Immediate Seating)

### Setup:
Enable in .env:
```bash
ENABLE_DINE_NOW=true
```

### Testing:

```bash
# Find restaurants with immediate availability
curl "http://localhost:3001/api/dine-now?partySize=2&latitude=40.7128&longitude=-74.0060&maxDistance=10"

# Response includes restaurants with:
# - estimatedWaitTime: 0 (immediate) or minutes to wait
# - availableTables: number
# - distance: km from your location
```

### Frontend Testing:
1. Navigate to: `http://localhost:3000/dine-now`
2. Enable location services
3. Select party size and filters
4. Click "Find Tables"
5. Book immediately available restaurants

---

## 4. Gift Card System

### Setup:
```bash
ENABLE_GIFT_CARDS=true
STRIPE_SECRET_KEY=your_key  # For payment processing
```

### Testing:

```bash
# 1. Purchase gift card
curl -X POST http://localhost:3001/api/gift-cards/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50,
    "recipientEmail": "recipient@example.com",
    "recipientName": "Jane Doe",
    "message": "Happy Birthday!"
  }'

# Response includes:
# - code: "XXXX-XXXX-XXXX-XXXX" (16 characters)
# - pin: "123456" (6 digits)

# 2. Check balance
curl -X POST http://localhost:3001/api/gift-cards/check-balance \
  -H "Content-Type: application/json" \
  -d '{
    "code": "XXXX-XXXX-XXXX-XXXX",
    "pin": "123456"
  }'

# 3. Redeem gift card
curl -X POST http://localhost:3001/api/gift-cards/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "code": "XXXX-XXXX-XXXX-XXXX",
    "pin": "123456",
    "amount": 25.00
  }'
```

---

## 5. Private Dining / Events

### Database Migration:
```bash
cd backend
npm run db:migrate

# Or manually create table:
# CREATE TABLE private_dining_events (...);
```

### Testing:
```bash
# Create private dining request
curl -X POST http://localhost:3001/api/private-dining \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "restaurantId": "UUID",
    "eventName": "Corporate Dinner",
    "eventType": "corporate",
    "date": "2025-11-15",
    "startTime": "18:00",
    "endTime": "22:00",
    "guestCount": 50,
    "minimumSpend": 5000,
    "contactEmail": "event@company.com"
  }'
```

---

## Database Migrations

### Run migrations for new tables:

```bash
cd backend

# Create migration files
npm run migrate:create -- add-guest-reservations
npm run migrate:create -- add-gift-cards
npm run migrate:create -- add-private-dining-events

# Run migrations
npm run migrate:up

# Check status
npm run migrate:status
```

### Manual SQL (if needed):

```sql
-- Guest Reservations Table
CREATE TABLE guest_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  user_id UUID REFERENCES users(id),
  guest_email VARCHAR(255) NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  status VARCHAR(50) DEFAULT 'confirmed',
  confirmation_code VARCHAR(10) UNIQUE NOT NULL,
  management_token VARCHAR(100) UNIQUE NOT NULL,
  sms_reminder_sent BOOLEAN DEFAULT FALSE,
  email_reminder_sent BOOLEAN DEFAULT FALSE,
  special_requests TEXT,
  dietary_restrictions TEXT[],
  occasion_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Gift Cards Table
CREATE TABLE gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  pin VARCHAR(10) NOT NULL,
  purchased_by UUID REFERENCES users(id),
  redeemed_by UUID REFERENCES users(id),
  initial_amount DECIMAL(10,2) NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  message TEXT,
  expiration_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Private Dining Events Table
CREATE TABLE private_dining_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  event_name VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count BETWEEN 10 AND 500),
  status VARCHAR(50) DEFAULT 'pending',
  minimum_spend DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_guest_reservations_date ON guest_reservations(date, time);
CREATE INDEX idx_guest_reservations_email ON guest_reservations(guest_email);
CREATE INDEX idx_guest_reservations_phone ON guest_reservations(guest_phone);
CREATE INDEX idx_gift_cards_code ON gift_cards(code);
CREATE INDEX idx_private_dining_date ON private_dining_events(date);
```

---

## Testing Checklist

### Guest Booking:
- [ ] Create reservation without login
- [ ] Receive confirmation code
- [ ] Access via management token
- [ ] Modify reservation
- [ ] Cancel reservation
- [ ] Create account and link reservations

### SMS Reminders:
- [ ] Test Twilio connection
- [ ] Send test SMS
- [ ] Verify 24-hour reminder
- [ ] Verify 2-hour reminder
- [ ] Check SMS delivery status

### Dine Now:
- [ ] Search with location
- [ ] Filter by party size
- [ ] See immediate availability
- [ ] See wait times
- [ ] Book immediately

### Gift Cards:
- [ ] Purchase gift card
- [ ] Generate unique code/PIN
- [ ] Check balance
- [ ] Redeem partial amount
- [ ] Redeem full amount
- [ ] Verify expiration

---

## Monitoring & Logs

### Check if services are running:

```bash
# Backend logs
cd backend
npm run dev

# Watch for:
# "✅ SMS Service initialized with Twilio"
# "🔔 Starting reminder scheduler service..."
# "✅ Reminder scheduler service started"

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/guest-reservations/stats/RESTAURANT_ID
```

### Monitor Twilio:
- Dashboard: https://console.twilio.com/
- Check SMS logs
- Monitor delivery rates
- View usage and billing

---

## Common Issues & Solutions

### Issue: SMS not sending
```bash
# Check Twilio credentials
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN

# Test connection
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

### Issue: Guest booking not working
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT * FROM guest_reservations LIMIT 1;"

# Check API endpoint
curl http://localhost:3001/api/guest-reservations/health
```

### Issue: Dine Now returns no results
```bash
# Check if restaurants have tables
psql $DATABASE_URL -c "SELECT COUNT(*) FROM tables;"

# Check if restaurant hours are set
psql $DATABASE_URL -c "SELECT * FROM restaurant_hours LIMIT 5;"
```

---

## Performance Tips

### Optimize availability checking:
```sql
-- Add index for faster queries
CREATE INDEX idx_reservations_datetime ON reservations(restaurant_id, date, time);
CREATE INDEX idx_tables_restaurant ON tables(restaurant_id) WHERE is_active = true;
```

### Cache Dine Now results:
```javascript
// In backend - add Redis caching
const cacheKey = `dine-now:${lat}:${lng}:${partySize}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Cache for 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(results));
```

---

## Next Steps

1. ✅ Test all features locally
2. ✅ Set up Twilio account and add credits
3. ✅ Run database migrations
4. ✅ Test SMS delivery
5. ✅ Deploy to staging environment
6. ✅ Monitor metrics:
   - Guest booking conversion rate
   - No-show rate reduction
   - Dine Now usage
   - Gift card sales
   - SMS delivery rate

---

## Support

For issues:
1. Check logs: `npm run dev` output
2. Check database: `psql $DATABASE_URL`
3. Test APIs with curl commands above
4. Review environment variables in .env

**Critical:** Make sure Twilio account is active and has credits for SMS!
