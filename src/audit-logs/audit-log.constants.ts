export const AuditActions = {
  AdminCreated: 'ADMIN_CREATED',
  AdminUpdated: 'ADMIN_UPDATED',
  ArticleCreated: 'ARTICLE_CREATED',
  ArticleDeleted: 'ARTICLE_DELETED',
  ArticleUpdated: 'ARTICLE_UPDATED',
  BookCreated: 'BOOK_CREATED',
  BookDeleted: 'BOOK_DELETED',
  BookUpdated: 'BOOK_UPDATED',
  CouponCreated: 'COUPON_CREATED',
  CouponDeleted: 'COUPON_DELETED',
  CouponUpdated: 'COUPON_UPDATED',
  CourseCreated: 'COURSE_CREATED',
  CourseDeleted: 'COURSE_DELETED',
  CourseUpdated: 'COURSE_UPDATED',
  OrderStatusUpdated: 'ORDER_STATUS_UPDATED',
  PasswordChanged: 'PASSWORD_CHANGED',
  PasswordResetCompleted: 'PASSWORD_RESET_COMPLETED',
  PasswordResetRequested: 'PASSWORD_RESET_REQUESTED',
  PaymentCreated: 'PAYMENT_CREATED',
  PaymentFailed: 'PAYMENT_FAILED',
  PaymentRefunded: 'PAYMENT_REFUNDED',
  PaymentSuccess: 'PAYMENT_SUCCESS',
  ProductCreated: 'PRODUCT_CREATED',
  ProductDeleted: 'PRODUCT_DELETED',
  ProductUpdated: 'PRODUCT_UPDATED',
  RefundProcessed: 'REFUND_PROCESSED',
  UserEmailVerified: 'USER_EMAIL_VERIFIED',
  UserLogin: 'USER_LOGIN',
  UserLogout: 'USER_LOGOUT',
} as const;

export const AuditEntityTypes = {
  Admin: 'Admin',
  Article: 'Article',
  AuditLog: 'AuditLog',
  Book: 'Book',
  Coupon: 'Coupon',
  Course: 'Course',
  Order: 'Order',
  Payment: 'Payment',
  Product: 'Product',
  User: 'User',
} as const;

export type AuditActionName = (typeof AuditActions)[keyof typeof AuditActions];

export type AuditEntityType =
  (typeof AuditEntityTypes)[keyof typeof AuditEntityTypes];
