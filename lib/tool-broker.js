// RIKA 2.0 - SaaS Tool Broker with Health Monitoring & Fallbacks
const { OpenAI } = require('openai');
const { ElevenLabs } = require('elevenlabs-node');
const twilio = require('twilio');
const { PineconeClient } = require('@pinecone-database/pinecone');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

class ToolBroker {
    constructor() {
        this.providers = new Map();
        this.healthStatus = new Map();
        this.retryAttempts = new Map();
        this.lastHealthCheck = new Map();
        this.fallbacks = new Map();
        
        this.initializeProviders();
        this.startHealthMonitoring();
    }

    async initializeProviders() {
        console.log('🛠️ Tool Broker: Initializing SaaS providers...');

        // OpenAI - Primary LLM
        if (process.env.OPENAI_API_KEY) {
            try {
                this.providers.set('openai', new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY
                }));
                console.log('✅ OpenAI initialized');
            } catch (error) {
                console.log('❌ OpenAI failed:', error.message);
            }
        }

        // ElevenLabs - Premium TTS
        if (process.env.ELEVENLABS_API_KEY) {
            try {
                this.providers.set('elevenlabs', new ElevenLabs({
                    apiKey: process.env.ELEVENLABS_API_KEY
                }));
                console.log('✅ ElevenLabs initialized');
            } catch (error) {
                console.log('❌ ElevenLabs failed:', error.message);
            }
        }

        // Twilio - Voice & SMS
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                this.providers.set('twilio', twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                ));
                console.log('✅ Twilio initialized');
            } catch (error) {
                console.log('❌ Twilio failed:', error.message);
            }
        }

        // Pinecone - Vector Database  
        if (process.env.PINECONE_API_KEY && process.env.PINECONE_ENVIRONMENT) {
            try {
                const pinecone = new PineconeClient();
                await pinecone.init({
                    environment: process.env.PINECONE_ENVIRONMENT,
                    apiKey: process.env.PINECONE_API_KEY
                });
                this.providers.set('pinecone', pinecone);
                console.log('✅ Pinecone initialized');
            } catch (error) {
                console.log('❌ Pinecone failed:', error.message);
            }
        }

        // Supabase - Database & Storage
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            try {
                this.providers.set('supabase', createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_ANON_KEY
                ));
                console.log('✅ Supabase initialized');
            } catch (error) {
                console.log('❌ Supabase failed:', error.message);
            }
        }

        // Telegram Bot
        if (process.env.TELEGRAM_BOT_TOKEN) {
            try {
                this.providers.set('telegram', new TelegramBot(
                    process.env.TELEGRAM_BOT_TOKEN,
                    { polling: false }
                ));
                console.log('✅ Telegram initialized');
            } catch (error) {
                console.log('❌ Telegram failed:', error.message);
            }
        }

        // Brave Search API
        if (process.env.BRAVE_API_KEY) {
            try {
                this.providers.set('brave', {
                    apiKey: process.env.BRAVE_API_KEY,
                    baseURL: 'https://api.search.brave.com/res/v1'
                });
                console.log('✅ Brave Search initialized');
            } catch (error) {
                console.log('❌ Brave Search failed:', error.message);
            }
        }

        this.setupFallbacks();
        console.log(`🎯 Tool Broker: ${this.providers.size} providers initialized`);
    }

    setupFallbacks() {
        // LLM Fallbacks: OpenAI -> Local model
        this.fallbacks.set('llm', ['openai', 'local']);
        
        // TTS Fallbacks: ElevenLabs -> Browser Speech API
        this.fallbacks.set('tts', ['elevenlabs', 'browser']);
        
        // Search Fallbacks: Brave -> DuckDuckGo
        this.fallbacks.set('search', ['brave', 'duckduckgo']);
        
        // Vector Fallbacks: Pinecone -> Local SQLite
        this.fallbacks.set('vector', ['pinecone', 'sqlite']);
    }

    startHealthMonitoring() {
        // Health check every 30 seconds
        setInterval(() => this.performHealthChecks(), 30000);
        
        // Initial health check
        setTimeout(() => this.performHealthChecks(), 5000);
    }

    async performHealthChecks() {
        console.log('🔍 Tool Broker: Performing health checks...');
        
        for (const [name, provider] of this.providers) {
            try {
                const startTime = Date.now();
                let isHealthy = false;
                
                switch (name) {
                    case 'openai':
                        const response = await provider.chat.completions.create({
                            model: 'gpt-3.5-turbo',
                            messages: [{ role: 'user', content: 'ping' }],
                            max_tokens: 1
                        });
                        isHealthy = response.choices?.length > 0;
                        break;
                        
                    case 'elevenlabs':
                        // Simple API health check
                        isHealthy = true; // Assume healthy for now
                        break;
                        
                    case 'twilio':
                        const account = await provider.api.accounts.list({ limit: 1 });
                        isHealthy = account.length > 0;
                        break;
                        
                    case 'supabase':
                        const { data } = await provider.from('health_check').select('*').limit(1);
                        isHealthy = true; // Connection successful
                        break;
                        
                    case 'brave':
                        const searchResponse = await axios.get(`${provider.baseURL}/web/search`, {
                            headers: { 'X-Subscription-Token': provider.apiKey },
                            params: { q: 'test', count: 1 }
                        });
                        isHealthy = searchResponse.status === 200;
                        break;
                        
                    default:
                        isHealthy = true;
                }
                
                const latency = Date.now() - startTime;
                this.healthStatus.set(name, {
                    healthy: isHealthy,
                    latency,
                    lastCheck: Date.now(),
                    consecutiveFailures: isHealthy ? 0 : (this.healthStatus.get(name)?.consecutiveFailures || 0) + 1
                });
                
                if (isHealthy) {
                    this.retryAttempts.delete(name);
                }
                
            } catch (error) {
                console.log(`❌ Health check failed for ${name}:`, error.message);
                const current = this.healthStatus.get(name) || {};
                this.healthStatus.set(name, {
                    healthy: false,
                    latency: null,
                    lastCheck: Date.now(),
                    consecutiveFailures: (current.consecutiveFailures || 0) + 1,
                    error: error.message
                });
            }
        }
    }

    async callProvider(providerName, operation, params = {}, options = {}) {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} not available`);
        }

        const health = this.healthStatus.get(providerName);
        if (health && !health.healthy && health.consecutiveFailures > 3) {
            throw new Error(`Provider ${providerName} is unhealthy (${health.consecutiveFailures} failures)`);
        }

        const maxRetries = options.maxRetries || 3;
        const currentAttempt = this.retryAttempts.get(`${providerName}-${operation}`) || 0;

        if (currentAttempt >= maxRetries) {
            throw new Error(`Max retries exceeded for ${providerName}.${operation}`);
        }

        try {
            const startTime = Date.now();
            let result;

            switch (providerName) {
                case 'openai':
                    result = await this.callOpenAI(provider, operation, params);
                    break;
                case 'elevenlabs':
                    result = await this.callElevenLabs(provider, operation, params);
                    break;
                case 'twilio':
                    result = await this.callTwilio(provider, operation, params);
                    break;
                case 'pinecone':
                    result = await this.callPinecone(provider, operation, params);
                    break;
                case 'supabase':
                    result = await this.callSupabase(provider, operation, params);
                    break;
                case 'telegram':
                    result = await this.callTelegram(provider, operation, params);
                    break;
                case 'brave':
                    result = await this.callBrave(provider, operation, params);
                    break;
                default:
                    throw new Error(`Unknown provider: ${providerName}`);
            }

            // Reset retry counter on success
            this.retryAttempts.delete(`${providerName}-${operation}`);
            
            const latency = Date.now() - startTime;
            console.log(`✅ ${providerName}.${operation} completed in ${latency}ms`);
            
            return result;

        } catch (error) {
            const nextAttempt = currentAttempt + 1;
            this.retryAttempts.set(`${providerName}-${operation}`, nextAttempt);

            console.log(`❌ ${providerName}.${operation} failed (attempt ${nextAttempt}/${maxRetries}):`, error.message);

            if (nextAttempt < maxRetries) {
                // Exponential backoff
                const delay = Math.pow(2, currentAttempt) * 1000;
                await this.delay(delay);
                return this.callProvider(providerName, operation, params, options);
            }

            throw error;
        }
    }

    async callWithFallback(service, operation, params = {}, options = {}) {
        const fallbackChain = this.fallbacks.get(service) || [service];
        
        for (const providerName of fallbackChain) {
            try {
                return await this.callProvider(providerName, operation, params, options);
            } catch (error) {
                console.log(`⚠️ ${providerName} failed, trying next in chain:`, error.message);
                continue;
            }
        }
        
        throw new Error(`All providers failed for service: ${service}`);
    }

    // Provider-specific call methods
    async callOpenAI(provider, operation, params) {
        switch (operation) {
            case 'chat':
                return await provider.chat.completions.create({
                    model: params.model || 'gpt-4',
                    messages: params.messages,
                    max_tokens: params.maxTokens || 1000,
                    temperature: params.temperature || 0.7,
                    ...params.options
                });
            case 'transcribe':
                return await provider.audio.transcriptions.create({
                    file: params.file,
                    model: 'whisper-1'
                });
            default:
                throw new Error(`Unknown OpenAI operation: ${operation}`);
        }
    }

    async callElevenLabs(provider, operation, params) {
        switch (operation) {
            case 'synthesize':
                return await provider.textToSpeech({
                    voiceId: params.voiceId || 'EXAVITQu4vr4xnSDxMaL',
                    text: params.text,
                    modelId: params.modelId || 'eleven_monolingual_v1'
                });
            case 'voices':
                return await provider.getVoices();
            default:
                throw new Error(`Unknown ElevenLabs operation: ${operation}`);
        }
    }

    async callTwilio(provider, operation, params) {
        switch (operation) {
            case 'call':
                return await provider.calls.create({
                    url: params.twimlUrl,
                    to: params.to,
                    from: params.from
                });
            case 'message':
                return await provider.messages.create({
                    body: params.body,
                    to: params.to,
                    from: params.from
                });
            default:
                throw new Error(`Unknown Twilio operation: ${operation}`);
        }
    }

    async callPinecone(provider, operation, params) {
        const index = provider.Index(params.indexName || 'rika-memory');
        
        switch (operation) {
            case 'upsert':
                return await index.upsert({
                    upsertRequest: {
                        vectors: params.vectors
                    }
                });
            case 'query':
                return await index.query({
                    queryRequest: {
                        vector: params.vector,
                        topK: params.topK || 10,
                        includeMetadata: true
                    }
                });
            default:
                throw new Error(`Unknown Pinecone operation: ${operation}`);
        }
    }

    async callSupabase(provider, operation, params) {
        switch (operation) {
            case 'insert':
                return await provider.from(params.table).insert(params.data);
            case 'select':
                return await provider.from(params.table).select(params.columns || '*');
            case 'update':
                return await provider.from(params.table).update(params.data).eq('id', params.id);
            case 'delete':
                return await provider.from(params.table).delete().eq('id', params.id);
            default:
                throw new Error(`Unknown Supabase operation: ${operation}`);
        }
    }

    async callTelegram(provider, operation, params) {
        switch (operation) {
            case 'sendMessage':
                return await provider.sendMessage(params.chatId, params.text, params.options);
            case 'sendPhoto':
                return await provider.sendPhoto(params.chatId, params.photo, params.options);
            default:
                throw new Error(`Unknown Telegram operation: ${operation}`);
        }
    }

    async callBrave(provider, operation, params) {
        switch (operation) {
            case 'search':
                const response = await axios.get(`${provider.baseURL}/web/search`, {
                    headers: { 'X-Subscription-Token': provider.apiKey },
                    params: {
                        q: params.query,
                        count: params.count || 10,
                        offset: params.offset || 0
                    }
                });
                return response.data;
            default:
                throw new Error(`Unknown Brave operation: ${operation}`);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getHealthStatus() {
        const status = {};
        for (const [name, health] of this.healthStatus) {
            status[name] = {
                ...health,
                available: this.providers.has(name)
            };
        }
        return status;
    }

    getProviderList() {
        return Array.from(this.providers.keys());
    }
}

module.exports = ToolBroker;