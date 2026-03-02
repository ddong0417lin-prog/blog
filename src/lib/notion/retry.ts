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

import { NotionAPIError, NotionErrorCode, MaxRetriesExceededError } from './errors';

// ============================================================================
// 常量定义
// ============================================================================

/** 最大重试次数 */
export const MAX_RETRY_ATTEMPTS = 5;

/** 基础延迟（毫秒） */
export const BASE_DELAY_MS = 1000;

/** 最大延迟（毫秒）- 16秒 */
export const MAX_DELAY_MS = 16_000;

/** 最大等待时间（毫秒）- 30秒 */
export const MAX_WAIT_MS = 30_000;

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
 * 计算包含 jitter 的延迟
 *
 * Jitter 可以避免多个客户端同时重试导致的"惊群效应"
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
  // 添加 ±25% 的随机 jitter
  const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(baseDelay + jitter));
}

// ============================================================================
// 重试执行
// ============================================================================

/**
 * 休眠指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 执行带重试的操作
 *
 * @param operation - 要执行的操作
 * @param operationName - 操作名称（用于日志）
 * @param config - 重试配置
 * @returns 操作结果
 * @throws {MaxRetriesExceededError} 当重试次数耗尽时
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
  } = config;

  let lastError: Error | undefined;
  let totalWaitMs = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

      if (!shouldRetry || attempt >= maxAttempts - 1) {
        // 不可重试或已达到最大重试次数
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
      if (totalWaitMs + delayMs > MAX_WAIT_MS) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[Retry] ${operationName} would exceed max wait time, stopping retries`
          );
        }
        break;
      }

      totalWaitMs += delayMs;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Retry] ${operationName} failed (attempt ${attempt + 1}/${maxAttempts}), ` +
            `retrying in ${Math.round(delayMs)}ms...`
        );
      }

      await sleep(delayMs);
    }
  }

  // 重试次数耗尽
  throw new MaxRetriesExceededError(maxAttempts, lastError!);
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

  // 网络错误（fetch 失败等）
  if (error instanceof TypeError && 'fetch' in globalThis) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('abort')
    );
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
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Fallback] ${operationName} primary failed, using fallback:`,
        error instanceof Error ? error.message : error
      );
    }
    return fallback(error instanceof Error ? error : new Error(String(error)));
  }
}

// ============================================================================
// 导出
// ============================================================================

export { NotionAPIError, NotionErrorCode, MaxRetriesExceededError };
