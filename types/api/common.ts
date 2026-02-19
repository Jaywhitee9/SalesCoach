/**
 * Common API type definitions
 * Shared types used across API requests and responses
 */

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Filters
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface LeadFilters extends DateRangeFilter {
  status?: string[];
  priority?: string[];
  source?: string[];
  assignedTo?: string;
  tags?: string[];
  search?: string;
}

export interface CallFilters extends DateRangeFilter {
  status?: string[];
  agentId?: string;
  leadId?: string;
  organizationId?: string;
}

// Sorting
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// Error handling
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

// Validation
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: string;
  validationErrors: ValidationError[];
}

// Bulk operations
export interface BulkOperationRequest<T> {
  items: T[];
  options?: {
    continueOnError?: boolean;
    validate?: boolean;
  };
}

export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ index: number; error: string }>;
}

// Webhook types
export interface WebhookEvent {
  event: string;
  timestamp: string;
  data: any;
}

export interface WebhookSignature {
  signature: string;
  timestamp: number;
}
