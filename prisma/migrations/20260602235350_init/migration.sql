-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('Admin', 'User');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'LOGIN', 'PASSWORD_RESET', 'CHANGE_EMAIL');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EGP', 'USD');

-- CreateEnum
CREATE TYPE "BookFormatType" AS ENUM ('PHYSICAL', 'DIGITAL', 'AUDIO');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('Fawry', 'PayPal', 'InternationalCard');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "WishlistItemType" AS ENUM ('COURSE', 'BOOK', 'PRODUCT');

-- CreateEnum
CREATE TYPE "OrderItemType" AS ENUM ('COURSE', 'BOOK', 'PRODUCT');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('Mobile', 'Tablet', 'Desktop');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('CourseVideo', 'DigitalBook', 'AudioBook');

-- CreateEnum
CREATE TYPE "ConsultationGender" AS ENUM ('Male', 'Female');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "profileImage" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "shippingGovernorateId" UUID,
    "label" TEXT,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'EG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_otps" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userDeviceId" UUID,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "deviceName" TEXT,
    "pushToken" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "userDeviceId" UUID NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "courseVideoId" UUID,
    "bookFormatId" UUID,
    "sessionKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_categories" (
    "id" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "courseCategoryId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "shortDescriptionAr" TEXT NOT NULL,
    "shortDescriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "promoVideo" TEXT,
    "priceEgp" DECIMAL(12,2) NOT NULL,
    "priceUsd" DECIMAL(12,2) NOT NULL,
    "discountPriceEgp" DECIMAL(12,2),
    "discountPriceUsd" DECIMAL(12,2),
    "isRibbon" BOOLEAN NOT NULL DEFAULT false,
    "ribbonText" TEXT,
    "ribbonColor" TEXT,
    "isHomeDisplay" BOOLEAN NOT NULL DEFAULT false,
    "isDisplayed" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "numberOfLessons" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculums" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_videos" (
    "id" UUID NOT NULL,
    "curriculumId" UUID NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "videoUrl" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "orderItemId" UUID,
    "progressPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_progress" (
    "id" UUID NOT NULL,
    "courseEnrollmentId" UUID NOT NULL,
    "courseVideoId" UUID NOT NULL,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "lastWatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_reviews" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "courseEnrollmentId" UUID NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "fileUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_categories" (
    "id" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "bookCategoryId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL,
    "priceEgp" DECIMAL(12,2) NOT NULL,
    "priceUsd" DECIMAL(12,2) NOT NULL,
    "discountPriceEgp" DECIMAL(12,2),
    "discountPriceUsd" DECIMAL(12,2),
    "isHomeDisplay" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_formats" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "formatType" "BookFormatType" NOT NULL,
    "sku" TEXT,
    "stock" INTEGER,
    "fileUrl" TEXT,
    "sampleUrl" TEXT,
    "pagesCount" INTEGER,
    "durationMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_reviews" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "productCategoryId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stock" INTEGER NOT NULL DEFAULT 0,
    "priceEgp" DECIMAL(12,2) NOT NULL,
    "priceUsd" DECIMAL(12,2) NOT NULL,
    "discountPriceEgp" DECIMAL(12,2),
    "discountPriceUsd" DECIMAL(12,2),
    "isHomeDisplay" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "itemType" "OrderItemType" NOT NULL,
    "courseId" UUID,
    "bookFormatId" UUID,
    "productId" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "currency" "Currency" NOT NULL,
    "couponId" UUID,
    "shippingGovernorateId" UUID,
    "shippingAddressId" UUID,
    "shippingFullName" TEXT,
    "shippingPhoneNumber" TEXT,
    "shippingAddressLine1" TEXT,
    "shippingAddressLine2" TEXT,
    "shippingCity" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "couponDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "itemType" "OrderItemType" NOT NULL,
    "courseId" UUID,
    "bookFormatId" UUID,
    "productId" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discountUnitPrice" DECIMAL(12,2),
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_governorates" (
    "id" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shippingCost" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_governorates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "providerResponse" JSONB,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "paymentTransactionId" UUID NOT NULL,
    "refundReference" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "couponType" "CouponType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "currency" "Currency",
    "minimumOrderAmount" DECIMAL(12,2),
    "maximumDiscountAmount" DECIMAL(12,2),
    "usageLimit" INTEGER,
    "usagePerUserLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrerUserId" UUID NOT NULL,
    "referredUserId" UUID NOT NULL,
    "isRewardGranted" BOOLEAN NOT NULL DEFAULT false,
    "rewardGrantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "itemType" "WishlistItemType" NOT NULL,
    "courseId" UUID,
    "bookId" UUID,
    "productId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_categories" (
    "id" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "articleCategoryId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "excerptAr" TEXT,
    "excerptEn" TEXT,
    "contentAr" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "coverImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_tags" (
    "id" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_article_tags" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "articleTagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_article_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_categories" (
    "id" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_requests" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "consultationCategoryId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "ConsultationGender" NOT NULL,
    "country" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "user_addresses_userId_idx" ON "user_addresses"("userId");

-- CreateIndex
CREATE INDEX "user_addresses_shippingGovernorateId_idx" ON "user_addresses"("shippingGovernorateId");

-- CreateIndex
CREATE INDEX "email_otps_userId_idx" ON "email_otps"("userId");

-- CreateIndex
CREATE INDEX "email_otps_email_purpose_idx" ON "email_otps"("email", "purpose");

-- CreateIndex
CREATE INDEX "email_otps_email_purpose_expiresAt_idx" ON "email_otps"("email", "purpose", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userDeviceId_idx" ON "refresh_tokens"("userDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_userId_deviceIdentifier_key" ON "user_devices"("userId", "deviceIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "content_sessions_sessionKey_key" ON "content_sessions"("sessionKey");

-- CreateIndex
CREATE INDEX "content_sessions_userId_idx" ON "content_sessions"("userId");

-- CreateIndex
CREATE INDEX "content_sessions_userDeviceId_idx" ON "content_sessions"("userDeviceId");

-- CreateIndex
CREATE INDEX "content_sessions_courseVideoId_idx" ON "content_sessions"("courseVideoId");

-- CreateIndex
CREATE INDEX "content_sessions_bookFormatId_idx" ON "content_sessions"("bookFormatId");

-- CreateIndex
CREATE INDEX "content_sessions_userId_isActive_idx" ON "content_sessions"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "course_categories_slug_key" ON "course_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_courseCategoryId_idx" ON "courses"("courseCategoryId");

-- CreateIndex
CREATE INDEX "courses_isActive_isDisplayed_idx" ON "courses"("isActive", "isDisplayed");

-- CreateIndex
CREATE INDEX "courses_isHomeDisplay_idx" ON "courses"("isHomeDisplay");

-- CreateIndex
CREATE INDEX "curriculums_courseId_idx" ON "curriculums"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "curriculums_courseId_position_key" ON "curriculums"("courseId", "position");

-- CreateIndex
CREATE INDEX "course_videos_curriculumId_idx" ON "course_videos"("curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "course_videos_curriculumId_position_key" ON "course_videos"("curriculumId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_orderItemId_key" ON "course_enrollments"("orderItemId");

-- CreateIndex
CREATE INDEX "course_enrollments_userId_idx" ON "course_enrollments"("userId");

-- CreateIndex
CREATE INDEX "course_enrollments_courseId_idx" ON "course_enrollments"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_userId_courseId_key" ON "course_enrollments"("userId", "courseId");

-- CreateIndex
CREATE INDEX "course_progress_courseEnrollmentId_idx" ON "course_progress"("courseEnrollmentId");

-- CreateIndex
CREATE INDEX "course_progress_courseVideoId_idx" ON "course_progress"("courseVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "course_progress_courseEnrollmentId_courseVideoId_key" ON "course_progress"("courseEnrollmentId", "courseVideoId");

-- CreateIndex
CREATE INDEX "course_reviews_userId_idx" ON "course_reviews"("userId");

-- CreateIndex
CREATE INDEX "course_reviews_courseId_idx" ON "course_reviews"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_reviews_userId_courseId_key" ON "course_reviews"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_courseEnrollmentId_key" ON "certificates"("courseEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateNumber_key" ON "certificates"("certificateNumber");

-- CreateIndex
CREATE INDEX "certificates_userId_idx" ON "certificates"("userId");

-- CreateIndex
CREATE INDEX "certificates_courseId_idx" ON "certificates"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "book_categories_slug_key" ON "book_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");

-- CreateIndex
CREATE INDEX "books_bookCategoryId_idx" ON "books"("bookCategoryId");

-- CreateIndex
CREATE INDEX "books_isHomeDisplay_idx" ON "books"("isHomeDisplay");

-- CreateIndex
CREATE UNIQUE INDEX "book_formats_sku_key" ON "book_formats"("sku");

-- CreateIndex
CREATE INDEX "book_formats_bookId_idx" ON "book_formats"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "book_formats_bookId_formatType_key" ON "book_formats"("bookId", "formatType");

-- CreateIndex
CREATE INDEX "book_reviews_userId_idx" ON "book_reviews"("userId");

-- CreateIndex
CREATE INDEX "book_reviews_bookId_idx" ON "book_reviews"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "book_reviews_userId_bookId_key" ON "book_reviews"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_productCategoryId_idx" ON "products"("productCategoryId");

-- CreateIndex
CREATE INDEX "products_isHomeDisplay_idx" ON "products"("isHomeDisplay");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE INDEX "cart_items_courseId_idx" ON "cart_items"("courseId");

-- CreateIndex
CREATE INDEX "cart_items_bookFormatId_idx" ON "cart_items"("bookFormatId");

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_courseId_key" ON "cart_items"("cartId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_bookFormatId_key" ON "cart_items"("cartId", "bookFormatId");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cartId_productId_key" ON "cart_items"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_couponId_idx" ON "orders"("couponId");

-- CreateIndex
CREATE INDEX "orders_shippingGovernorateId_idx" ON "orders"("shippingGovernorateId");

-- CreateIndex
CREATE INDEX "orders_shippingAddressId_idx" ON "orders"("shippingAddressId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_courseId_idx" ON "order_items"("courseId");

-- CreateIndex
CREATE INDEX "order_items_bookFormatId_idx" ON "order_items"("bookFormatId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_courseId_key" ON "order_items"("orderId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_bookFormatId_key" ON "order_items"("orderId", "bookFormatId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_productId_key" ON "order_items"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_governorates_slug_key" ON "shipping_governorates"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_transactionReference_key" ON "payment_transactions"("transactionReference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_providerTransactionId_key" ON "payment_transactions"("providerTransactionId");

-- CreateIndex
CREATE INDEX "payment_transactions_orderId_idx" ON "payment_transactions"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refundReference_key" ON "refunds"("refundReference");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_providerRefundId_key" ON "refunds"("providerRefundId");

-- CreateIndex
CREATE INDEX "refunds_orderId_idx" ON "refunds"("orderId");

-- CreateIndex
CREATE INDEX "refunds_paymentTransactionId_idx" ON "refunds"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_isActive_idx" ON "coupons"("code", "isActive");

-- CreateIndex
CREATE INDEX "coupons_startsAt_expiresAt_idx" ON "coupons"("startsAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usages_orderId_key" ON "coupon_usages"("orderId");

-- CreateIndex
CREATE INDEX "coupon_usages_couponId_idx" ON "coupon_usages"("couponId");

-- CreateIndex
CREATE INDEX "coupon_usages_userId_idx" ON "coupon_usages"("userId");

-- CreateIndex
CREATE INDEX "coupon_usages_userId_couponId_idx" ON "coupon_usages"("userId", "couponId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredUserId_key" ON "referrals"("referredUserId");

-- CreateIndex
CREATE INDEX "referrals_referrerUserId_idx" ON "referrals"("referrerUserId");

-- CreateIndex
CREATE INDEX "wishlist_items_userId_idx" ON "wishlist_items"("userId");

-- CreateIndex
CREATE INDEX "wishlist_items_courseId_idx" ON "wishlist_items"("courseId");

-- CreateIndex
CREATE INDEX "wishlist_items_bookId_idx" ON "wishlist_items"("bookId");

-- CreateIndex
CREATE INDEX "wishlist_items_productId_idx" ON "wishlist_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_courseId_key" ON "wishlist_items"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_bookId_key" ON "wishlist_items"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_productId_key" ON "wishlist_items"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_articleCategoryId_idx" ON "articles"("articleCategoryId");

-- CreateIndex
CREATE INDEX "articles_isPublished_isActive_idx" ON "articles"("isPublished", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "article_tags_slug_key" ON "article_tags"("slug");

-- CreateIndex
CREATE INDEX "article_article_tags_articleId_idx" ON "article_article_tags"("articleId");

-- CreateIndex
CREATE INDEX "article_article_tags_articleTagId_idx" ON "article_article_tags"("articleTagId");

-- CreateIndex
CREATE UNIQUE INDEX "article_article_tags_articleId_articleTagId_key" ON "article_article_tags"("articleId", "articleTagId");

-- CreateIndex
CREATE INDEX "consultation_requests_userId_idx" ON "consultation_requests"("userId");

-- CreateIndex
CREATE INDEX "consultation_requests_consultationCategoryId_idx" ON "consultation_requests"("consultationCategoryId");

-- CreateIndex
CREATE INDEX "consultation_requests_phone_idx" ON "consultation_requests"("phone");

-- CreateIndex
CREATE INDEX "consultation_requests_whatsapp_idx" ON "consultation_requests"("whatsapp");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_shippingGovernorateId_fkey" FOREIGN KEY ("shippingGovernorateId") REFERENCES "shipping_governorates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_otps" ADD CONSTRAINT "email_otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userDeviceId_fkey" FOREIGN KEY ("userDeviceId") REFERENCES "user_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sessions" ADD CONSTRAINT "content_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sessions" ADD CONSTRAINT "content_sessions_userDeviceId_fkey" FOREIGN KEY ("userDeviceId") REFERENCES "user_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sessions" ADD CONSTRAINT "content_sessions_courseVideoId_fkey" FOREIGN KEY ("courseVideoId") REFERENCES "course_videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sessions" ADD CONSTRAINT "content_sessions_bookFormatId_fkey" FOREIGN KEY ("bookFormatId") REFERENCES "book_formats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_courseCategoryId_fkey" FOREIGN KEY ("courseCategoryId") REFERENCES "course_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculums" ADD CONSTRAINT "curriculums_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_videos" ADD CONSTRAINT "course_videos_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curriculums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_courseEnrollmentId_fkey" FOREIGN KEY ("courseEnrollmentId") REFERENCES "course_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_courseVideoId_fkey" FOREIGN KEY ("courseVideoId") REFERENCES "course_videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseEnrollmentId_fkey" FOREIGN KEY ("courseEnrollmentId") REFERENCES "course_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_bookCategoryId_fkey" FOREIGN KEY ("bookCategoryId") REFERENCES "book_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_formats" ADD CONSTRAINT "book_formats_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_reviews" ADD CONSTRAINT "book_reviews_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_bookFormatId_fkey" FOREIGN KEY ("bookFormatId") REFERENCES "book_formats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingGovernorateId_fkey" FOREIGN KEY ("shippingGovernorateId") REFERENCES "shipping_governorates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "user_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_bookFormatId_fkey" FOREIGN KEY ("bookFormatId") REFERENCES "book_formats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_articleCategoryId_fkey" FOREIGN KEY ("articleCategoryId") REFERENCES "article_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_article_tags" ADD CONSTRAINT "article_article_tags_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_article_tags" ADD CONSTRAINT "article_article_tags_articleTagId_fkey" FOREIGN KEY ("articleTagId") REFERENCES "article_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_consultationCategoryId_fkey" FOREIGN KEY ("consultationCategoryId") REFERENCES "consultation_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
