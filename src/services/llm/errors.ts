/**
 * LLM 错误类型（Phase 9.3）。
 *
 * 定位：统一 LLM 调用过程中的错误分类，供调用方做差异化处理。
 *
 * 设计原则：
 *   - 继承 Error，保持 throw/catch 兼容
 *   - 错误类型字面量联合，类型安全
 *   - 不暴露 API Key 等敏感信息
 *   - 类型安全，无 any
 */

/**
 * LLM 错误类型。
 *
 *   - AUTH_FAILED        认证失败（API Key 无效 / 过期）
 *   - RATE_LIMIT         触发限流
 *   - NETWORK_ERROR      网络错误（超时 / 断网 / DNS 失败）
 *   - INVALID_RESPONSE   响应格式异常（JSON 解析失败 / 缺少 content 字段）
 *   - NOT_IMPLEMENTED    接口未实现（如当前 Provider 不支持 Streaming）
 */
export type LLMErrorType =
  | "AUTH_FAILED"
  | "RATE_LIMIT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "NOT_IMPLEMENTED";

/**
 * LLM 错误。
 *
 * 调用方可根据 errorType 做差异化处理：
 *   - AUTH_FAILED       → 提示用户重新提供 API Key
 *   - RATE_LIMIT        → 等待重试
 *   - NETWORK_ERROR     → 检查网络后重试
 *   - INVALID_RESPONSE  → 记录日志，联系 Provider
 *   - NOT_IMPLEMENTED   → 降级到非流式或提示用户功能未上线
 */
export class LLMError extends Error {
  readonly errorType: LLMErrorType;
  /** HTTP 状态码（网络错误时为 undefined） */
  readonly statusCode?: number;
  /** Provider 标识 */
  readonly provider: string;

  constructor(
    errorType: LLMErrorType,
    message: string,
    options?: { statusCode?: number; provider?: string },
  ) {
    super(message);
    this.name = "LLMError";
    this.errorType = errorType;
    this.statusCode = options?.statusCode;
    this.provider = options?.provider ?? "unknown";
  }
}
