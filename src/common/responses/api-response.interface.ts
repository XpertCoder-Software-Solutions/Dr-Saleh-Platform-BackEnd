export interface ApiResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  errors: unknown[];
}
