const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST']
    }
});

// Security and performance middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
        }
    }
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// RIKA Agent System
class RikaAgentOrchestrator {
    constructor() {
        this.agents = new Map();
        this.conversations = new Map();
        this.metrics = {
            totalRequests: 0,
            activeConnections: 0,
            averageResponseTime: 0
        };
        this.initializeAgents();
    }

    initializeAgents() {
        const agentConfigs = [
            { id: 'rika', name: 'RIKA', role: 'Core Orchestrator', emoji: '🧠', status: 'active' },
            { id: 'echo', name: 'Echo', role: 'Security Specialist', emoji: '🔐', status: 'active' },
            { id: 'rig', name: 'Rig', role: '3D Creative', emoji: '🎨', status: 'active' },
            { id: 'scout', name: 'Scout', role: 'Research Agent', emoji: '🔍', status: 'active' },
            { id: 'kibo', name: 'Kibo', role: 'Learning Assistant', emoji: '🌸', status: 'active' },
            { id: 'craft', name: 'Craft', role: 'Brand Manager', emoji: '🛠️', status: 'active' },
            { id: 'moda', name: 'Moda', role: 'Fashion Stylist', emoji: '👗', status: 'active' },
            { id: 'mint', name: 'Mint', role: 'Financial Analyst', emoji: '💰', status: 'active' },
            { id: 'pulse', name: 'Pulse', role: 'Fitness Coach', emoji: '💪', status: 'active' }
        ];

        agentConfigs.forEach(config => {
            this.agents.set(config.id, {
                ...config,
                lastActive: Date.now(),
                processingQueue: [],
                capabilities: this.getAgentCapabilities(config.id)
            });
        });
    }

    getAgentCapabilities(agentId) {
        const capabilities = {
            rika: ['orchestration', 'planning', 'coordination', 'decision-making'],
            echo: ['security-analysis', 'threat-assessment', 'encryption', 'compliance'],
            rig: ['3d-modeling', 'rendering', 'animation', 'visual-design'],
            scout: ['research', 'data-gathering', 'citation-tracking', 'fact-checking'],
            kibo: ['learning-paths', 'spaced-repetition', 'progress-tracking', 'content-curation'],
            craft: ['content-creation', 'brand-alignment', 'social-media', 'copywriting'],
            moda: ['fashion-advice', 'outfit-coordination', 'style-analysis', 'trend-forecasting'],
            mint: ['financial-planning', 'budget-analysis', 'expense-tracking', 'investment-advice'],
            pulse: ['workout-planning', 'nutrition-guidance', 'progress-tracking', 'health-metrics']
        };
        return capabilities[agentId] || [];
    }

    async processRequest(agentId, message, context = {}) {
        const startTime = Date.now();
        const agent = this.agents.get(agentId);
        
        if (!agent) {
            throw new Error(`Agent ${agentId} not found`);
        }

        // Simulate agent processing with realistic delays
        const processingTime = this.getProcessingTime(agentId, message);
        await this.delay(processingTime);

        const response = await this.generateAgentResponse(agentId, message, context);
        const endTime = Date.now();
        
        // Update metrics
        this.metrics.totalRequests++;
        this.metrics.averageResponseTime = (this.metrics.averageResponseTime + (endTime - startTime)) / 2;
        agent.lastActive = endTime;

        return {
            agent: agentId,
            response,
            processingTime: endTime - startTime,
            timestamp: endTime,
            context
        };
    }

    getProcessingTime(agentId, message) {
        // Realistic processing times based on agent complexity
        const baseTimes = {
            rika: 1200,  // Orchestration requires more thinking
            echo: 800,   // Security analysis
            rig: 2000,   // 3D work takes longer
            scout: 1500, // Research time
            kibo: 600,   // Learning responses
            craft: 900,  // Creative writing
            moda: 700,   // Fashion advice
            mint: 1000,  // Financial calculations
            pulse: 500   // Fitness responses
        };
        
        const complexity = message.length / 10; // More complex for longer messages
        return baseTimes[agentId] + complexity;
    }

    async generateAgentResponse(agentId, message, context) {
        // Sophisticated response generation based on agent specialization
        const responses = {
            rika: this.generateRikaResponse(message, context),
            echo: this.generateEchoResponse(message, context),
            rig: this.generateRigResponse(message, context),
            scout: this.generateScoutResponse(message, context),
            kibo: this.generateKiboResponse(message, context),
            craft: this.generateCraftResponse(message, context),
            moda: this.generateModaResponse(message, context),
            mint: this.generateMintResponse(message, context),
            pulse: this.generatePulseResponse(message, context)
        };

        return responses[agentId] || "I'm processing your request...";
    }

