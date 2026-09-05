# Evaluation Evidence - FlyRank Widget Platform

This document provides the exact curl commands and expected outputs for each acceptance probe.

---

## Probe 1: Multi-Origin Submissions

**Requirement:** Accept submissions from any origin via CORS with `Access-Control-Allow-Origin: *`

### Test Commands

```bash
# Test 1a: Submission from example.com origin
curl -X POST http://localhost:3000/api/submissions \
  -H "Origin: https://example.com" \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"probe1a@example.com","name":"Probe 1 Test A"}'

# Test 1b: Submission from another-site.org origin
curl -X POST http://localhost:3000/api/submissions \
  -H "Origin: https://another-site.org" \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"probe1b@example.com","name":"Probe 1 Test B"}'

# Test 1c: Preflight OPTIONS request
curl -X OPTIONS http://localhost:3000/api/submissions \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, X-Widget-Id" \
  -v

# Test 1d: Submission from localhost (dev origin)
curl -X POST http://localhost:3000/api/submissions \
  -H "Origin: http://localhost:8080" \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"probe1c@example.com","name":"Probe 1 Test C"}'
```

### Expected Outputs

**Test 1a/1b/1d Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "widget_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "created_at": "2026-09-05T...",
    "geo": {
      "country": "US",
      "city": "San Francisco"
    }
  },
  "meta": {
    "requestId": "uuid-v4",
    "timestamp": "2026-09-05T..."
  }
}
```

**Headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Widget-Id, X-Api-Key, X-Request-Id
```

**Test 1c Preflight Response (204):**
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Widget-Id, X-Api-Key, X-Request-Id
Access-Control-Max-Age: 86400
```

---

## Probe 2: Payload Size Limit

**Requirement:** Reject payloads > 50KB with 413 Payload Too Large

### Test Commands

```bash
# Test 2a: Valid payload under 50KB (~10KB)
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"probe2a@example.com","message":"'"$(printf 'x%.0s' {1..10000})"'"}'

# Test 2b: Payload over 50KB (~60KB) - should return 413
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"probe2b@example.com","message":"'"$(printf 'x%.0s' {1..60000})"'"}'

# Test 2c: Verify structured error response
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"probe2c@example.com","data":"'"$(printf 'x%.0s' {1..55000})"'"}' \
  -v
```

### Expected Outputs

**Test 2a Response (201):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Test 2b Response (413):**
```json
{
  "success": false,
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Request payload exceeds maximum allowed size of 51200 bytes",
    "details": {
      "maxBytes": 51200,
      "receivedBytes": 60123
    }
  },
  "meta": {
    "requestId": "uuid-v4",
    "timestamp": "2026-09-05T..."
  }
}
```

**Headers:**
```
Content-Type: application/json
X-Request-Id: uuid-v4
```

---

## Probe 3: Rate Limit Burst

**Requirement:** Limit to 5 requests per 30 seconds per IP per widget, return 429 with Retry-After

### Test Commands

```bash
# Test 3a: Make 6 rapid requests (first 5 should succeed, 6th should 429)
for i in {1..6}; do
  echo "Request $i:"
  curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/api/submissions \
    -H "Content-Type: application/json" \
    -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
    -d "{\"email\":\"ratelimit$i@test.com\"}"
  echo "---"
done

# Test 3b: Verify rate limit headers on successful requests
curl -v -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"ratelimit-header@test.com"}'

# Test 3c: Verify 429 response includes Retry-After
curl -v -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"ratelimit-429@test.com"}'

# Test 3d: Verify separate widget has separate limit
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" \
  -d '{"email":"different-widget@test.com"}'
```

### Expected Outputs

**Requests 1-5 (201):**
```json
{
  "success": true,
  "data": { ... }
}
```
Headers:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4,3,2,1,0
```

**Request 6 (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded"
  },
  "meta": { ... }
}
```
Headers:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
Retry-After: 25
```

**Test 3d (201 - different widget):**
```json
{
  "success": true,
  "data": { ... }
}
```

---

## Probe 4: Geo Fallback Tolerance

**Requirement:** Provider A (ip-api.com) → Provider B (ipapi.co) → NullGeo fallback chain. Never 500 on geo failure.

### Test Commands

