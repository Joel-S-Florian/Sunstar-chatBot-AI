/**
 * Proveedores de IA disponibles en Sunstar.
 * Para agregar uno: añade una entrada aquí y, si usa una API compatible con
 * OpenAI, otra en el objeto COMPAT de server.js.
 */
const PROVIDERS = {
  claude:     { name: 'Claude',     vendor: 'Anthropic',     hint: 'sk-ant-...',  url: 'https://console.anthropic.com/settings/keys' },
  openai:     { name: 'ChatGPT',    vendor: 'OpenAI',        hint: 'sk-...',      url: 'https://platform.openai.com/api-keys' },
  gemini:     { name: 'Gemini',     vendor: 'Google',        hint: 'AIza...',     url: 'https://aistudio.google.com/apikey' },
  deepseek:   { name: 'DeepSeek',   vendor: 'DeepSeek',      hint: 'sk-...',      url: 'https://platform.deepseek.com/api_keys' },
  grok:       { name: 'Grok',       vendor: 'xAI',           hint: 'xai-...',     url: 'https://console.x.ai' },
  qwen:       { name: 'Qwen',       vendor: 'Alibaba Cloud', hint: 'sk-...',      url: 'https://bailian.console.alibabacloud.com' },
  mistral:    { name: 'Mistral',    vendor: 'Mistral AI',    hint: 'API key',     url: 'https://console.mistral.ai/api-keys' },
  groq:       { name: 'Groq',       vendor: 'Groq',          hint: 'gsk_...',     url: 'https://console.groq.com/keys' },
  openrouter: { name: 'OpenRouter', vendor: 'OpenRouter',    hint: 'sk-or-...',   url: 'https://openrouter.ai/keys' },
  ollama:     { name: 'Ollama',     vendor: 'Local',         hint: 'Sin key (usa localhost:11434)', noKey: true, url: 'https://ollama.com' },
};

const PROVIDER_IDS = Object.keys(PROVIDERS);

/** Modelos por defecto mientras no se haya verificado una key (luego manda la lista real de la API) */
const FALLBACK_MODELS = {
  claude:     ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-4-5', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  openai:     ['gpt-4o', 'gpt-4o-mini'],
  gemini:     ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  deepseek:   ['deepseek-chat', 'deepseek-reasoner'],
  grok:       ['grok-3', 'grok-3-mini'],
  qwen:       ['qwen-plus', 'qwen-max', 'qwen-turbo'],
  mistral:    ['mistral-large-latest', 'mistral-small-latest'],
  groq:       ['llama-3.3-70b-versatile'],
  openrouter: ['openrouter/auto'],
  ollama:     ['llama3.2'],
};

/** Modelos que no sirven para chat de texto (voz, imagen, embeddings, moderación...) */
const HIDE_MODEL_RE = /tts|image|embed|aqa|robotics|computer-use|live|audio|veo|imagen|learnlm|gemma|dialog|whisper|moderation|dall-e|realtime|transcribe|davinci|babbage|search-preview|rerank|guard|vision-preview/i;
