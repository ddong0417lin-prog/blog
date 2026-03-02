/**
 * ============================================================================
 * content-source 模块 - 重试策略
 * ============================================================================
 *
 * 实现指数退避重试机制
 * - 基础延迟: 1s → 2s → 4s → 8s → 16s (最大)
 * - 最大重试次数: 5 次
 * - 支持 429 Retry-After 响应头
 * - 可重试错误: RATE_LIMITED, TIMEOUT, NETWORK_ERROR, 5xx API_ERROR
 *
 * @module content-source/retry
 */

import { NotionAPIError, NotionErrorCode, MaxRetriesExceededError, RetryExitReason } from './errors';

// ============================================================================
// 常量定义
// ============================================================================

/** 最大重试次数 */
export const MAX_RETRY_ATTEMPTS = 5;

/** 基础延迟（毫秒） */
export const BASE_DELAY_MS = 1000;

/** 最大延迟（毫秒）- 16秒 */
export const MAX_DELAY_MS = 16_000;

/** 默认最大等待时间（毫秒）- 30秒 */
export const DEFAULT_MAX_WAIT_MS = 30_000;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 重试策略配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxAttempts?: number;
  /** 基础延迟（毫秒） */
  baseDelayMs?: number;
  /** 最大延迟（毫秒） */
  maxDelayMs?: number;
  /** 最大等待时间（毫秒） */
  maxWaitMs?: number;
  /** 取消信号 */
  signal?: AbortSignal;
}

/**
 * 重试上下文
 */
export interface RetryContext {
  /** 当前尝试次数 */
  attempt: number;
  /** 上次错误 */
  lastError?: Error;
  /** 累计等待时间（毫秒） */
  totalWaitMs: number;
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  /** 操作结果 */
  result: T;
  /** 尝试次数 */
  attempts: number;
  /** 总等待时间（毫秒） */
  totalWaitMs: number;
}

// ============================================================================
// 延迟计算
// ============================================================================

/**
 * 计算指数退避延迟
 *
 * 公式: min(baseDelay * 2^attempt, maxDelay)
 *
 * @param attempt - 当前尝试次数（从0开始）
 * @param baseDelayMs - 基础延迟
 * @param maxDelayMs - 最大延迟
 * @returns 延迟毫秒数
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = BASE_DELAY_MS,
  maxDelayMs: number = MAX_DELAY_MS
): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  return Math.min(exponentialDelay, maxDelayMs);
}

/**
 * 计算包含 full jitter 的延迟
 *
 * Full jitter: 0 ~ backoff 之间的随机值
 * 比 ±25% jitter 更能有效避免惊群效应
 *
 * @param attempt - 当前尝试次数
 * @param baseDelayMs - 基础延迟
 * @param maxDelayMs - 最大延迟
 * @returns 延迟毫秒数（包含 jitter）
 */
export function calculateJitteredDelay(
  attempt: number,
  baseDelayMs: number = BASE_DELAY_MS,
  maxDelayMs: number = MAX_DELAY_MS
): number {
  const baseDelay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs);
  // Full jitter: 0 ~ baseDelay 之间的随机值
  return Math.floor(Math.random() * baseDelay);
}

// ============================================================================
// 重试执行
// ============================================================================

/**
 * 休眠指定时间，支持取消信号
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // 如果已经取消，立即拒绝
    if (signal?.aborted) {
      reject(new Error('Retry aborted'));
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      clearTimeout(timeout);
      reject(new Error('Retry aborted'));
    };

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    signal?.addEventListener('abort', onAbort);
  });
}

/**
 * 执行带重试的操作
 *
 * @param operation - 要执行的操作
 * @param operationName - 操作名称（用于日志）
 * @param config - 重试配置
 * @returns 操作结果
 * @throws {MaxRetriesExceededError} 当重试次数耗尽时
 * @throws {Error} 当遇到不可重试错误时直接抛出原始错误
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => notionClient.databases.query({ database_id: 'xxx' }),
 *   'queryDatabase'
 * );
 * ```
 */
