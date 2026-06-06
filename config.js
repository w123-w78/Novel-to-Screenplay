/* 
 * 使用步骤：
 *   1. 选择你要使用的 AI 服务商（见下方 PROVIDER）
 *   2. 填入对应的 API Key 和模型名
 *   3. 保存文件，刷新浏览器即可生效
 */

const CONFIG = {

  // 选择服务商
  // 可选值：'anthropic' | 'openai' | 'deepseek' | 'qwen' | 'custom'
  PROVIDER: 'qwen',

  // 各服务商配置（只填你要用的那一个即可）
  PROVIDERS: {

    // ── Anthropic Claude
    anthropic: {
      API_KEY:  'sk-ant-你的密钥',
      BASE_URL: 'https://api.anthropic.com/v1/messages',
      MODEL:    'claude-sonnet-4-6',

    },

    // ── DeepSeek
    deepseek: {
      API_KEY:  'sk-你的DeepSeek密钥',
      BASE_URL: 'https://api.deepseek.com/v1/chat/completions',
      MODEL:    'deepseek-chat',
    },

    // ── 阿里云千问 Qwen
    qwen: {
      API_KEY:  'sk-',
      BASE_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      MODEL:    'qwen3.7-plus',
    },

    // ── 自定义（任何兼容 OpenAI 格式的服务） ────────
    custom: {
      API_KEY:  '你的密钥',
      BASE_URL: 'https://你的API地址/v1/chat/completions',
      MODEL:    '模型名称',
    },

  },
  MAX_TOKENS: 4000,   // 输出长度上限，最大不超过 8192

};