export type UUID = string;
export type DateTimeString = string;
export type Money = number;
export type Currency = 'EGP' | 'USD';
export type Lang = 'ar' | 'en';

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  timestamp: DateTimeString;
  path: string;
  errors: unknown[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<TItem> {
  pagination: Pagination;
  // Narrow this in feature-specific response types, for example:
  // CourseListData uses `courses`, OrderListData uses `items`.
  [key: string]: TItem[] | Pagination;
}

export interface SignedUrl {
  url: string;
  expiresAt: DateTimeString;
}

export interface User {
  id: UUID;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage?: string | null;
  role?: 'User' | 'Admin' | string;
  referralCode?: string | null;
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: DateTimeString | null;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

export interface AuthUser {
  id: UUID;
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  role: 'User' | 'Admin' | string;
}

export interface LoginData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshTokenData {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  user: Pick<
    User,
    'id' | 'fullName' | 'email' | 'phoneNumber' | 'referralCode' | 'isEmailVerified'
  >;
}

export interface Category {
  id: UUID;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  isActive?: boolean;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

export interface CourseSummary {
  id: UUID;
  categoryId: UUID;
  titleAr: string;
  titleEn: string;
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  thumbnailImage?: string | null;
  promoVideoUrl?: string | null;
  priceEGP: Money;
  priceUSD: Money;
  discountPriceEGP?: Money | null;
  discountPriceUSD?: Money | null;
  certificateEnabled?: boolean;
  isFeatured: boolean;
  isHomeDisplay: boolean;
  isActive: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  category?: Category | null;
}

export type LessonType = 'VIDEO' | 'PDF';

export interface Lesson {
  id: UUID;
  sectionId: UUID;
  titleAr: string;
  titleEn: string;
  lessonType: LessonType;
  sortOrder: number;
  videoKey?: string | null;
  videoDurationSeconds?: number | null;
  pdfKey?: string | null;
  isActive: boolean;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
  progress?: LessonProgress | null;
}

export interface CourseSection {
  id: UUID;
  courseId: UUID;
  titleAr: string;
  titleEn: string;
  sortOrder: number;
  isActive: boolean;
  lessons?: Lesson[];
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

export interface Course extends CourseSummary {
  sections?: CourseSection[];
}

export interface LessonProgress {
  lessonId: UUID;
  watchedSeconds?: number | null;
  completionPercentage: number;
  isCompleted: boolean;
  lastWatchedAt?: DateTimeString | null;
}

export interface CourseProgress {
  courseId: UUID;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  isCompleted: boolean;
}

export interface ContinueLesson {
  lessonId: UUID;
  sectionId: UUID;
  lessonType: LessonType;
  titleAr: string;
  titleEn: string;
  completionPercentage: number;
}

export interface CourseListData {
  courses: CourseSummary[];
  pagination: Pagination;
}

export type BookFormatType = 'Physical' | 'Digital' | 'Audio';

export interface BookImage {
  id: UUID;
  bookId: UUID;
  imageUrl: string;
  displayOrder: number;
  createdAt: DateTimeString;
}

export interface BookFormat {
  id: UUID;
  bookId: UUID;
  formatType: BookFormatType;
  sku?: string | null;
  stock?: number | null;
  weight?: number | null;
  priceEGP?: Money | null;
  discountPriceEGP?: Money | null;
  priceUSD?: Money | null;
  discountPriceUSD?: Money | null;
  readerFile?: string | null;
  audioFile?: string | null;
  audioDuration?: number | null;
  isActive: boolean;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

export interface Book {
  id: UUID;
  categoryId: UUID;
  titleAr: string;
  titleEn: string;
  slug: string;
  descriptionAr: string;
  descriptionEn: string;
  coverImage: string | null;
  priceEGP: Money;
  discountPriceEGP: Money | null;
  priceUSD: Money;
  discountPriceUSD: Money | null;
  isFeatured: boolean;
  isHomeDisplay: boolean;
  isActive: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  category?: Category | null;
  images: BookImage[];
  formats: BookFormat[];
}

export interface ProductImage {
  id: UUID;
  productId: UUID;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt?: DateTimeString;
  updatedAt?: DateTimeString;
}

export interface Product {
  id: UUID;
  categoryId: UUID;
  nameAr: string;
  nameEn: string;
  slug: string;
  shortDescriptionAr?: string | null;
  shortDescriptionEn?: string | null;
  descriptionAr: string;
  descriptionEn: string;
  coverImage?: string | null;
  priceEGP: Money;
  discountPriceEGP?: Money | null;
  priceUSD: Money;
  discountPriceUSD?: Money | null;
  stock: number;
  sku?: string | null;
  isFeatured: boolean;
  isHomeDisplay: boolean;
  isActive: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  category?: Category | null;
  images?: ProductImage[];
}

export interface ProductListData {
  products: Product[];
  pagination: Pagination;
}

export type CartItemType = 'COURSE' | 'BOOK' | 'PRODUCT';

export interface CartCatalogItem {
  id: UUID;
  itemType: CartItemType;
  slug?: string;
  sku?: string | null;
  formatType?: BookFormatType;
  bookId?: UUID;
  nameAr: string;
  nameEn: string;
  image: string | null;
  priceEGP: Money;
  discountPriceEGP: Money | null;
  priceUSD: Money;
  discountPriceUSD: Money | null;
  stock?: number | null;
  isActive: boolean;
}

export interface CartItem {
  id: UUID;
  cartId: UUID;
  itemType: CartItemType;
  itemId: UUID;
  quantity: number;
  currency: Currency;
  unitPrice: Money;
  discountUnitPrice: Money | null;
  lineSubtotal: Money;
  lineDiscount: Money;
  lineTotal: Money;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  item: CartCatalogItem | null;
}

export interface CartSummary {
  currency: Currency;
  subtotal: Money;
  discount: Money;
  total: Money;
  grandTotal: Money;
  itemsCount: number;
}

export interface Cart {
  id: UUID | null;
  userId: UUID;
  createdAt: DateTimeString | null;
  updatedAt: DateTimeString | null;
  items: CartItem[];
}

export interface CartData {
  cart: Cart;
  summary: CartSummary;
}

export type OrderItemType = 'COURSE' | 'BOOK' | 'PRODUCT';
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED';
export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  id: UUID;
  orderId: UUID;
  itemType: OrderItemType;
  itemId: UUID;
  titleAr: string;
  titleEn: string;
  quantity: number;
  unitPrice: Money;
  discountPrice: Money | null;
  totalPrice: Money;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface OrderShippingGovernorate {
  id: UUID;
  nameAr: string;
  nameEn: string;
  shippingCost: Money;
  isActive: boolean;
}

export interface OrderShippingAddress {
  id: UUID;
  fullName: string;
  phoneNumber: string;
  governorateId: UUID | null;
  city: string;
  street: string | null;
  buildingNumber: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  notes: string | null;
  governorate: OrderShippingGovernorate | null;
}

export interface Order {
  id: UUID;
  userId: UUID;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: Currency;
  subtotal: Money;
  discountAmount: Money;
  shippingCost: Money;
  totalAmount: Money;
  hasPhysicalItems: boolean;
  notes: string | null;
  paidAt: DateTimeString | null;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  user?: Pick<User, 'id' | 'fullName' | 'email' | 'phoneNumber'>;
  shippingAddress: OrderShippingAddress | null;
  items: OrderItem[];
}

export interface OrderListData {
  items: Order[];
  pagination: Pagination;
}

export type PaymentProvider = 'FAWRY' | 'PAYPAL';
export type PaymentMethod =
  | 'FAWRY_REFERENCE'
  | 'PAYPAL_CHECKOUT';

export interface Payment {
  id: UUID;
  orderId: UUID;
  userId: UUID;
  provider: PaymentProvider;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: Money;
  currency: Currency;
  merchantRefNumber: string;
  providerReferenceNumber: string | null;
  paypalOrderId: string | null;
  providerPaymentReference: string | null;
  providerStatus: string | null;
  paidAt: DateTimeString | null;
  cancelledAt: DateTimeString | null;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface FawryCreatePaymentData {
  payment: Payment;
  referenceNumber: string | null;
  merchantRefNumber: string;
}

export interface PaypalCreatePaymentData {
  payment: Payment;
  paypalOrderId: string;
  approvalUrl: string;
}

export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface Coupon {
  id: UUID;
  code: string;
  name: string;
  description: string | null;
  type: CouponType;
  value: Money;
  minimumOrderAmount: Money | null;
  maximumDiscountAmount: Money | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: DateTimeString;
  expiresAt: DateTimeString;
  isReferralCoupon: boolean;
  isActive: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface CouponCalculation {
  coupon: Coupon;
  currency: Currency;
  eligibleAmount: Money;
  couponDiscountAmount: Money;
  totalAfterDiscount: Money;
}

export interface CouponApplyData extends CouponCalculation {
  order: {
    id: UUID;
    orderNumber: string;
    currency: Currency;
    subtotal: Money;
    discountAmount: Money;
    totalAmount: Money;
    couponId: UUID | null;
  };
}

export interface WishlistItem {
  id: UUID;
  userId: UUID;
  itemType: CartItemType;
  itemId: UUID;
  createdAt: DateTimeString;
  item: CartCatalogItem | null;
}
