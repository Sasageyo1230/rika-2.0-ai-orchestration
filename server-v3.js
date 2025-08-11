// RIKA 2.0 v3 - Advanced AI Orchestration Platform
// Full SaaS Integration + Voice/Calls + Vision + Intelligence Layer + Safe Mode
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

// Import our advanced modules
const ToolBroker = require('./lib/tool-broker');
const IntelligenceRouter = require('./lib/intelligence-router');
const VoiceEngine = require('./lib/voice-engine');

class RikaOrchestrator {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3001', 'http://127.0.0.1:3001'],
                methods: ['GET', 'POST']
            }
        });

        // Core systems
        this.toolBroker = null;
        this.intelligenceRouter = null;
        this.voiceEngine = null;
        this.safeMode = process.env.RIKA_SAFE_MODE === 'true';
        this.bootPhases = [];
        this.agents = new Map();
        this.conversations = new Map();
        this.metrics = {
            totalRequests: 0,
            activeConnections: 0,
            averageResponseTime: 0,
            errorRate: 0,
            voiceLatency: 0,
            costDaily: 0
        };

        this.initializeServer();
    }

    async initializeServer() {
        console.log('🚀 RIKA 2.0 v3 - Advanced AI Orchestration Platform');
        console.log('=' .repeat(60));

        try {
            await this.bootSequence();
            await this.setupMiddleware();
            await this.setupRoutes();
            await this.setupWebSockets();
            await this.setupCronJobs();
            
            console.log('✅ RIKA fully initialized and ready!');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            await this.enterSafeMode(error);
        }
    }

    async bootSequence() {
        const phases = [
            { name: 'env:load', fn: () => this.loadEnvironment() },
            { name: 'secrets:validate', fn: () => this.validateSecrets() },
            { name: 'tool-broker:init', fn: () => this.initializeToolBroker() },
            { name: 'intelligence:init', fn: () => this.initializeIntelligence() },
            { name: 'voice:init', fn: () => this.initializeVoiceEngine() },
            { name: 'agents:register', fn: () => this.initializeAgents() },
            { name: 'webhooks:setup', fn: () => this.setupWebhooks() }
        ];

        for (const phase of phases) {
            const startTime = Date.now();
            
            try {
                console.log(`📋 Boot Phase: ${phase.name}...`);
                await phase.fn();
                const duration = Date.now() - startTime;
                
                this.bootPhases.push({
                    name: phase.name,
                    status: 'success',
                    duration: duration,
                    timestamp: Date.now()
                });
                
                console.log(`✅ ${phase.name} completed (${duration}ms)`);
                
            } catch (error) {
                this.bootPhases.push({
                    name: phase.name,
                    status: 'failed',
                    error: error.message,
                    timestamp: Date.now()
                });
                
                console.error(`❌ ${phase.name} failed:`, error.message);
                
                if (!this.safeMode) {
                    throw error;
                } else {
                    console.log(`⚠️ Safe mode: continuing despite ${phase.name} failure`);
                }
            }
        }
    }

    loadEnvironment() {
        const requiredEnvs = [
            'NODE_ENV',
            'PORT'
        ];

        const optionalEnvs = [
            'OPENAI_API_KEY',
            'ELEVENLABS_API_KEY', 
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN',
            'PINECONE_API_KEY',
            'PINECONE_ENVIRONMENT',
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'TELEGRAM_BOT_TOKEN',
            'BRAVE_API_KEY',
            'DAILY_BUDGET_USD'
        ];

        for (const env of requiredEnvs) {
            if (!process.env[env]) {
                throw new Error(`Required environment variable missing: ${env}`);
            }
        }

        const missingOptional = optionalEnvs.filter(env => !process.env[env]);
        if (missingOptional.length > 0) {
            console.log(`⚠️ Optional environment variables missing: ${missingOptional.join(', ')}`);
            console.log('🔧 Some features will be disabled or use fallbacks');
        }
    }

    validateSecrets() {
        // Validate API keys format and access
        const secrets = {
            openai: process.env.OPENAI_API_KEY?.startsWith('sk-'),
            elevenlabs: process.env.ELEVENLABS_API_KEY?.length > 10,
            twilio: process.env.TWILIO_ACCOUNT_SID?.startsWith('AC'),
            pinecone: process.env.PINECONE_API_KEY?.length > 10
        };

        const validSecrets = Object.entries(secrets)
            .filter(([key, valid]) => valid)
            .map(([key]) => key);

        console.log(`🔐 Valid secrets: ${validSecrets.join(', ')}`);
        
        if (validSecrets.length === 0) {
            throw new Error('No valid API secrets found');
        }
    }

    async initializeToolBroker() {
        this.toolBroker = new ToolBroker();
        await this.toolBroker.initializeProviders();
    }

    async initializeIntelligence() {
        this.intelligenceRouter = new IntelligenceRouter(this.toolBroker);
        console.log('🧠 Intelligence Router: Intent classification, QoS tiers, Memory shaping, Council check, Cost sentinel');
    }

    async initializeVoiceEngine() {
        this.voiceEngine = new VoiceEngine(this.toolBroker, this.io);
        console.log('🎤 Voice Engine: ElevenLabs TTS + Whisper STT + Twilio integration (800ms target)');
    }

    initializeAgents() {
        const agentConfigs = [
            { id: 'rika', name: 'RIKA', role: 'Core Orchestrator', emoji: '🧠', capabilities: ['orchestration', 'planning', 'coordination'] },
            { id: 'echo', name: 'Echo', role: 'Security Specialist', emoji: '🔐', capabilities: ['security-analysis', 'threat-assessment', 'compliance'] },
            { id: 'rig', name: 'Rig', role: '3D Creative', emoji: '🎨', capabilities: ['3d-modeling', 'rendering', 'visual-design'] },
            { id: 'scout', name: 'Scout', role: 'Research Agent', emoji: '🔍', capabilities: ['research', 'citations', 'fact-checking'] },
            { id: 'kibo', name: 'Kibo', role: 'Learning Assistant', emoji: '🌸', capabilities: ['learning-paths', 'spaced-repetition', 'progress-tracking'] },
            { id: 'craft', name: 'Craft', role: 'Brand Manager', emoji: '🛠️', capabilities: ['content-creation', 'brand-alignment', 'social-media'] },
            { id: 'moda', name: 'Moda', role: 'Fashion Stylist', emoji: '👗', capabilities: ['fashion-advice', 'outfit-coordination', 'style-analysis'] },
            { id: 'mint', name: 'Mint', role: 'Financial Analyst', emoji: '💰', capabilities: ['financial-planning', 'budget-analysis', 'investment-advice'] },
            { id: 'pulse', name: 'Pulse', role: 'Fitness Coach', emoji: '💪', capabilities: ['workout-planning', 'nutrition-guidance', 'health-metrics'] }
        ];

        agentConfigs.forEach(config => {
            this.agents.set(config.id, {
                ...config,
                status: 'active',
                lastActive: Date.now(),
                processingQueue: [],
                metrics: {
                    requestsProcessed: 0,
                    averageResponseTime: 0,
                    errorRate: 0
                }
            });
        });

        console.log(`🤖 Agents initialized: ${this.agents.size} specialists ready`);
    }

    setupWebhooks() {
        // Webhook endpoints will be set up in routes
        console.log('🌐 Webhook endpoints prepared for Twilio, Telegram, and external integrations');
    }

    async setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws:", "wss:"],
                    mediaSrc: ["'self'", "data:", "blob:"]
                }
            }
        }));

        this.app.use(compression());
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use('/temp', express.static(path.join(__dirname, 'temp')));
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    async setupRoutes() {
        // Health checks
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                safeMode: this.safeMode,
                uptime: process.uptime(),
                timestamp: Date.now(),
                version: '3.0.0',
                bootPhases: this.bootPhases
            });
        });

        this.app.get('/healthz', (req, res) => {
            // Kubernetes-style health check
            const toolBrokerHealth = this.toolBroker?.getHealthStatus() || {};
            const hasHealthyProviders = Object.values(toolBrokerHealth).some(status => status.healthy);
            
            if (hasHealthyProviders || this.safeMode) {
                res.status(200).json({ status: 'ok' });
            } else {
                res.status(503).json({ status: 'degraded', details: toolBrokerHealth });
            }
        });

        // API Routes
        this.app.get('/api/agents', (req, res) => {
            const agents = Array.from(this.agents.entries()).map(([id, agent]) => ({
                id,
                name: agent.name,
                role: agent.role,
                emoji: agent.emoji,
                status: agent.status,
                capabilities: agent.capabilities,
                metrics: agent.metrics
            }));
            res.json(agents);
        });

        this.app.get('/api/metrics', (req, res) => {
            res.json({
                ...this.metrics,
                intelligence: this.intelligenceRouter?.getStatus() || {},
                toolBroker: this.toolBroker?.getHealthStatus() || {},
                voice: this.voiceEngine?.getVoiceMetrics() || {}
            });
        });

        this.app.get('/api/system-status', (req, res) => {
            res.json(this.getSystemStatus());
        });

        // Webhook endpoints
        this.app.post('/webhooks/twilio/voice', async (req, res) => {
            try {
                const { CallSid, From, To, SpeechResult } = req.body;
                
                if (SpeechResult) {
                    // Process voice input
                    const response = await this.processVoiceWebhook(SpeechResult, { CallSid, From, To });
                    res.type('text/xml').send(response);
                } else {
                    // Initial call - send greeting
                    const twiml = this.voiceEngine?.generateTwiMLResponse(
                        'Hello! I am RIKA, your AI assistant. How can I help you today?',
                        { gather: true }
                    );
                    res.type('text/xml').send(twiml);
                }
            } catch (error) {
                console.error('Twilio webhook error:', error);
                res.status(500).send('Internal server error');
            }
        });

        this.app.post('/webhooks/twilio/recording', (req, res) => {
            const { RecordingUrl, CallSid, RecordingStatus } = req.body;
            console.log(`📹 Recording ${RecordingStatus}: ${RecordingUrl} for call ${CallSid}`);
            res.status(200).send('OK');
        });

        this.app.post('/webhooks/telegram', async (req, res) => {
            try {
                await this.processTelegramWebhook(req.body);
                res.status(200).send('OK');
            } catch (error) {
                console.error('Telegram webhook error:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Serve main application
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // Safe mode panic overlay
        if (this.safeMode) {
            this.app.get('/safe-mode', (req, res) => {
                res.json({
                    message: 'RIKA is running in Safe Mode',
                    bootPhases: this.bootPhases,
                    availableFeatures: this.getSafeModeFeatures(),
                    recovery: 'Set RIKA_SAFE_MODE=false to attempt full boot'
                });
            });
        }

        // Error handling
        this.app.use((err, req, res, next) => {
            console.error('Express error:', err.stack);
            res.status(500).json({ 
                error: 'Something went wrong!',
                safeMode: this.safeMode,
                timestamp: Date.now()
            });
        });
    }

    async setupWebSockets() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 Client connected: ${socket.id}`);
            this.metrics.activeConnections++;

            // Send system status on connection
            socket.emit('system_status', this.getSystemStatus());
            socket.emit('safe_mode_status', { 
                safeMode: this.safeMode,
                bootPhases: this.bootPhases 
            });

            // Enhanced chat message handling with Intelligence Router
            socket.on('chat_message', async (data) => {
                const startTime = Date.now();
                
                try {
                    const { message, agentId = 'rika', context = {} } = data;
                    
                    // Use Intelligence Router for smart routing
                    const routing = await this.intelligenceRouter.route(message, {
                        ...context,
                        socketId: socket.id,
                        preferredAgent: agentId
                    });

                    if (routing.error) {
                        socket.emit('agent_error', { 
                            message: routing.message,
                            routingId: routing.id 
                        });
                        return;
                    }

                    // Broadcast typing indicator
                    socket.broadcast.emit('agent_typing', { 
                        agentId: routing.targetAgent,
                        routingId: routing.id
                    });

                    // Process with selected agent and QoS tier
                    const response = await this.processAgentRequest(
                        routing.targetAgent, 
                        message, 
                        routing
                    );

                    const totalTime = Date.now() - startTime;
                    this.updateMetrics(totalTime, true);

                    // Send enhanced response
                    socket.emit('agent_response', {
                        ...response,
                        routing: {
                            id: routing.id,
                            agent: routing.targetAgent,
                            qosTier: routing.qosTier.name,
                            processingTime: totalTime,
                            memoryContext: routing.memoryContext,
                            councilAdvice: routing.councilAdvice
                        }
                    });

                    socket.broadcast.emit('agent_stopped_typing', { 
                        agentId: routing.targetAgent 
                    });

                } catch (error) {
                    const totalTime = Date.now() - startTime;
                    this.updateMetrics(totalTime, false);
                    
                    console.error('Chat message processing error:', error);
                    socket.emit('agent_error', { 
                        message: 'Failed to process request', 
                        error: error.message 
                    });
                }
            });

            // Voice session handling
            socket.on('voice_start', async (data) => {
                try {
                    const session = await this.voiceEngine?.startVoiceSession(socket.id, data);
                    socket.emit('voice_session_created', session);
                } catch (error) {
                    socket.emit('voice_error', { error: error.message });
                }
            });

            socket.on('voice_message', async (data) => {
                try {
                    if (this.voiceEngine) {
                        await this.voiceEngine.processVoiceMessage(
                            data.sessionId, 
                            Buffer.from(data.audioData, 'base64'),
                            data.options
                        );
                    }
                } catch (error) {
                    socket.emit('voice_error', { error: error.message });
                }
            });

            socket.on('voice_end', async (data) => {
                try {
                    await this.voiceEngine?.endVoiceSession(data.sessionId);
                } catch (error) {
                    socket.emit('voice_error', { error: error.message });
                }
            });

            // System queries
            socket.on('get_system_status', () => {
                socket.emit('system_status', this.getSystemStatus());
            });

            socket.on('get_tool_broker_status', () => {
                socket.emit('tool_broker_status', this.toolBroker?.getHealthStatus() || {});
            });

            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
                this.metrics.activeConnections--;
            });
        });
    }

    setupCronJobs() {
        // Daily cost reset at midnight UTC
        cron.schedule('0 0 * * *', () => {
            this.intelligenceRouter?.resetDailyCosts();
            console.log('💰 Daily cost tracker reset');
        });

        // Health check every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.performSystemHealthCheck();
        });

        // Memory cleanup every hour
        cron.schedule('0 * * * *', () => {
            this.performMemoryCleanup();
        });

        console.log('⏰ Cron jobs scheduled: cost reset, health checks, memory cleanup');
    }

    // Agent Processing
    async processAgentRequest(agentId, message, routing) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        const startTime = Date.now();
        
        // Simulate processing based on QoS tier
        const processingTime = this.getProcessingTime(agentId, message, routing.qosTier);
        await this.delay(processingTime);

        const response = await this.generateAgentResponse(agentId, message, routing);
        const endTime = Date.now();

        // Update agent metrics
        agent.metrics.requestsProcessed++;
        agent.metrics.averageResponseTime = (agent.metrics.averageResponseTime + (endTime - startTime)) / 2;
        agent.lastActive = endTime;

        return {
            agent: agentId,
            response: response,
            processingTime: endTime - startTime,
            timestamp: endTime,
            qosTier: routing.qosTier.name
        };
    }

    async generateAgentResponse(agentId, message, routing) {
        // Use Tool Broker for enhanced responses when available
        if (this.toolBroker?.providers.has('openai') && !this.safeMode) {
            try {
                const systemPrompt = this.getAgentSystemPrompt(agentId);
                const response = await this.toolBroker.callProvider('openai', 'chat', {
                    model: routing.qosTier.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    maxTokens: routing.qosTier.maxTokens,
                    temperature: routing.qosTier.temperature
                });

                return response.choices[0].message.content;
            } catch (error) {
                console.warn(`OpenAI failed for ${agentId}, using fallback:`, error.message);
            }
        }

        // Fallback responses
        return this.getFallbackResponse(agentId, message, routing);
    }

    getAgentSystemPrompt(agentId) {
        const prompts = {
            rika: "You are RIKA, the core AI orchestrator. Coordinate tasks efficiently and provide clear guidance.",
            echo: "You are Echo, a security specialist. Analyze threats, assess risks, and recommend security measures.",
            rig: "You are Rig, a 3D creative specialist. Help with modeling, rendering, and visual design projects.",
            scout: "You are Scout, a research agent. Gather information, verify facts, and provide citations.",
            kibo: "You are Kibo, a learning assistant. Create study plans, track progress, and optimize learning.",
            craft: "You are Craft, a brand manager. Create aligned content and optimize for engagement.",
            moda: "You are Moda, a fashion stylist. Provide outfit advice and style recommendations.",
            mint: "You are Mint, a financial analyst. Help with budgets, investments, and financial planning.",
            pulse: "You are Pulse, a fitness coach. Design workouts and provide health guidance."
        };

        return prompts[agentId] || prompts.rika;
    }

    getFallbackResponse(agentId, message, routing) {
        const agent = this.agents.get(agentId);
        const responses = {
            rika: `🧠 I'm coordinating your request: "${message}". Using ${routing.qosTier.name} QoS tier for optimal processing.`,
            echo: `🔐 Security analysis of: "${message}". Implementing ${routing.qosTier.name} security protocols.`,
            rig: `🎨 Creative analysis of: "${message}". Processing with ${routing.qosTier.name} rendering pipeline.`,
            scout: `🔍 Research initiated for: "${message}". Using ${routing.qosTier.name} search methodology.`,
            kibo: `🌸 Learning path created for: "${message}". Optimizing with ${routing.qosTier.name} algorithm.`,
            craft: `🛠️ Brand content for: "${message}". Crafting with ${routing.qosTier.name} alignment.`,
            moda: `👗 Style analysis of: "${message}". Coordinating with ${routing.qosTier.name} fashion AI.`,
            mint: `💰 Financial analysis of: "${message}". Processing with ${routing.qosTier.name} algorithms.`,
            pulse: `💪 Fitness plan for: "${message}". Optimizing with ${routing.qosTier.name} methodology.`
        };

        return responses[agentId] || `${agent?.emoji || '🤖'} ${agent?.name || 'Agent'} processing: "${message}"`;
    }

    getProcessingTime(agentId, message, qosTier) {
        const baseTimes = {
            rika: 1200, echo: 800, rig: 2000, scout: 1500,
            kibo: 600, craft: 900, moda: 700, mint: 1000, pulse: 500
        };

        const baseTime = baseTimes[agentId] || 1000;
        const qosMultiplier = qosTier.name === 'realtime' ? 0.5 : qosTier.name === 'batch' ? 1.5 : 1.0;
        const complexity = Math.min(message.length / 20, 500);

        return Math.floor((baseTime + complexity) * qosMultiplier);
    }

    // System Management
    async enterSafeMode(error) {
        this.safeMode = true;
        console.log('🚨 ENTERING SAFE MODE 🚨');
        console.log('Reason:', error.message);
        console.log('Available features will be limited to ensure stability');
        
        // Emit safe mode status to all connected clients
        this.io.emit('safe_mode_entered', {
            reason: error.message,
            timestamp: Date.now(),
            availableFeatures: this.getSafeModeFeatures()
        });
    }

    getSafeModeFeatures() {
        return [
            'Basic chat interface',
            'Agent selection', 
            'System status monitoring',
            'Health checks',
            'Limited responses (no external APIs)'
        ];
    }

    performSystemHealthCheck() {
        const health = {
            timestamp: Date.now(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            agents: this.agents.size,
            connections: this.metrics.activeConnections,
            toolBroker: this.toolBroker?.getHealthStatus() || {},
            intelligence: this.intelligenceRouter?.getStatus() || {}
        };

        // Emit to monitoring systems
        this.io.emit('system_health', health);
    }

    performMemoryCleanup() {
        // Clean up old conversations
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        let cleaned = 0;

        for (const [id, conversation] of this.conversations) {
            if (conversation.lastActivity < cutoff) {
                this.conversations.delete(id);
                cleaned++;
            }
        }

        // Clean intelligence router memory
        this.intelligenceRouter?.cleanupMemory('shortTerm');
        this.intelligenceRouter?.cleanupMemory('midTerm');

        console.log(`🧹 Memory cleanup: ${cleaned} old conversations removed`);
    }

    // Webhook Processors
    async processVoiceWebhook(speechResult, context) {
        try {
            const response = await this.generateAgentResponse('rika', speechResult, {
                qosTier: this.intelligenceRouter?.qosTiers.realtime || { name: 'realtime', model: 'gpt-3.5-turbo' }
            });

            return this.voiceEngine?.generateTwiMLResponse(response, { 
                gather: true, 
                hangup: false 
            });
        } catch (error) {
            console.error('Voice webhook processing failed:', error);
            return this.voiceEngine?.generateTwiMLResponse(
                'I apologize, but I encountered an error processing your request. Please try again.',
                { hangup: true }
            );
        }
    }

    async processTelegramWebhook(update) {
        if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            // Check whitelist
            const whitelist = process.env.TELEGRAM_CHAT_WHITELIST?.split(',') || [];
            if (whitelist.length > 0 && !whitelist.includes(chatId.toString())) {
                console.log(`⚠️ Telegram message from unauthorized chat: ${chatId}`);
                return;
            }

            try {
                const response = await this.generateAgentResponse('rika', text, {
                    qosTier: this.intelligenceRouter?.qosTiers.interactive || { name: 'interactive', model: 'gpt-4' }
                });

                if (this.toolBroker?.providers.has('telegram')) {
                    await this.toolBroker.callProvider('telegram', 'sendMessage', {
                        chatId: chatId,
                        text: response
                    });
                }
            } catch (error) {
                console.error('Telegram webhook processing failed:', error);
            }
        }
    }

    // Utility Methods
    updateMetrics(responseTime, success) {
        this.metrics.totalRequests++;
        this.metrics.averageResponseTime = (this.metrics.averageResponseTime + responseTime) / 2;
        
        if (!success) {
            this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
        }
    }

    getSystemStatus() {
        return {
            safeMode: this.safeMode,
            bootPhases: this.bootPhases,
            agents: Array.from(this.agents.entries()).map(([id, agent]) => ({
                id,
                name: agent.name,
                role: agent.role,
                emoji: agent.emoji,
                status: agent.status,
                lastActive: agent.lastActive,
                queueLength: agent.processingQueue.length,
                metrics: agent.metrics
            })),
            metrics: this.metrics,
            uptime: process.uptime(),
            timestamp: Date.now(),
            version: '3.0.0'
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Server startup
    start() {
        const PORT = process.env.PORT || 3001;
        this.server.listen(PORT, () => {
            console.log('🌟'.repeat(20));
            console.log(`🚀 RIKA 2.0 v3 Ops Center running on port ${PORT}`);
            console.log(`🌐 Access at: http://localhost:${PORT}`);
            console.log(`🧠 Agent orchestrator: ${this.agents.size} specialists ready`);
            console.log(`🛠️ Tool Broker: ${this.toolBroker?.getProviderList().length || 0} SaaS providers`);
            console.log(`🎤 Voice Engine: ${this.voiceEngine ? 'ElevenLabs + Whisper ready' : 'disabled'}`);
            console.log(`⚡ Intelligence Router: QoS tiers, Memory shaping, Council check active`);
            console.log(`🛡️ Safe Mode: ${this.safeMode ? 'ENABLED' : 'disabled'}`);
            console.log('🌟'.repeat(20));
        });
    }
}

// Initialize and start RIKA
const rika = new RikaOrchestrator();
rika.start();

module.exports = rika;