```bash
# Test 4a: Normal submission - should include geo data
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"geo1@test.com"}'

# Test 4b: Multiple submissions to verify resilience
for i in {1..5}; do
  curl -s -X POST http://localhost:3000/api/submissions \
    -H "Content-Type: application/json" \
    -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
    -d "{\"email\":\"geo-fail$i@test.com\"}" | jq '.success, .data.geo'
done

# Test 4c: With mock failure enabled (requires MOCK_GEO_FAILURE_ALL=true restart)
# docker compose down && MOCK_GEO_FAILURE_ALL=true docker compose up -d
# Then run:
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"geo-mock@test.com"}'
```

### Expected Outputs

**Test 4a Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "widget_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "created_at": "2026-09-05T...",
    "geo": {
      "country": "US",
      "city": "San Francisco"
    }
  }
}
```

**Test 4c Response (201 - with NullGeo fallback):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "widget_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "created_at": "2026-09-05T...",
    "geo": {
      "country": "XX",
      "city": "TestCity"
    }
  }
}
```

**Key Assertion:** No 500 errors ever returned, even when both geo providers fail.

---

## Probe 5: Failing Side-Effect Isolation

**Requirement:** Email/notification failures never affect the 201 response to visitor.

### Test Commands

```bash
# Test 5a: Normal submission - verify 201
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"sideeffect@test.com","name":"Side Effect Test"}'

# Test 5b: Stop Mailpit and verify submission still works
# docker compose stop mailpit
# Then:
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"mailpit-down@test.com","name":"Mailpit Down Test"}'

# Test 5c: Restart Mailpit
# docker compose start mailpit

# Test 5d: Verify submission persisted in database
# (Requires admin API key)
curl -X GET "http://localhost:3000/api/submissions?widget_id=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -H "X-Api-Key: tk_alpha_abcdef123456"
```

### Expected Outputs

**All Tests (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "widget_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "created_at": "2026-09-05T...",
    "geo": { "country": "...", "city": "..." }
  }
}
```

**Test 5d Response (200):**
```json
{
  "success": true,
  "data": {
    "submissions": [
      { "id": "uuid", "payload_json": {...}, "is_spam": false, ... }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

**Key Assertion:** 
- Response is always 201 regardless of Mailpit status
- No notification-related fields in response
- Submission persisted in database

---

## Probe 6: Honeypot Trapping

**Requirement:** Hidden field detection marks submission as spam (is_spam=true) but returns 201.

### Test Commands

```bash
# Test 6a: Normal submission (no honeypot)
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"normal@test.com","name":"Normal User"}'

# Test 6b: Submission with honeypot field filled (spam)
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"spam@test.com","name":"Spam Bot","website_url":"http://spam.com"}'

# Test 6c: Submission with empty honeypot (normal)
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -d '{"email":"empty@test.com","name":"Empty Honeypot","website_url":""}'

# Test 6d: Verify is_spam=true in database for Test 6b
# Get submission ID from Test 6b response, then:
curl -X GET "http://localhost:3000/api/submissions?widget_id=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" \
  -H "X-Api-Key: tk_alpha_abcdef123456" | jq '.data.submissions[] | select(.payload_json.website_url=="http://spam.com") | .is_spam'

# Test 6e: Different widget with different honeypot field name
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -H "X-Widget-Id: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" \
  -d '{"email":"news-spam@test.com","website":"http://spam.com"}'
```

### Expected Outputs

**Test 6a/6c Response (201):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Test 6b Response (201 - still succeeds but marked spam internally):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Test 6d Database Query Result:**
```json
true
```

**Test 6e Response (201, spam detected):**
```json
{
  "success": true,
  "data": { ... }
}
```
Database: `is_spam = true`

**Key Assertions:**
- All return 201 (never 400 for honeypot)
- `is_spam = true` stored in database for honeypot-filled submissions
- `is_spam = false` for normal submissions
- Different widgets use different honeypot field names (configurable)

---

## Summary: Probe Execution Checklist

| Probe | Command | Expected Status | Key Verification |
|-------|---------|-----------------|------------------|
| 1 | `curl -H "Origin: https://example.com" ...` | 201 | `Access-Control-Allow-Origin: *` |
| 2 | `curl -d '{"data":"x60000"}'` | 413 | `error.code: "PAYLOAD_TOO_LARGE"` |
| 3 | 6 rapid requests | 5×201, 1×429 | `Retry-After` header on 429 |
| 4 | Normal submission | 201 | `geo` object in response |
| 5 | Submit with Mailpit down | 201 | Submission persisted, no 500 |
| 6 | Submit with honeypot filled | 201 | DB `is_spam = true` |

---

## Running All Probes

```bash
# Full test suite
npm test

# Individual probes
npm run probe-1
npm run probe-2
npm run probe-3
npm run probe-4
npm run probe-5
npm run probe-6
```