export async function withRetry<T>(
  operation: (context: RetryContext) => Promise<T>,
  operationName: string,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    baseDelayMs = BASE_DELAY_MS,
    maxDelayMs = MAX_DELAY_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    signal,
  } = config;

  let lastError: Error | undefined;
  let totalWaitMs = 0;
  let exitReason: RetryExitReason | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 检查是否已取消
    if (signal?.aborted) {
      exitReason = RetryExitReason.ABORTED;
      break;
    }

    try {
      const result = await operation({
        attempt: attempt + 1,
        lastError,
        totalWaitMs,
      });

      // 成功返回
      if (attempt > 0 && process.env.NODE_ENV === 'development') {
        console.log(
          `[Retry] ${operationName} succeeded after ${attempt + 1} attempts`
        );
      }

      return {
        result,
        attempts: attempt + 1,
        totalWaitMs,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否是可重试错误
      const shouldRetry = isRetryableError(error);

      if (!shouldRetry) {
        // 不可重试错误，直接抛出，不包装为 MaxRetriesExceededError
        exitReason = RetryExitReason.NON_RETRYABLE;
        throw lastError;
      }

      if (attempt >= maxAttempts - 1) {
        // 已达到最大重试次数
        exitReason = RetryExitReason.MAX_ATTEMPTS;
        break;
      }

      // 计算延迟时间
      let delayMs: number;

      // 如果是 429 错误且有 Retry-After 头，优先使用
      if (
        error instanceof NotionAPIError &&
        error.code === NotionErrorCode.RATE_LIMITED &&
        error.retryAfter !== undefined
      ) {
        delayMs = error.retryAfter * 1000;
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[Retry] ${operationName} rate limited, waiting ${error.retryAfter}s as requested by Retry-After`
          );
        }
      } else {
        // 使用指数退避
        delayMs = calculateJitteredDelay(attempt, baseDelayMs, maxDelayMs);
      }

      // 检查是否超过最大等待时间
      if (totalWaitMs + delayMs > maxWaitMs) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[Retry] ${operationName} would exceed max wait time, stopping retries`
          );
        }
        exitReason = RetryExitReason.MAX_WAIT;
        break;
      }

      totalWaitMs += delayMs;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Retry] ${operationName} failed (attempt ${attempt + 1}/${maxAttempts}), ` +
            `retrying in ${Math.round(delayMs)}ms...`
        );
      }

      try {
        await sleep(delayMs, signal);
      } catch (abortError) {
        // 被取消
        exitReason = RetryExitReason.ABORTED;
        break;
      }
    }
  }

  // 重试退出，根据原因抛出不同的错误
  const attemptsUsed = exitReason === RetryExitReason.NON_RETRYABLE ? 1 : maxAttempts;

  throw new MaxRetriesExceededError(attemptsUsed, lastError!, exitReason);
}

/**
 * 检查错误是否可重试
 *
 * 可重试错误:
 * - RATE_LIMITED (429)
 * - TIMEOUT
 * - NETWORK_ERROR
 * - API_ERROR 且状态码 >= 500
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NotionAPIError) {
    return error.retryable;
  }

  // 网络错误（fetch 失败等）- 简化判断，只要 TypeError 就认为可能可重试
  if (error instanceof TypeError) {
    return true;
  }

  return false;
}

// ============================================================================
// 降级处理
// ============================================================================

/**
 * 带降级策略的操作执行
 *
 * 当主操作失败时，尝试执行降级操作
 * 仅对可重试错误触发降级，编程错误直接抛出
 *
 * @param primary - 主操作
 * @param fallback - 降级操作
 * @param operationName - 操作名称
 * @param config - 重试配置
 * @returns 操作结果
 */
export async function withFallback<T>(
  primary: (context: RetryContext) => Promise<T>,
  fallback: (error: Error) => Promise<T>,
  operationName: string,
  config?: RetryConfig
): Promise<T> {
  try {
    const { result } = await withRetry(primary, operationName, config);
    return result;
  } catch (error) {
    // 仅对可重试错误触发降级
    const lastError = error instanceof MaxRetriesExceededError
      ? error.lastError
      : (error instanceof Error ? error : new Error(String(error)));

    if (!isRetryableError(lastError)) {
      // 不可重试错误，直接抛出
      throw error;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Fallback] ${operationName} primary failed, using fallback:`,
        lastError.message
      );
    }
    return fallback(lastError);
  }
}

// ============================================================================
// 导出
// ============================================================================

export { NotionAPIError, NotionErrorCode, MaxRetriesExceededError };
