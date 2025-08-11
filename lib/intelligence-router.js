// RIKA 2.0 - Intelligence Layer: Intent Router + QoS + Memory + Council + Cost Sentinel
const { v4: uuidv4 } = require('uuid');

class IntelligenceRouter {
    constructor(toolBroker) {
        this.toolBroker = toolBroker;
        this.intentCache = new Map();
        this.memoryStore = new Map();
        this.costTracker = {
            daily: 0,
            monthly: 0,
            requests: 0,
            tokens: 0
        };
        this.qosTiers = this.initQoSTiers();
        this.memoryShaping = this.initMemoryShaping();
        this.councilMembers = ['echo', 'scout', 'kibo'];
    }

    initQoSTiers() {
        return {
            realtime: {
                name: 'realtime',
                maxTokens: 512,
                temperature: 0.3,
                model: 'gpt-3.5-turbo',
                timeoutMs: 800,
                priority: 1,
                costMultiplier: 1.5,
                description: 'PTT voice & calls - ultra fast'
            },
            interactive: {
                name: 'interactive', 
                maxTokens: 1024,
                temperature: 0.7,
                model: 'gpt-4',
                timeoutMs: 3000,
                priority: 2,
                costMultiplier: 1.0,
                description: 'chat & light tools - balanced'
            },
            batch: {
                name: 'batch',
                maxTokens: 4096,
                temperature: 0.5,
                model: 'gpt-4',
                timeoutMs: 15000,
                priority: 3,
                costMultiplier: 0.7,
                description: 'research/long tasks - thorough'
            }
        };
    }

    initMemoryShaping() {
        return {
            shortTerm: new Map(), // Current conversation
            midTerm: new Map(),   // Project summaries
            longTerm: new Map(),  // Vector store refs
            pins: new Set(),      // Pinned important items
            decay: {
                shortTerm: 3600000,    // 1 hour
                midTerm: 86400000,     // 1 day
                longTerm: 604800000    // 1 week
            }
        };
    }

    async route(message, context = {}) {
        const routingId = uuidv4();
        const startTime = Date.now();

        try {
            console.log(`🧠 Intelligence Router: Processing ${routingId}`);

            // 1. Intent Classification
            const intent = await this.classifyIntent(message, context);
            
            // 2. QoS Tier Selection
            const qosTier = this.selectQoSTier(intent, context);
            
            // 3. Memory Context Assembly
            const memoryContext = await this.assembleMemoryContext(message, intent);
            
            // 4. Cost Check
            const costCheck = await this.checkCostSentinel(qosTier, message);
            if (!costCheck.allowed) {
                return this.createErrorResponse(costCheck.reason, routingId);
            }
            
            // 5. Agent Selection
            const targetAgent = this.selectTargetAgent(intent, context);
            
            // 6. Council Check (if needed)
            const needsCouncil = this.requiresCouncilCheck(intent, targetAgent);
            let councilAdvice = null;
            if (needsCouncil) {
                councilAdvice = await this.performCouncilCheck(message, intent, targetAgent);
            }

            const processingTime = Date.now() - startTime;
            
            const routing = {
                id: routingId,
                intent: intent,
                targetAgent: targetAgent,
                qosTier: qosTier,
                memoryContext: memoryContext,
                councilAdvice: councilAdvice,
                processingTime: processingTime,
                timestamp: Date.now()
            };

            console.log(`✅ Routing complete: ${targetAgent} (${qosTier.name}) - ${processingTime}ms`);
            return routing;

        } catch (error) {
            console.error(`❌ Routing failed for ${routingId}:`, error);
            return this.createErrorResponse(error.message, routingId);
        }
    }

