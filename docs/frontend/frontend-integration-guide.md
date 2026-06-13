# Frontend API Integration Guide

Base URL examples:

- Local: `http://localhost:3000/api`
- Production: `https://api.<domain>/api`

Swagger, when `SWAGGER_ENABLED=true`:

- UI: `GET /api/docs`
- JSON: `GET /api/docs-json`

TypeScript contracts:

- [dr-saleh-api.types.ts](./dr-saleh-api.types.ts)

## Response Format

All normal API responses are wrapped by the backend response interceptor:

```ts
type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};
```

Errors use:

```ts
type ApiError = {
  success: false;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  errors: unknown[];
};
```

Frontend rule:

- Check HTTP status first.
- If `success === false`, show `message` and optionally field errors from `errors`.
- For validation errors, backend sets `message` to `Validation failed` and puts details in `errors`.
- For database timeouts, backend returns `503` with `message: "Database request timed out"`.

Pagination:

```ts
type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
```

Paginated endpoints now expose pagination as `data.pagination`. The item array key is module-specific:

- Courses: `data.courses`
- Products: `data.products`
- Orders, coupons, referrals: `data.items`
- Audit logs: `data.logs`

## Auth Flow

Register:

```http
POST /auth/register
```

Body:

```json
{
  "fullName": "Ahmed Saleh",
  "email": "ahmed@example.com",
  "phoneNumber": "+201001234567",
  "password": "StrongPass123",
  "referralCode": "OPTIONAL"
}
```

Then verify email:

```http
POST /auth/verify-email
```

Body:

```json
{
  "email": "ahmed@example.com",
  "otp": "123456"
}
```

Login:

```http
POST /auth/login
```

Response data:

```ts
{
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
```

Frontend storage recommendation:

- Prefer access token in memory.
- Store refresh token in the most secure client storage available for the platform.
- Do not put tokens in logs, analytics, URLs, or error monitoring breadcrumbs.

## Refresh Token Flow

Refresh:

```http
POST /auth/refresh-token
```

Body:

```json
{
  "refreshToken": "<refresh-token>"
}
```

Response data:

```ts
{
  accessToken: string;
  refreshToken: string;
}
```

Recommended frontend interceptor:

1. Attach `Authorization: Bearer <accessToken>` to protected requests.
2. On `401`, call `/auth/refresh-token` once.
3. Replace both tokens from the refresh response.
4. Retry the original request once.
5. If refresh fails, clear auth state and route to login.

Logout:

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

## Profile Flow

Endpoints:

- `GET /users/profile`
- `PATCH /users/profile`
- `POST /users/change-password`
- `POST /users/profile-image`
- `DELETE /users/profile-image`
- `GET /addresses`
- `POST /addresses`
- `GET /addresses/:id`
- `PATCH /addresses/:id`
- `DELETE /addresses/:id`

Notes:

- Profile and address routes require the user bearer token.
- Address IDs are user-owned. Treat `403` or `404` as "not accessible".
- `profileImage` and public upload fields are normal relative URLs. Resolve them with the API origin.

Example asset resolver:

```ts
export function resolveAssetUrl(apiOrigin: string, value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${apiOrigin.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}
```

## Courses Flow

Public catalog:

- `GET /courses?page=1&limit=20&lang=en`
- `GET /courses/home?lang=en`
- `GET /courses/featured?lang=en`
- `GET /courses/:id?lang=en`
- `GET /courses/:courseId/reviews`
- `POST /courses/:courseId/reviews` with bearer token

Owned course area:

- `GET /my-courses`
- `GET /my-courses/:courseId`
- `GET /my-courses/:courseId/progress`
- `GET /my-courses/:courseId/continue`
- `GET /my-courses/:courseId/lessons/:lessonId`
- `PATCH /my-courses/lessons/:lessonId/progress`
- `GET /my-courses/:courseId/lessons/:lessonId/video-url`
- `GET /my-courses/:courseId/lessons/:lessonId/pdf-url`

Progress update body:

```json
{
  "watchedSeconds": 120,
  "completionPercentage": 50
}
```

Rules:

- `completionPercentage` is `0..100`.
- `>= 90` marks a lesson complete.
- PDF completion can be sent with `isCompleted: true`; backend sets completion to `100`.
- Protected lesson media is accessed only through signed CloudFront URL endpoints.

Signed URL response data:

```ts
{
  url: string;
  expiresAt: string;
}
```

Frontend should request a fresh signed URL when the URL is expired or playback/download starts.

## Books Flow

Public catalog:

- `GET /book-categories?lang=en`
- `GET /book-categories/:id?lang=en`
- `GET /books?page=1&limit=20&lang=en`
- `GET /books/slug/:slug?lang=en`
- `GET /books/:id?lang=en`

Owned protected content:

- `GET /my-books/:bookFormatId/digital-url`
- `GET /my-books/:bookFormatId/audio-url`

Notes:

- Public cover and gallery image fields are normal relative `/uploads/...` URLs.
- Digital/audio book files are not public asset URLs.
- Always use the signed URL endpoints after purchase.

## Products Flow

Public catalog:

- `GET /product-categories?lang=en`
- `GET /products?page=1&limit=20&lang=en`
- `GET /products/slug/:slug?lang=en`
- `GET /products/:id?lang=en`

Useful query filters:

- `page`
- `limit`
- `lang`
- `categoryId`
- `search`
- `isFeatured`
- `isHomeDisplay`

Product image fields are public relative URLs and can be resolved against the API origin.

