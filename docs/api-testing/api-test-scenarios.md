# Dr. Saleh Platform API Test Scenarios

## Execution Notes

- Use the Postman collection in `docs/postman/dr-saleh-platform.postman_collection.json`.
- Run tests in this order: auth, seed/admin setup, catalog, cart/order, payment, ownership checks, admin analytics, audit/notification logs.
- Webhook scenarios require provider-valid signatures. Unsigned webhook requests in Postman are intentionally expected to fail.
- For ownership checks, use two separate normal users: `userA` and `userB`.

## Scenario 1: User Registration And Verification

1. Register `userA`.
2. Attempt login before verification.
3. Verify email with valid OTP.
4. Login and store access and refresh tokens.
5. Refresh token.
6. Logout.
7. Confirm refresh token cannot be reused after logout.

Expected:

- Unverified login is rejected.
- Verified login succeeds.
- Logout invalidates server-side refresh state.
- Audit logs are created for login/logout/email verification.
- Notification logs are created for verification OTP.

## Scenario 2: Password Reset And Password Change

1. Request password reset for `userA`.
2. Complete reset with valid OTP.
3. Login with old password.
4. Login with new password.
5. Change password from authenticated profile.
6. Repeat reset request rapidly to validate throttling.

Expected:

- Old password stops working after reset/change.
- Password reset OTP is single-use and expires.
- Throttled resend/reset endpoints return a clean throttle response.
- Password and OTP values are never returned in API responses or logs.

## Scenario 3: Admin Access Control

1. Call `GET /admin/dashboard/overview` without a token.
2. Call it with a normal user token.
3. Call it with an admin token.
4. Repeat for `POST /admin/courses`, `POST /admin/products`, `POST /admin/admins`, and `GET /admin/audit-logs`.

Expected:

- Anonymous request returns `401`.
- Normal user returns `403`.
- Admin succeeds.

## Scenario 4: Course VIDEO And PDF Lesson Lifecycle

1. Admin creates course category.
2. Admin creates active course.
3. Admin creates section.
4. Admin creates VIDEO lesson with `videoKey` and `videoDurationSeconds`.
5. Admin creates PDF lesson with `pdfKey`.
6. Admin creates VIDEO lesson without `pdfKey`.
7. Admin creates PDF lesson without `videoKey` and `videoDurationSeconds`.
8. Public course detail returns only expected public lesson metadata.

Expected:

- VIDEO/PDF nullable media fields work.
- Admin writes create audit logs.
- Invalid lesson type/media combinations return validation or business-rule errors.

## Scenario 5: Course Purchase And Progress

1. Add course to cart.
2. Create order.
3. Complete payment through a verified webhook or controlled test payment flow.
4. Fetch `/my-courses`.
5. Fetch lesson detail for the purchased course.
6. Update VIDEO progress to `50`.
7. Update VIDEO progress to `90`.
8. Mark PDF completed.
9. Fetch course progress and continue endpoint.
10. Complete all active lessons.

Expected:

- Course access is granted only after verified paid status.
- Progress rejects values outside `0..100`.
- VIDEO progress at `90` marks complete.
- PDF completion sets percentage to `100`.
- Course completion becomes true only when all active lessons are complete.

## Scenario 6: Course Ownership Boundary

1. `userA` purchases a course.
2. `userB` calls `GET /my-courses/:courseId`.
3. `userB` calls `GET /my-courses/:courseId/lessons/:lessonId/video-url`.
4. `userB` calls `PATCH /my-courses/lessons/:lessonId/progress`.

Expected:

- `userB` receives `403` or `404`.
- No progress record is created for `userB`.
- No signed URL is returned.

## Scenario 7: Book Protected Content

1. Admin creates book category and book.
2. Admin uploads public book image.
3. Admin creates digital format with protected key.
4. Admin creates audio format with protected key.
5. `userA` purchases book format.
6. `userA` fetches digital and audio signed URLs.
7. `userB` attempts the same URLs.
8. Request `/uploads/books/digital/<known-file>` and `/uploads/books/audio/<known-file>`.

Expected:

- Purchased user receives CloudFront signed URL.
- Unpurchased user receives `403` or `404`.
- Protected local upload paths return `404`.
- Signed URL host is CloudFront, not S3.