    async classifyIntent(message, context) {
        const cacheKey = `intent_${this.hashMessage(message)}`;
        const cached = this.intentCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < 300000)) { // 5min cache
            return cached.intent;
        }

        try {
            const classification = await this.toolBroker.callProvider('openai', 'chat', {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `Classify the user's intent. Respond with JSON:
{
  "category": "security|creative|research|learning|content|fashion|finance|fitness|general",
  "confidence": 0.0-1.0,
  "complexity": "simple|moderate|complex",
  "urgency": "low|medium|high",
  "requiresTools": true|false,
  "estimatedTokens": number
}`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                maxTokens: 200,
                temperature: 0.1
            });

            const intent = JSON.parse(classification.choices[0].message.content);
            
            // Add context enhancements
            intent.hasContext = !!context.conversationId;
            intent.isFollowUp = !!context.previousMessage;
            intent.userPreferences = context.userPreferences || {};

            // Cache the result
            this.intentCache.set(cacheKey, {
                intent,
                timestamp: Date.now()
            });

            return intent;

        } catch (error) {
            console.warn('Intent classification failed, using fallback:', error.message);
            return this.getFallbackIntent(message);
        }
    }

    selectQoSTier(intent, context) {
        // Voice/call context gets realtime tier
        if (context.isVoice || context.isCall) {
            return this.qosTiers.realtime;
        }

        // High urgency gets interactive tier
        if (intent.urgency === 'high') {
            return this.qosTiers.interactive;
        }

        // Complex research gets batch tier
        if (intent.complexity === 'complex' && intent.category === 'research') {
            return this.qosTiers.batch;
        }

        // Default to interactive for chat
        return this.qosTiers.interactive;
    }

    async assembleMemoryContext(message, intent) {
        const context = {
            shortTerm: [],
            midTerm: [],
            longTerm: [],
            pins: []
        };

        // Get recent conversation (short-term)
        const recentMessages = Array.from(this.memoryShaping.shortTerm.entries())
            .slice(-10)
            .map(([key, value]) => value);
        context.shortTerm = recentMessages;

        // Get relevant project context (mid-term)
        if (intent.category) {
            const projectContext = this.memoryShaping.midTerm.get(intent.category);
            if (projectContext) {
                context.midTerm.push(projectContext);
            }
        }

        // Get pinned items
        context.pins = Array.from(this.memoryShaping.pins);

        // Vector search for long-term memory (if available)
        if (this.toolBroker.providers.has('pinecone')) {
            try {
                // This would be implemented with actual vector embeddings
                console.log('🔍 Searching long-term memory...');
            } catch (error) {
                console.warn('Vector search failed:', error.message);
            }
        }

        return context;
    }

    async checkCostSentinel(qosTier, message) {
        const dailyBudget = parseFloat(process.env.DAILY_BUDGET_USD) || 10.0;
        const estimatedCost = this.estimateRequestCost(qosTier, message);

        if (this.costTracker.daily + estimatedCost > dailyBudget) {
            return {
                allowed: false,
                reason: `Daily budget exceeded: $${this.costTracker.daily.toFixed(2)} + $${estimatedCost.toFixed(2)} > $${dailyBudget}`,
                currentSpend: this.costTracker.daily,
                estimatedCost,
                dailyBudget
            };
        }

        // Update cost tracking
        this.costTracker.daily += estimatedCost;
        this.costTracker.requests++;

        return {
            allowed: true,
            estimatedCost,
            remainingBudget: dailyBudget - this.costTracker.daily
        };
    }

    selectTargetAgent(intent, context) {
        const agentMap = {
            security: 'echo',
            creative: 'rig',
            research: 'scout',
            learning: 'kibo',
            content: 'craft',
            fashion: 'moda',
            finance: 'mint',
            fitness: 'pulse',
            general: 'rika'
        };

        const targetAgent = agentMap[intent.category] || 'rika';
        
        // Override with context preferences
        if (context.preferredAgent && this.isAgentAvailable(context.preferredAgent)) {
            return context.preferredAgent;
        }

        return targetAgent;
    }

    requiresCouncilCheck(intent, targetAgent) {
        // Council check for high-stakes decisions
        if (intent.urgency === 'high' && intent.complexity === 'complex') {
            return true;
        }

        // Council check for financial decisions
        if (targetAgent === 'mint' && intent.estimatedTokens > 1000) {
            return true;
        }

        // Council check for security-related tasks
        if (targetAgent === 'echo') {
            return true;
        }

        return false;
    }

    async performCouncilCheck(message, intent, targetAgent) {
        const councilStartTime = Date.now();
        const budgetMs = 120; // 120ms budget for council check
        
        console.log(`🏛️ Council check for ${targetAgent}: ${this.councilMembers.join(', ')}`);

        try {
            const councilPrompt = `Brief council review (max 20 words):
Message: "${message}"
Target Agent: ${targetAgent}
Intent: ${intent.category} (${intent.confidence} confidence)

Flags to check: missing_source, risky_action, cost_spike

Respond with JSON: {"flags": ["flag1", "flag2"], "recommendation": "proceed|caution|block", "reason": "brief reason"}`;

            const councilResponse = await this.toolBroker.callProvider('openai', 'chat', {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: councilPrompt }],
                maxTokens: 100,
                temperature: 0.1
            }, { maxRetries: 1 });

            const advice = JSON.parse(councilResponse.choices[0].message.content);
            const councilTime = Date.now() - councilStartTime;

            console.log(`✅ Council decision: ${advice.recommendation} (${councilTime}ms)`);

            return {
                ...advice,
                councilTime,
                withinBudget: councilTime <= budgetMs
            };

        } catch (error) {
            console.warn('Council check failed, allowing by default:', error.message);
            return {
                flags: [],
                recommendation: 'proceed',
                reason: 'council_unavailable',
                councilTime: Date.now() - councilStartTime
            };
        }
    }

    // Memory Management
    storeShortTermMemory(key, value) {
        this.memoryShaping.shortTerm.set(key, {
            ...value,
            timestamp: Date.now()
        });

        // Cleanup old entries
        this.cleanupMemory('shortTerm');
    }

    storeMidTermMemory(category, summary) {
        this.memoryShaping.midTerm.set(category, {
            summary,
            timestamp: Date.now(),
            accessCount: (this.memoryShaping.midTerm.get(category)?.accessCount || 0) + 1
        });
    }

    pinToMemory(item) {
        this.memoryShaping.pins.add({
            ...item,
            pinnedAt: Date.now()
        });
    }

    cleanupMemory(type) {
        const store = this.memoryShaping[type];
        const maxAge = this.memoryShaping.decay[type];
        const now = Date.now();

        for (const [key, value] of store) {
            if (now - value.timestamp > maxAge) {
                store.delete(key);
            }
        }
    }

    // Utility methods
    hashMessage(message) {
        return require('crypto').createHash('md5').update(message).digest('hex').substring(0, 8);
    }

    estimateRequestCost(qosTier, message) {
        const baseCost = {
            'gpt-3.5-turbo': 0.0015, // per 1K tokens
            'gpt-4': 0.03
        };

        const estimatedTokens = Math.ceil(message.length / 3); // Rough estimate
        const modelCost = baseCost[qosTier.model] || baseCost['gpt-3.5-turbo'];
        
        return (estimatedTokens / 1000) * modelCost * qosTier.costMultiplier;
    }

    isAgentAvailable(agentId) {
        // This would check actual agent availability
        return ['rika', 'echo', 'rig', 'scout', 'kibo', 'craft', 'moda', 'mint', 'pulse'].includes(agentId);
    }

    getFallbackIntent(message) {
        return {
            category: 'general',
            confidence: 0.5,
            complexity: 'moderate',
            urgency: 'medium',
            requiresTools: false,
            estimatedTokens: 500
        };
    }

    createErrorResponse(message, routingId) {
        return {
            id: routingId,
            error: true,
            message,
            targetAgent: 'rika',
            qosTier: this.qosTiers.interactive,
            timestamp: Date.now()
        };
    }

    // Status and metrics
    getStatus() {
        return {
            costTracker: this.costTracker,
            memoryStats: {
                shortTerm: this.memoryShaping.shortTerm.size,
                midTerm: this.memoryShaping.midTerm.size,
                longTerm: this.memoryShaping.longTerm.size,
                pins: this.memoryShaping.pins.size
            },
            intentCache: {
                size: this.intentCache.size,
                hitRate: this.getCacheHitRate()
            }
        };
    }

    getCacheHitRate() {
        // This would be tracked over time
        return 0.85; // Placeholder
    }

    resetDailyCosts() {
        this.costTracker.daily = 0;
        this.costTracker.requests = 0;
        console.log('💰 Daily cost tracker reset');
    }
}

module.exports = IntelligenceRouter;