# Dr. Saleh Platform API Test Checklist

Generated for the full backend QA pass.

## Test Setup

- Use a disposable local or staging database. Do not run destructive admin, order, refund, or webhook tests against production data.
- Base URL: `http://localhost:3000/api` by default.
- Swagger UI: `GET /api/docs`.
- Swagger JSON: `GET /api/docs-json`.
- Required accounts:
  - Verified normal user.
  - Second verified normal user for ownership checks.
  - Admin user.
- Required seed content:
  - Active and inactive courses, sections, VIDEO lessons, PDF lessons.
  - Active and inactive books with digital and audio formats.
  - Active and inactive products with stock.
  - Article categories, tags, and articles.
  - Governorates and user addresses for shipping tests.
  - Pending EGP order for Fawry and pending USD order for PayPal.

## Global Checks

- Every JSON response follows the global envelope: `success`, `message`, and `data` or error details.
- Unknown fields in request DTOs return `400` because the global validation pipe uses `whitelist` and `forbidNonWhitelisted`.
- Invalid UUID route params return `400`.
- Missing bearer token returns `401` on protected routes.
- Normal user token returns `403` on admin routes.
- Pagination accepts valid `page` and `limit`, rejects invalid values, and caps `limit` where DTOs define a max.
- Date filters accept ISO date strings and reject invalid date strings.
- No response contains `passwordHash`, refresh token hashes, provider secrets, private S3 keys, or raw CloudFront private key material.

## Auth

Routes:

- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-email-verification`
- `POST /auth/login`
- `POST /auth/refresh-token`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Checks:

- Register succeeds with valid email, name, phone, and password.
- Register rejects duplicate email, invalid email, weak or too-short password, missing required fields, and extra fields.
- Email verification succeeds with a valid OTP and rejects expired, reused, invalid, or mismatched OTP.
- OTP resend is throttled and does not leak whether an email exists.
- Login succeeds only for verified, active users.
- Login rejects wrong password, disabled account, and unverified account.
- Refresh token endpoint rotates or validates refresh tokens according to current auth design.
- Logout invalidates refresh token state server-side.
- Password reset request is throttled and avoids account enumeration.
- Password reset completes with valid OTP and rejects expired, reused, invalid, or mismatched OTP.
- Password changed/reset events create notification and audit entries without exposing secrets.

## Users

Routes:

- `GET /users/profile`
- `PATCH /users/profile`
- `POST /users/change-password`
- `POST /users/profile-image`
- `DELETE /users/profile-image`

Checks:

- Profile returns only the current user and excludes password or token fields.
- Profile update accepts valid profile fields and rejects protected fields such as role, email verification, password hash, or arbitrary extra fields.
- Change password requires current password and rejects wrong current password.
- Profile image upload validates MIME type and size.
- Delete profile image is idempotent enough for a missing image or returns a clear not-found/conflict response.

## User Addresses

Routes:

- `GET /addresses`
- `GET /addresses/:id`
- `POST /addresses`
- `PATCH /addresses/:id`
- `DELETE /addresses/:id`

Checks:

- User can CRUD only their own addresses.
- Second user cannot read, update, or delete another user's address.
- Address creation validates governorate, phone, full address, and required shipping fields.
- Default address behavior is consistent if multiple addresses are created.

## Admin Management

Routes:

- `GET /admin/admins`
- `GET /admin/admins/:id`
- `POST /admin/admins`
- `PATCH /admin/admins/:id`

Checks:

- Admin routes require admin token.
- Normal user receives `403`.
- Public anonymous request receives `401`.
- Create admin validates email uniqueness and password rules.
- Update admin cannot remove the last active admin if that invariant is required.
- Responses exclude password hashes and refresh token data.
- Pagination and filters work.

## Courses And Lessons

Public routes:

- `GET /courses`
- `GET /courses/home`
- `GET /courses/featured`
- `GET /courses/:id`
- `GET /courses/:courseId/reviews`
- `POST /courses/:courseId/reviews`
- `GET /certificates/verify/:certificateNumber`

Admin routes:

- `POST /admin/course-categories`
- `GET /admin/course-categories`
- `GET /admin/course-categories/:id`
- `PATCH /admin/course-categories/:id`
- `DELETE /admin/course-categories/:id`
- `POST /admin/courses`
- `GET /admin/courses`
- `GET /admin/courses/:id`
- `PATCH /admin/courses/:id`
- `DELETE /admin/courses/:id`
- `POST /admin/courses/:courseId/sections`
- `GET /admin/courses/:courseId/sections`
- `PATCH /admin/sections/:id`
- `DELETE /admin/sections/:id`
- `POST /admin/sections/:sectionId/lessons`
- `GET /admin/sections/:sectionId/lessons`
- `PATCH /admin/lessons/:id`
- `DELETE /admin/lessons/:id`

Checks:

- Public catalog lists only active/published content.
- Course filters and pagination work.
- Admin CRUD validates prices, currency amounts, active flags, and category IDs.
- Lesson creation accepts VIDEO lessons with video fields and PDF lessons with PDF fields.
- Lesson media fields remain optional: VIDEO does not require `pdfKey`; PDF does not require `videoKey` or duration.
- Review creation requires ownership if that is the intended business rule.
- Review creation rejects duplicate review per user/course if that invariant exists.
- Admin writes create audit logs.

## My Courses And Progress

Routes:

- `GET /my-courses`
- `GET /my-courses/:courseId`
- `GET /my-courses/:courseId/progress`
- `GET /my-courses/:courseId/continue`
- `GET /my-courses/:courseId/lessons/:lessonId`
- `GET /my-courses/:courseId/lessons/:lessonId/video-url`
- `GET /my-courses/:courseId/lessons/:lessonId/pdf-url`
- `PATCH /my-courses/lessons/:lessonId/progress`
- `GET /my-certificates`
- `GET /my-certificates/:courseId`
- `GET /my-certificates/:courseId/signed-url`

Checks:

- User sees only owned courses.
- Second user cannot access course detail, lesson detail, progress, or protected URLs for unowned content.
- Progress rejects `completionPercentage < 0` and `completionPercentage > 100`.
- VIDEO progress records watched seconds, percentage, completion status, and last watched time.
- PDF completion sets completion percentage to `100` when user marks it completed.
- Lesson completion at `>= 90` marks the lesson complete.
- Course completion occurs only when all active lessons are complete.
- Continue endpoint returns the first incomplete lesson or the expected completion state.
- Protected VIDEO/PDF/certificate URLs are CloudFront signed URLs, not raw S3 protected URLs.

## Books

Public routes:

- `GET /book-categories`
- `GET /book-categories/:id`
- `GET /books`
- `GET /books/slug/:slug`
- `GET /books/:id`

Admin routes:

- `POST /book-categories`
- `PATCH /book-categories/:id`
- `DELETE /book-categories/:id`
- `POST /books`
- `PATCH /books/:id`
- `DELETE /books/:id`
- `POST /books/:id/images`
- `PATCH /books/images/:imageId`
- `DELETE /books/images/:imageId`
- `POST /books/:id/formats`
- `PATCH /books/formats/:formatId`
- `DELETE /books/formats/:formatId`

My book routes:

- `GET /my-books/:bookFormatId/digital-url`
- `GET /my-books/:bookFormatId/audio-url`

Checks:

- Public book/category reads show only allowed active content.
- Admin book/category/image/format writes require admin token.
- Normal user receives `403` for admin book writes.
- Uploads validate image/audio/PDF MIME types and max size.
- Purchased user can fetch signed digital/audio URL.
- Unpurchased user receives `403` or `404`.
- Protected upload folders for digital and audio content are not publicly served from `/uploads/books/digital` or `/uploads/books/audio`.

## Products

Public routes:

- `GET /product-categories`
- `GET /products`
- `GET /products/slug/:slug`
- `GET /products/:id`

Admin routes:

- `GET /admin/product-categories`
- `GET /admin/product-categories/:id`
- `POST /admin/product-categories`
- `PATCH /admin/product-categories/:id`
- `DELETE /admin/product-categories/:id`
- `GET /admin/products`
- `GET /admin/products/:id`
- `POST /admin/products`
- `PATCH /admin/products/:id`
- `DELETE /admin/products/:id`
- `POST /admin/products/:id/images`
- `PATCH /admin/products/images/:imageId`
- `DELETE /admin/products/images/:imageId`

Checks:

- Public products show only active catalog items.
- Filters for category, search, featured, home display, and active state behave as expected.
- Admin product create/update validates positive prices, stock, and image uploads.
- Cart/order flow rejects inactive or out-of-stock products.
- Admin writes create audit logs.

## Articles

Public routes:

- `GET /article-categories`
- `GET /article-tags`
- `GET /articles`
- `GET /articles/slug/:slug`
- `GET /articles/:id`

Admin routes:

- `GET /admin/article-categories`
- `GET /admin/article-categories/:id`
- `POST /admin/article-categories`
- `PATCH /admin/article-categories/:id`
- `DELETE /admin/article-categories/:id`
- `GET /admin/article-tags`
- `GET /admin/article-tags/:id`
- `POST /admin/article-tags`
- `PATCH /admin/article-tags/:id`
- `DELETE /admin/article-tags/:id`
- `GET /admin/articles`
- `GET /admin/articles/:id`
- `POST /admin/articles`
- `PATCH /admin/articles/:id`
- `DELETE /admin/articles/:id`

Checks:

- Public articles show active/published content only.
- Slug lookup returns not found for inactive/unpublished content.
- Admin article CRUD validates category and tag IDs.
- Admin writes create audit logs.

## Contact Us

Routes:

- `POST /contact-us`
- `GET /admin/contact-us`
- `GET /admin/contact-us/:id`
- `DELETE /admin/contact-us/:id`

Checks:

- Public contact submission validates email, name, subject/message length, and extra fields.
- Admin list supports pagination, filters, and date ranges.
- Admin read/delete require admin token.
- Submission triggers notification without blocking the main request if email fails.

## Consultations

Public routes:

- `GET /consultation-categories`
- `POST /consultations`

Admin routes:

- `GET /admin/consultation-categories`
- `GET /admin/consultation-categories/:id`
- `POST /admin/consultation-categories`
- `PATCH /admin/consultation-categories/:id`
- `DELETE /admin/consultation-categories/:id`
- `GET /admin/consultations`
- `GET /admin/consultations/:id`
- `DELETE /admin/consultations/:id`

Checks:

- Public request validates category, contact details, message length, and extra fields.
- Admin consultation category CRUD requires admin token.
- Admin list filters by status/category/date where supported.
- Consultation notifications are logged and failures do not break submission.

## Wishlist

Routes:

- `POST /wishlist`
- `GET /wishlist`
- `GET /wishlist/check`
- `DELETE /wishlist/:id`

Checks:

- Add course/book/product wishlist item with valid `itemType` and `itemId`.
- Duplicate item returns a clear conflict or idempotent success.
- Check route returns true/false for current user only.
- Delete route cannot delete another user's wishlist item.
- Pagination and item type filters work.

## Cart

Routes:

- `POST /cart/items`
- `GET /cart`
- `PATCH /cart/items/:id`
- `DELETE /cart/items/:id`
- `DELETE /cart`
- `GET /cart/summary`

Checks:

- Add products, courses, and books if supported by DTO/business logic.
- Quantity validation rejects zero, negative, non-integer, or unavailable quantities.
- User cannot update/delete another user's cart item.
- Cart summary totals match item prices, discounts, shipping, and coupons.
- Clearing cart affects only current user.

## Orders

User routes:

- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/cancel`