## Wishlist Flow

All wishlist routes require bearer auth:

- `POST /wishlist`
- `GET /wishlist?page=1&limit=20&itemType=COURSE`
- `GET /wishlist/check?itemType=COURSE&itemId=<uuid>`
- `DELETE /wishlist/:id`

Add body:

```json
{
  "itemType": "COURSE",
  "itemId": "<uuid>"
}
```

Valid item types:

- `COURSE`
- `BOOK`
- `PRODUCT`

## Cart Flow

All cart routes require bearer auth:

- `POST /cart/items`
- `GET /cart?currency=EGP`
- `PATCH /cart/items/:id`
- `DELETE /cart/items/:id`
- `DELETE /cart`
- `GET /cart/summary?currency=EGP`

Add body:

```json
{
  "itemType": "PRODUCT",
  "itemId": "<uuid>",
  "quantity": 1
}
```

Notes:

- For books, use `BookFormat.id` as `itemId`.
- Courses, digital books, and audio books should use quantity `1`.
- Cart response includes `data.cart` and `data.summary`.

## Orders Flow

All user order routes require bearer auth:

- `POST /orders`
- `GET /orders?page=1&limit=20`
- `GET /orders/:id`
- `PATCH /orders/:id/cancel`

Create body:

```json
{
  "shippingAddressId": "<uuid>",
  "notes": "Deliver after 5 PM.",
  "couponId": "<uuid>"
}
```

Notes:

- `shippingAddressId` is required when the cart contains physical products or physical books.
- User can read/cancel only their own orders.
- Order list response uses `data.items` and `data.pagination`.

## Coupons Flow

User routes:

- `POST /coupons/validate`
- `POST /coupons/apply`
- `DELETE /coupons/remove/:orderId`

Validate/apply body:

```json
{
  "code": "WELCOME10",
  "orderId": "<uuid>"
}
```

Frontend should display:

- `couponDiscountAmount`
- `totalAfterDiscount`
- order summary after apply/remove

## Payments Flow

Fawry:

- `POST /payments/fawry/create`
- `GET /payments/fawry/status/:orderId`
- `PATCH /payments/fawry/cancel/:orderId`

Create body:

```json
{
  "orderId": "<uuid>"
}
```

Fawry create response data:

```ts
{
  payment: Payment;
  referenceNumber: string | null;
  merchantRefNumber: string;
}
```

Frontend should show the Fawry reference number and follow the agreed Fawry UX. Backend config controls:

- `FAWRY_RETURN_URL`
- `FAWRY_NOTIFICATION_URL`

PayPal:

- `POST /payments/paypal/create`
- `GET /payments/paypal/status/:orderId`

PayPal create response data:

```ts
{
  payment: Payment;
  paypalOrderId: string;
  approvalUrl: string;
}
```

Frontend should redirect the user to `approvalUrl`. PayPal return/cancel URLs must be configured in the PayPal app/dashboard and frontend routing. The backend verifies final status through PayPal webhooks and status pull; frontend must not mark orders paid by itself.

Webhook routes are backend/provider only:

- `POST /payments/fawry/webhook`
- `POST /payments/paypal/webhook`

Do not call webhook routes from the frontend.

## File URL Rules

Public asset fields:

- Product cover/images.
- Book cover/gallery images.
- Course thumbnails or promo URLs when present.
- User profile image.

These are normal URLs or relative `/uploads/...` paths.

Protected content:

- Course video lessons.
- Course PDF lessons.
- Digital books.
- Audio books.
- Certificates.

These must be fetched through signed URL endpoints and should be treated as temporary.

## CORS

Production `CORS_ALLOWED_ORIGINS` should include exact origins only:

```env
CORS_ALLOWED_ORIGINS=https://<website-domain>,https://<dashboard-domain>
CORS_CREDENTIALS=true
```

Local frontend examples:

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174
CORS_CREDENTIALS=false
```

Rules:

- No wildcard `*` in production.
- Include protocol and port.
- Do not include trailing path segments.
- Add both website and admin dashboard domains.

## Admin API Separation

Admin APIs are under `/admin/...` and require admin bearer auth:

- `/admin/admins`
- `/admin/courses`
- `/admin/course-categories`
- `/admin/products`
- `/admin/product-categories`
- `/admin/articles`
- `/admin/article-categories`
- `/admin/article-tags`
- `/admin/orders`
- `/admin/coupons`
- `/admin/contact-us`
- `/admin/consultations`
- `/admin/consultation-categories`
- `/admin/governorates`
- `/admin/notifications/logs`
- `/admin/dashboard/...`
- `/admin/audit-logs`

Book admin writes are method-protected on public-looking paths:

- `POST /books`
- `PATCH /books/:id`
- `DELETE /books/:id`
- book image and format write routes
- book category write routes

Frontend admin code should keep these in the dashboard API client only.

## Swagger Notes

Swagger is available at `/api/docs` and `/api/docs-json` when `SWAGGER_ENABLED=true`. Production defaults to disabled unless explicitly enabled for a controlled environment.

Frontend-friendly strengths:

- Auth-protected controllers use bearer auth decorators.
- Most newly added modules include response DTOs.
- Validation decorators are reflected in request schemas.

Known Swagger gaps to improve later:

- Some older catalog/admin endpoints still document success responses with descriptions only rather than full response DTO classes.
- The runtime global response interceptor wraps all responses, but a few Swagger examples show only the inner service payload. Frontend should trust the global `success/message/data` envelope.
