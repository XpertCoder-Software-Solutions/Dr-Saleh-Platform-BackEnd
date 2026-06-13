# Dr. Saleh Platform API Bug Report And Recommendations

## Scope

This report covers the API testing pass artifacts and static route/security review performed from the NestJS controllers, DTOs, guards, and bootstrap configuration.

Live end-to-end mutation testing was not run against a real staging database during this pass. Payment webhook success cases also require provider-valid Fawry and PayPal signatures. The generated Postman collection and scenario checklist are ready for execution against a disposable local or staging environment.

## Current Status

- Route inventory reviewed across all controllers in `src/**`.
- Admin controllers are protected with `JwtAuthGuard` and `AdminGuard`.
- User-owned controllers require `JwtAuthGuard`.
- Public routes are limited to auth, catalog reads, contact/consultation submission, health, locations, certificate verification, course reviews read, and payment webhooks.
- Swagger is registered in [src/main.ts](../../src/main.ts).
- Protected book upload folders are denied before static upload serving in [src/main.ts](../../src/main.ts).
- The removed CloudFront development endpoint is absent from the controller inventory.

## Findings

### Medium: No Executed Full Staging API Run Yet

Affected areas:

- All modules listed in [full-api-test-checklist.md](./full-api-test-checklist.md)
- Payment webhooks in [src/payments/payments.controller.ts](../../src/payments/payments.controller.ts)
- PayPal webhooks in [src/payments/paypal-payments.controller.ts](../../src/payments/paypal-payments.controller.ts)

Details:

- The project has unit and limited e2e coverage, but a full seeded API pass requires a disposable DB, seeded admin/user accounts, provider sandbox credentials, and safe webhook fixtures.
- Provider-success webhook tests cannot be simulated by arbitrary unsigned Postman requests.

Recommended fix:

- Execute the generated collection against staging.
- Add a dedicated e2e suite with seeded test fixtures for auth, ownership, cart/order, progress, and admin guards.
- Add provider-sandbox webhook fixtures or mocked provider verification for deterministic CI tests.

### Fixed: Swagger Appears Public When App Is Running

Affected file:

- [src/main.ts](../../src/main.ts)

Details:

- Swagger is now controlled by `SWAGGER_ENABLED`.
- Development defaults to enabled; production defaults to disabled.

Recommended fix:

- Keep Swagger enabled for development/staging.
- Use `SWAGGER_ENABLED=true` only for controlled production/internal access.

### Medium: Password Policy Should Be Confirmed Against Product Requirements

Affected files:

- [src/auth/dto/register.dto.ts](../../src/auth/dto/register.dto.ts)
- [src/auth/dto/reset-password.dto.ts](../../src/auth/dto/reset-password.dto.ts)
- [src/users/dto/change-password.dto.ts](../../src/users/dto/change-password.dto.ts)
- [src/admin-management/dto/create-admin.dto.ts](../../src/admin-management/dto/create-admin.dto.ts)
- [src/admin-management/dto/update-admin.dto.ts](../../src/admin-management/dto/update-admin.dto.ts)

Details:

- DTOs enforce password presence and length, but the final product policy should decide whether to enforce mixed-case, number, symbol, and breached-password checks.

Recommended fix:

- Define a single password policy helper and reuse it across user registration, admin creation, reset, and change-password flows.

### Medium: File Upload Tests Need Magic-Byte Verification

Affected areas:

- User profile image upload in [src/users/users.controller.ts](../../src/users/users.controller.ts)
- Product image upload in [src/products/admin-product-images.controller.ts](../../src/products/admin-product-images.controller.ts)
- Book image/format uploads in [src/books/books.controller.ts](../../src/books/books.controller.ts)
- Storage helper in [src/common/storage/storage.service.ts](../../src/common/storage/storage.service.ts)

Details:

- The checklist covers MIME and size validation. A full staging test should also verify that renamed files with misleading extensions/MIME headers are rejected.

Recommended fix:

- Add magic-byte validation for image, PDF, and audio uploads before storage.

### Low: Access Tokens Remain Valid Until Expiration After Logout

Affected areas:

- Auth logout route in [src/auth/auth.controller.ts](../../src/auth/auth.controller.ts)
- Auth service in [src/auth/auth.service.ts](../../src/auth/auth.service.ts)

Details:

- Logout invalidates refresh-token state. Existing stateless access tokens usually remain valid until expiry unless a denylist or token-version strategy is added.

Recommended fix:

- Keep access token TTL short.
- Add token-version or denylist only if immediate access-token revocation is a product/security requirement.

### Low: Admin Manual Order Payment Status Requires Operational Policy Test

Affected file:

- [src/orders/admin-orders.controller.ts](../../src/orders/admin-orders.controller.ts)

Details:

- Admin status update is intentionally an admin operation. QA should confirm whether manually setting payment status to paid is allowed, and whether it should grant course/book access or only annotate order state.

Recommended fix:

- Define the operations policy for manual paid status.
- If manual paid status should grant content, add explicit service logic and tests.
- If not, document that access grants only happen through verified payment flows.

## Safe Fixes Applied During This Backend Hardening Phase

- Removed stale CloudFront development endpoint source files.
- Added admin guards to book, book image, book format, and book category write endpoints.
- Denied public static access to protected local book digital/audio folders.
- Sanitized error response paths to avoid query-string leakage.
- Rejected wildcard CORS origins in production env validation.
- Removed debug endpoints completely.

## Generated QA Artifacts

- [full-api-test-checklist.md](./full-api-test-checklist.md)
- [api-test-scenarios.md](./api-test-scenarios.md)
- [dr-saleh-platform.postman_collection.json](../postman/dr-saleh-platform.postman_collection.json)

## Recommended Next Tests To Automate

- Auth: register, verify, login, refresh, logout, password reset.
- Authorization: anonymous, normal user, and admin access checks for representative routes.
- Ownership: addresses, cart, orders, my-courses, progress, signed URLs.
- Payments: idempotent verified success/failure webhook handling with mocked provider verification.
- Progress: PDF completion, VIDEO completion, invalid percentage, course completion.
- CloudFront: signed URL generation and no direct S3 protected URL exposure.