Admin routes:

- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id/status`

Checks:

- Create order from cart succeeds with valid shipping address/governorate when physical products exist.
- Create order rejects empty cart, inactive items, deleted items, insufficient stock, and invalid coupon.
- User can see/cancel only their own orders.
- Paid/shipped/delivered orders cannot be canceled by user unless explicitly allowed.
- Admin list filters by status/payment/date/currency where supported.
- Admin status update validates allowed enum values and creates audit logs.

## Payments - Fawry

Routes:

- `POST /payments/fawry/create`
- `POST /payments/fawry/webhook`
- `GET /payments/fawry/status/:orderId`
- `PATCH /payments/fawry/cancel/:orderId`

Checks:

- Create requires ownership of a pending EGP order.
- Create rejects paid, canceled, non-owned, or invalid orders.
- Webhook rejects invalid signature.
- Webhook accepts valid provider-signed payload, updates payment/order idempotently, and grants access only after verified success.
- Replaying the same successful webhook does not double-grant or duplicate side effects.
- Status endpoint verifies with Fawry and does not trust frontend-supplied payment status.
- Cancel rejects paid payments and non-owned orders.

## Payments - PayPal

Routes:

- `POST /payments/paypal/create`
- `POST /payments/paypal/webhook`
- `GET /payments/paypal/status/:orderId`

Checks:

- Create requires ownership of a pending USD order.
- Create rejects EGP orders, paid orders, canceled orders, and non-owned orders.
- Webhook rejects missing or invalid PayPal signature headers.
- Webhook accepts valid PayPal-verified events, updates idempotently, and grants access only after verified success.
- Status endpoint verifies with PayPal and does not trust frontend-supplied payment status.

## Coupons

User routes:

- `POST /coupons/validate`
- `POST /coupons/apply`
- `DELETE /coupons/remove/:orderId`

Admin routes:

- `POST /admin/coupons`
- `GET /admin/coupons`
- `GET /admin/coupons/:id`
- `PATCH /admin/coupons/:id`
- `DELETE /admin/coupons/:id`

Checks:

- Coupon validate/apply rejects inactive, expired, exceeded usage limit, wrong currency, or below-minimum-order coupons.
- User cannot apply coupons to another user's order.
- Remove coupon affects only owned pending order.
- Admin CRUD validates code uniqueness, discount values, currency, dates, and usage limits.

## Referral

User routes:

- `GET /referrals/my-code`
- `GET /referrals/my-referrals`
- `POST /referrals/apply-code`

Admin routes:

- `GET /admin/referrals`
- `GET /admin/referrals/:id`

Checks:

- User can fetch their own referral code.
- User cannot apply their own referral code.
- Referral code apply rejects invalid or already-applied codes.
- Admin list/detail requires admin token and supports pagination/filtering.

## Locations

Public routes:

- `GET /locations/countries`
- `GET /locations/countries/:countryId/cities`
- `GET /governorates`

Admin routes:

- `POST /admin/governorates`
- `GET /admin/governorates`
- `GET /admin/governorates/:id`
- `PATCH /admin/governorates/:id`
- `DELETE /admin/governorates/:id`

Checks:

- Public location reads return active records and expected sort order.
- Invalid country ID returns validation/not-found response.
- Admin governorate CRUD validates shipping fees and active flag.

## Notifications

Routes:

- `GET /admin/notifications/logs`

Checks:

- Admin only.
- Filters work for `type`, `status`, `email`, `dateFrom`, and `dateTo`.
- Pagination works.
- Failed notifications do not expose sensitive SMTP/Brevo secrets.

## Dashboard

Routes:

- `GET /admin/dashboard/overview`
- `GET /admin/dashboard/revenue`
- `GET /admin/dashboard/orders`
- `GET /admin/dashboard/users`
- `GET /admin/dashboard/content`

Checks:

- Admin only.
- Overview counts match database seed.
- Revenue grouping works for `daily`, `weekly`, `monthly`, and `yearly`.
- Revenue currency filter works for `EGP` and `USD`.
- Orders dashboard does not expose sensitive user data.
- Content stats count active and home-displayed records correctly.

## Audit Logs

Routes:

- `GET /admin/audit-logs`
- `GET /admin/audit-logs/:id`

Checks:

- Admin only.
- Pagination and filters work for actor, action, entity type, entity ID, and date range.
- Write/security/payment actions create audit logs.
- Audit metadata excludes passwords, token values, payment secrets, card data, API keys, and private key material.

## CloudFront Protected Content

Routes:

- `GET /my-courses/:courseId/lessons/:lessonId/video-url`
- `GET /my-courses/:courseId/lessons/:lessonId/pdf-url`
- `GET /my-books/:bookFormatId/digital-url`
- `GET /my-books/:bookFormatId/audio-url`
- `GET /my-certificates/:courseId/signed-url`

Checks:

- Owned content returns a signed CloudFront URL.
- Unowned content returns `403` or `404`.
- Inactive/deleted content does not return signed URLs.
- URLs expire according to configured TTL.
- URL host is the configured CloudFront domain.
- Response does not expose raw S3 protected URLs.
- No development-only CloudFront route is exposed in Swagger or the controller inventory.
