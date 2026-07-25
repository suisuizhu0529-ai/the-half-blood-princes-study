/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_SPEECH_KEY?: string;
  readonly VITE_AZURE_SPEECH_REGION?: string;
  readonly VITE_AZURE_SPEECH_VOICE?: string;
  readonly VITE_AZURE_SPEECH_STYLE?: string;

  // LLM Runtime Config (Phase 9.6.5)
  // 必填（任一缺失则回退到本地 responseSimulator）
  // protocol 无需环境变量，由 EnvRuntimeConfigProvider 根据 provider 自动推导
  readonly VITE_LLM_PROVIDER?: string;
  readonly VITE_LLM_API_KEY?: string;
  readonly VITE_LLM_BASE_URL?: string;
  readonly VITE_LLM_MODEL?: string;
  // 可选
  readonly VITE_LLM_TEMPERATURE?: string;
  readonly VITE_LLM_MAX_TOKENS?: string;
  readonly VITE_LLM_TIMEOUT?: string;
  readonly VITE_LLM_HEADERS_JSON?: string;
  readonly VITE_LLM_RETRY_MAX_ATTEMPTS?: string;
  readonly VITE_LLM_RETRY_DELAY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