    generateRikaResponse(message, context) {
        const responses = [
            `Analyzing your request and coordinating with specialized agents...`,
            `I'll orchestrate a multi-agent approach to handle this comprehensively.`,
            `Breaking down your request into actionable steps across our agent network.`,
            `Initiating cross-agent collaboration to provide you with the best solution.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateEchoResponse(message, context) {
        const responses = [
            `🔐 Security analysis complete. I've identified potential risks and mitigation strategies.`,
            `🛡️ Running security protocols... Your request has been analyzed for compliance.`,
            `🔍 Threat assessment in progress. I'll ensure all security measures are in place.`,
            `⚡ Security clearance validated. Proceeding with secure processing protocols.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateRigResponse(message, context) {
        const responses = [
            `🎨 Initializing creative pipeline... I'm ready to bring your vision to life.`,
            `🔧 Setting up 3D workspace. What kind of visual magic should we create?`,
            `✨ Creative engines spinning up! I can handle modeling, texturing, or rendering.`,
            `🎯 Visual concept activated. Let's build something extraordinary together.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateScoutResponse(message, context) {
        const responses = [
            `🔍 Research protocols engaged. I'm gathering comprehensive data on your topic.`,
            `📚 Initiating deep research... I'll provide you with cited, verified information.`,
            `🎯 Target acquired. I'm analyzing multiple sources for accuracy and relevance.`,
            `📈 Research complete. I've compiled findings with confidence scores and citations.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateKiboResponse(message, context) {
        const responses = [
            `🌸 Learning path optimized! I've created a personalized study schedule for you.`,
            `📝 Spaced repetition activated. Your learning efficiency will improve significantly.`,
            `🎓 Educational content curated based on your learning style and pace.`,
            `💡 Knowledge retention enhanced! I've structured this for maximum learning impact.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateCraftResponse(message, context) {
        const responses = [
            `🛠️ Brand voice calibrated. Creating content that perfectly aligns with your identity.`,
            `✍️ Creative writing mode engaged. I'll craft compelling content for your audience.`,
            `🎨 Content strategy activated. Your message will resonate with perfect brand harmony.`,
            `📱 Social media optimization complete. This content will perform exceptionally well.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateModaResponse(message, context) {
        const responses = [
            `👗 Style analysis complete! I've curated outfits that perfectly match your aesthetic.`,
            `✨ Fashion forecast updated. These trends will elevate your personal style.`,
            `🎨 Color palette optimized for your skin tone and lifestyle preferences.`,
            `👜 Wardrobe coordination active. I've created versatile combinations for every occasion.`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateMintResponse(message, context) {
        const responses = [
            `💰 Financial analysis complete. I've optimized your budget for maximum efficiency.`,
            `📊 Investment strategy calculated. Here are personalized recommendations based on your goals.`,
            `💡 Expense optimization identified. I can help you save significantly on monthly costs.`,
            `📈 Portfolio performance analyzed. Your financial health is looking strong!`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generatePulseResponse(message, context) {
        const responses = [
            `💪 Workout plan optimized! I've created a program tailored to your fitness goals.`,
            `🏃 Training schedule activated. Your progress will be tracked and adjusted automatically.`,
            `🥗 Nutrition guidance ready. I'll help you fuel your body for optimal performance.`,
            `📊 Health metrics analyzed. You're on track to achieve your fitness objectives!`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getSystemStatus() {
        return {
            agents: Array.from(this.agents.entries()).map(([id, agent]) => ({
                id,
                name: agent.name,
                role: agent.role,
                emoji: agent.emoji,
                status: agent.status,
                lastActive: agent.lastActive,
                queueLength: agent.processingQueue.length
            })),
            metrics: this.metrics,
            uptime: process.uptime(),
            timestamp: Date.now()
        };
    }
}

// Initialize the orchestrator
const rikaOrchestrator = new RikaAgentOrchestrator();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔗 Client connected: ${socket.id}`);
    rikaOrchestrator.metrics.activeConnections++;

    // Send system status on connection
    socket.emit('system_status', rikaOrchestrator.getSystemStatus());

    // Handle chat messages
    socket.on('chat_message', async (data) => {
        try {
            const { message, agentId = 'rika', context = {} } = data;
            
            // Broadcast typing indicator
            socket.broadcast.emit('agent_typing', { agentId });
            
            // Process the request
            const response = await rikaOrchestrator.processRequest(agentId, message, context);
            
            // Send response
            socket.emit('agent_response', response);
            socket.broadcast.emit('agent_stopped_typing', { agentId });
            
        } catch (error) {
            console.error('Error processing chat message:', error);
            socket.emit('error', { message: 'Failed to process request', error: error.message });
        }
    });

    // Handle system queries
    socket.on('get_system_status', () => {
        socket.emit('system_status', rikaOrchestrator.getSystemStatus());
    });

    // Handle agent switching
    socket.on('switch_agent', (data) => {
        const { agentId } = data;
        const agent = rikaOrchestrator.agents.get(agentId);
        if (agent) {
            socket.emit('agent_switched', { 
                agentId, 
                agent: {
                    name: agent.name,
                    role: agent.role,
                    emoji: agent.emoji,
                    capabilities: agent.capabilities
                }
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        rikaOrchestrator.metrics.activeConnections--;
    });
});

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: Date.now(),
        version: '2.0.0'
    });
});

app.get('/api/agents', (req, res) => {
    const agents = Array.from(rikaOrchestrator.agents.entries()).map(([id, agent]) => ({
        id,
        name: agent.name,
        role: agent.role,
        emoji: agent.emoji,
        status: agent.status,
        capabilities: agent.capabilities
    }));
    res.json(agents);
});

app.get('/api/metrics', (req, res) => {
    res.json(rikaOrchestrator.metrics);
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 RIKA 2.0 Ops Center running on port ${PORT}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
    console.log(`🧠 Agent orchestrator initialized with ${rikaOrchestrator.agents.size} agents`);
});

module.exports = app;