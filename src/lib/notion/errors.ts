/**
 * ============================================================================
 * content-source 模块 - 错误类型定义
 * ============================================================================
 *
 * 定义 Notion API 相关的错误类型
 *
 * @module content-source/errors
 */

/**
 * Notion API 错误类型枚举
 */
export enum NotionErrorCode {
  // 配置错误
  INVALID_TOKEN = 'INVALID_TOKEN',
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_DATABASE_ID = 'INVALID_DATABASE_ID',

  // API 错误
  API_ERROR = 'API_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // 数据错误
  PAGE_NOT_FOUND = 'PAGE_NOT_FOUND',
  INVALID_RESPONSE = 'INVALID_RESPONSE',

  // 重试错误
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
}

/**
 * Notion API 错误类
 */
export class NotionAPIError extends Error {
  public readonly code: NotionErrorCode;
  public readonly status?: number;
  public readonly headers?: Record<string, string>;
  public readonly retryAfter?: number;

  constructor(
    code: NotionErrorCode,
    message: string,
    options?: {
      status?: number;
      headers?: Record<string, string>;
      retryAfter?: number;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'NotionAPIError';
    this.code = code;
    this.status = options?.status;
    this.headers = options?.headers;
    this.retryAfter = options?.retryAfter;
  }

  /**
   * 是否可重试
   */
  get retryable(): boolean {
    return (
      this.code === NotionErrorCode.RATE_LIMITED ||
      this.code === NotionErrorCode.TIMEOUT ||
      this.code === NotionErrorCode.NETWORK_ERROR ||
      (this.code === NotionErrorCode.API_ERROR &&
        this.status !== undefined &&
        this.status >= 500)
    );
  }

  /**
   * 从 API 响应创建错误
   */
  static fromResponse(
    response: Response,
    body?: unknown
  ): NotionAPIError {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // 429 Rate Limit
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      // 支持两种格式: 秒数(数字字符串) 或 HTTP-date (如 Wed, 21 Oct 2025 07:28:00 GMT)
      let retryAfterSeconds: number | undefined;
      if (retryAfter) {
        // 使用正则匹配纯数字秒数（支持前导零，如 "05"）
        const trimmed = retryAfter.trim();
        if (/^\d+$/.test(trimmed)) {
          const seconds = parseInt(trimmed, 10);
          retryAfterSeconds = Math.max(0, seconds);
        } else {
          // 尝试解析为 HTTP-date
          const dateMs = Date.parse(trimmed);
          if (!isNaN(dateMs)) {
            retryAfterSeconds = Math.ceil((dateMs - Date.now()) / 1000);
            // 如果计算出的时间是负数或太远，使用 undefined
            if (retryAfterSeconds < 0 || retryAfterSeconds > 3600) {
              retryAfterSeconds = undefined;
            }
          }
        }
      }
      return new NotionAPIError(
        NotionErrorCode.RATE_LIMITED,
        'Notion API rate limit exceeded',
        {
          status: response.status,
          headers,
          retryAfter: retryAfterSeconds,
        }
      );
    }

    // 404 Not Found
    if (response.status === 404) {
      return new NotionAPIError(
        NotionErrorCode.PAGE_NOT_FOUND,
        'Resource not found',
        {
          status: response.status,
          headers,
        }
      );
    }

    // 其他 API 错误
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message?: unknown }).message)
        : `Notion API error: ${response.status} ${response.statusText}`;

    return new NotionAPIError(NotionErrorCode.API_ERROR, message, {
      status: response.status,
      headers,
    });
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * 重试退出原因
 */
export enum RetryExitReason {
  NON_RETRYABLE = 'NON_RETRYABLE',
  MAX_ATTEMPTS = 'MAX_ATTEMPTS',
  MAX_WAIT = 'MAX_WAIT',
  ABORTED = 'ABORTED',
}

/**
 * 重试耗尽错误
 */
export class MaxRetriesExceededError extends Error {
  public readonly attempts: number;
  public readonly lastError: Error;
  public readonly reason: RetryExitReason;
  public readonly totalWaitMs?: number;

  constructor(
    attempts: number,
    lastError: Error,
    reason: RetryExitReason = RetryExitReason.MAX_ATTEMPTS,
    totalWaitMs?: number
  ) {
    const reasonText = {
      [RetryExitReason.NON_RETRYABLE]: 'Non-retryable error',
      [RetryExitReason.MAX_ATTEMPTS]: 'Maximum attempts reached',
      [RetryExitReason.MAX_WAIT]: 'Maximum wait time exceeded',
      [RetryExitReason.ABORTED]: 'Retry aborted',
    }[reason];

    super(
      `${reasonText} after ${attempts} attempt(s). Last error: ${lastError.message}`
    );
    this.name = 'MaxRetriesExceededError';
    this.attempts = attempts;
    this.lastError = lastError;
    this.reason = reason;
    this.totalWaitMs = totalWaitMs;
  }
}