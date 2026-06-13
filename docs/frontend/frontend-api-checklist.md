# Frontend API Readiness Checklist

## Response Envelope

- Success responses use `success: true`, `message`, and `data`.
- Error responses use `success: false`, `message`, `statusCode`, `timestamp`, `path`, and `errors`.
- Validation errors return `400` with `message: "Validation failed"` and field details in `errors`.
- Database timeouts return `503` with `message: "Database request timed out"`.
- No debug endpoints are registered.

## Pagination

- Paginated responses expose `data.pagination`.
- Pagination shape:
  - `page`
  - `limit`
  - `total`
  - `totalPages`
- Item array keys vary by module:
  - `courses`
  - `products`
  - `items`
  - `logs`
- Backend fix applied: list responses that previously used `data.meta` now use `data.pagination`.

## Swagger

- Swagger UI is available at `/api/docs` when `SWAGGER_ENABLED=true`.
- Swagger JSON is available at `/api/docs-json` when `SWAGGER_ENABLED=true`.
- Bearer auth is registered globally in Swagger.
- Request DTO validation decorators are present for frontend request schemas.
- Remaining improvement: add full response DTO classes to older catalog/admin endpoints that currently have description-only `@ApiOkResponse` decorators.
- Frontend should expect the global response envelope even when an older Swagger example shows only an inner payload.

## CORS

Production:

- Website domain included exactly.
- Dashboard domain included exactly.
- No wildcard `*`.
- Protocols included, for example `https://`.
- No path segments.

Local:

- Include local frontend ports as needed:
  - `http://localhost:3000`
  - `http://localhost:5173`
  - `http://localhost:5174`

Backend env example:

```env
CORS_ALLOWED_ORIGINS=https://<website-domain>,https://<dashboard-domain>,http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=true
```

## Auth

- Register sends email verification OTP.
- Login requires verified email.
- Login returns `accessToken`, `refreshToken`, and `user`.
- Refresh token endpoint rotates tokens.
- Frontend retries a failed authenticated request once after refresh.
- Logout clears server refresh state and frontend auth state.
- Do not store or log tokens in URLs, analytics, or error breadcrumbs.

## Profile

- `GET /users/profile` returns current user only.
- Profile updates reject protected fields through validation whitelist.
- Address routes are current-user scoped.
- Profile image is a public asset URL or relative `/uploads/...` path.

## Courses

- Public course list/detail works without auth.
- Purchased course endpoints require bearer auth.
- Progress endpoint accepts VIDEO/PDF progress.
- Course progress and continue endpoints are ready for "resume learning" UI.
- VIDEO and PDF protected content must use signed URL endpoints.

## Books

- Public book list/detail works without auth.
- Book covers/images are public asset URLs.
- Digital/audio content requires purchase and signed URL endpoints.
- Frontend must never use raw `readerFile`, `audioFile`, or S3 object keys as playable URLs.

## Products

- Public product list/detail works without auth.
- Product images are public asset URLs.
- Product list supports category/search/featured/home filters.
- Stock and quantity validation happen through cart/order APIs.

## Wishlist

- Wishlist routes require bearer auth.
- Supported item types: `COURSE`, `BOOK`, `PRODUCT`.
- Check route can drive heart/bookmark UI.
- Delete route is current-user scoped.

## Cart

- Cart routes require bearer auth.
- `BOOK` cart items use `BookFormat.id`.
- Cart response includes `cart` and `summary`.
- Currency query should be explicitly sent where UI supports EGP/USD.

## Orders

- Order creation uses the authenticated user's cart.
- `shippingAddressId` is required when physical items exist.
- Order list uses `data.items` and `data.pagination`.
- Users can read/cancel only their own orders.

## Coupons

- Validate before applying for better UX.
- Apply/remove routes require bearer auth.
- Coupon calculations return discount amount and total after discount.
- Wrong currency, expired, inactive, and usage-limit cases should be shown from API error messages.

## Payments

- Fawry:
  - frontend creates payment and displays returned Fawry reference values.
  - backend controls `FAWRY_RETURN_URL` and `FAWRY_NOTIFICATION_URL`.
- PayPal:
  - frontend redirects to returned `approvalUrl`.
  - frontend does not mark orders paid.
  - backend verifies status through PayPal status/webhook.
- Webhook routes are provider-only and should not be called by frontend code.

## File URLs

- Public assets:
  - Resolve relative `/uploads/...` paths against the API origin.
- Protected assets:
  - Use CloudFront signed URL endpoints only.
  - Treat signed URLs as temporary.
  - Re-fetch when expired or when playback/download starts.

## Admin Separation

- Admin APIs are under `/admin/...`.
- Admin APIs require admin bearer token.
- Dashboard frontend should use a separate admin API client or route group.
- Exception: book/category write routes are admin-protected methods on public-looking book paths; keep them in the admin client only.

## Missing Backend Fixes / Follow-Ups

- Add full response DTOs for older description-only Swagger responses.
- Consider adding a formal OpenAPI export step in CI and generating frontend clients from `/api/docs-json`.
- Production Swagger is disabled by default; explicitly set `SWAGGER_ENABLED=true` only for controlled environments.
- Confirm PayPal return/cancel URLs in PayPal dashboard and frontend routes.