## Scenario 8: Product Cart And Order

1. Admin creates product category and product with stock.
2. `userA` adds product to cart.
3. Update quantity.
4. Fetch cart summary.
5. Create order with valid address.
6. Attempt to create order with another user's address.
7. Attempt quantity greater than stock.
8. Cancel pending order.

Expected:

- Summary totals match products, shipping, and discounts.
- Ownership checks prevent address/order abuse.
- Stock and quantity validations hold.
- Pending cancel succeeds; paid cancel is rejected if not allowed.

## Scenario 9: Coupons

1. Admin creates percent coupon.
2. Admin creates fixed-value coupon.
3. Validate coupon against an eligible pending order.
4. Apply coupon.
5. Remove coupon.
6. Test expired coupon.
7. Test below-minimum order coupon.
8. Test wrong-currency coupon.
9. Test usage limit.

Expected:

- Coupon math is correct.
- Invalid coupon cases return clear `400`, `404`, or `409`.
- User cannot apply or remove coupons on another user's order.

## Scenario 10: Fawry Payment

1. Create pending EGP order.
2. Create Fawry payment.
3. Re-create Fawry payment for the same pending order.
4. Pull payment status.
5. Send invalid webhook signature.
6. Send valid success webhook from test fixture/provider.
7. Replay the valid webhook.
8. Attempt to cancel after payment success.

Expected:

- Duplicate create is idempotent or clearly conflicts according to service design.
- Invalid webhook returns `403`.
- Valid webhook grants access exactly once.
- Replay does not duplicate access, notifications, or audit side effects.
- Paid payment cannot be canceled.

## Scenario 11: PayPal Payment

1. Create pending USD order.
2. Create PayPal order.
3. Try PayPal create for EGP order.
4. Pull PayPal status.
5. Send webhook without PayPal signature headers.
6. Send valid PayPal webhook from sandbox/provider.
7. Replay valid webhook.

Expected:

- EGP order is rejected for PayPal.
- Missing/invalid webhook verification returns `403`.
- Valid webhook grants access exactly once.
- Status is provider-verified.

## Scenario 12: Contact And Consultation Notifications

1. Submit contact message.
2. Submit consultation request.
3. Fetch admin contact/consultation lists.
4. Fetch admin notification logs filtered by type/status/email.
5. Simulate email provider failure in a safe environment.

Expected:

- Submissions succeed with valid data.
- Admin lists show records.
- Notification failures are logged as failed but do not break the primary request.
- Logs do not include Brevo/API secrets.

## Scenario 13: Admin Dashboard

1. Capture known seed counts.
2. Call overview dashboard.
3. Call revenue with `daily`, `weekly`, `monthly`, `yearly`.
4. Call revenue with `EGP` and `USD`.
5. Call orders/users/content dashboards.

Expected:

- Counts and grouped totals match seed database.
- Invalid period/currency returns `400`.
- Responses do not expose sensitive user fields.

## Scenario 14: Audit Logs

1. Perform admin course create/update/delete.
2. Perform admin product create/update/delete.
3. Perform auth login/password reset.
4. Perform payment success/failure flow.
5. Fetch audit logs with filters.
6. Fetch audit log detail.

Expected:

- Write, security, and payment actions are logged.
- Read actions are not over-logged.
- Metadata is sanitized.
- Audit logging failure does not break primary business flow.

## Scenario 15: Input Validation And Error Shape

1. Send extra unknown field to representative DTOs.
2. Send invalid UUID route params.
3. Send invalid pagination values.
4. Send invalid date filters.
5. Upload disallowed file type.
6. Upload oversized file.

Expected:

- `400` for validation issues.
- Error response contains safe message, method, path, status, and timestamp.
- Production responses do not include stack traces.

## Scenario 16: Swagger And Health

1. Fetch `GET /api/docs`.
2. Fetch `GET /api/docs-json`.
3. Fetch `GET /api/health`.
4. Confirm protected admin endpoints appear in Swagger with bearer auth.

Expected:

- Swagger UI loads.
- Swagger JSON parses.
- Health endpoint returns healthy DB status if DB is available.
- Swagger does not expose secrets or private env values.
