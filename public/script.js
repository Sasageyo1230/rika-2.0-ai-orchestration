// RIKA 2.0 - Advanced AI Orchestration Platform
// Real-time WebSocket Communication & UI Management

class RikaInterface {
    constructor() {
        this.socket = null;
        this.currentAgent = 'rika';
        this.isConnected = false;
        this.messageHistory = [];
        this.agents = new Map();
        this.systemMetrics = {};
        
        this.init();
    }

    async init() {
        try {
            await this.showLoadingScreen();
            await this.initializeSocket();
            this.setupEventListeners();
            this.setupNavigation();
            await this.hideLoadingScreen();
            console.log('🚀 RIKA 2.0 Interface Initialized Successfully');
        } catch (error) {
            console.error('❌ Initialization Error:', error);
            this.showError('Failed to initialize RIKA interface');
        }
    }

    // Loading Screen Management
    async showLoadingScreen() {
        return new Promise(resolve => {
            const loadingScreen = document.getElementById('loading-screen');
            const statusElement = loadingScreen.querySelector('.loading-status');
            
            const messages = [
                'Connecting to agent network...',
                'Initializing AI orchestrator...',
                'Loading system components...',
                'Establishing secure connections...',
                'Calibrating agent interfaces...',
                'Ready to serve!'
            ];

            let messageIndex = 0;
            const updateStatus = () => {
                if (messageIndex < messages.length - 1) {
                    statusElement.textContent = messages[messageIndex];
                    messageIndex++;
                    setTimeout(updateStatus, 500);
                } else {
                    statusElement.textContent = messages[messageIndex];
                    setTimeout(resolve, 800);
                }
            };

            setTimeout(updateStatus, 1000);
        });
    }

    async hideLoadingScreen() {
        return new Promise(resolve => {
            const loadingScreen = document.getElementById('loading-screen');
            const mainApp = document.getElementById('main-app');
            
            loadingScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
            
            setTimeout(resolve, 500);
        });
    }

    // Socket.IO Connection Management
    async initializeSocket() {
        return new Promise((resolve, reject) => {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔗 Connected to RIKA server');
                this.isConnected = true;
                this.updateSystemStatus(true);
                resolve();
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from RIKA server');
                this.isConnected = false;
                this.updateSystemStatus(false);
                this.showError('Connection lost. Attempting to reconnect...');
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error);
                reject(error);
            });

            this.socket.on('system_status', (status) => {
                this.handleSystemStatus(status);
            });

            this.socket.on('agent_response', (response) => {
                this.handleAgentResponse(response);
            });

            this.socket.on('agent_typing', (data) => {
                this.showTypingIndicator(data.agentId);
            });

            this.socket.on('agent_stopped_typing', (data) => {
                this.hideTypingIndicator();
            });

            this.socket.on('agent_switched', (data) => {
                this.handleAgentSwitch(data);
            });

            this.socket.on('error', (error) => {
                console.error('⚠️ Server error:', error);
                this.showError(error.message);
            });

            // Connection timeout
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Message input handling
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Agent selector
        const agentSelector = document.getElementById('agent-selector');
        const selectedAgent = document.getElementById('selected-agent');
        const agentMenu = document.getElementById('agent-menu');

        selectedAgent.addEventListener('click', () => {
            agentMenu.classList.toggle('hidden');
        });

        // Emergency stop
        const emergencyStop = document.getElementById('emergency-stop');
        emergencyStop.addEventListener('click', () => {
            this.handleEmergencyStop();
        });

        // Window resize handling
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Auto-scroll chat messages
        this.setupAutoScroll();
    }

    // Navigation Setup
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });
    }

    navigateToPage(pageId) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

        // Update active page
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`page-${pageId}`).classList.add('active');

        // Update page title and breadcrumb
        const pageTitle = document.getElementById('page-title');
        const breadcrumbCurrent = document.getElementById('breadcrumb-current');
        const formattedTitle = pageId.charAt(0).toUpperCase() + pageId.slice(1);
        
        pageTitle.textContent = formattedTitle;
        breadcrumbCurrent.textContent = formattedTitle;

        console.log(`📄 Navigated to: ${pageId}`);
    }

    // Message Handling
    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message || !this.isConnected) return;

        // Add user message to chat
        this.addMessageToChat('user', message, 'You');
        
        // Clear input
        messageInput.value = '';
        
        // Send to server
        this.socket.emit('chat_message', {
            message: message,
            agentId: this.currentAgent,
            context: {
                timestamp: Date.now(),
                sessionId: this.socket.id
            }
        });

        console.log(`💬 Message sent to ${this.currentAgent}: ${message}`);
    }

    addMessageToChat(type, content, author) {
        const chatMessages = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        
        const currentTime = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${author}</span>
                    <span class="message-time">${currentTime}</span>
                </div>
                <div class="message-text">${content}</div>
            </div>
        `;

        chatMessages.appendChild(messageElement);
        this.scrollToBottom();

        // Add to message history
        this.messageHistory.push({
            type,
            content,
            author,
            timestamp: Date.now()
        });
    }

    handleAgentResponse(response) {
        this.hideTypingIndicator();
        
        const agent = this.agents.get(response.agent);
        const agentName = agent ? agent.name : response.agent.toUpperCase();
        const agentEmoji = agent ? agent.emoji : '🤖';
        
        this.addMessageToChat('agent', response.response, `${agentEmoji} ${agentName}`);
        
        console.log(`🤖 Response from ${agentName} (${response.processingTime}ms):`, response.response);
    }

    showTypingIndicator(agentId) {
        const typingIndicator = document.getElementById('typing-indicator');
        const typingText = typingIndicator.querySelector('.typing-text');
        
        const agent = this.agents.get(agentId);
        const agentName = agent ? agent.name : agentId.toUpperCase();
        
        typingText.textContent = `${agentName} is thinking...`;
        typingIndicator.classList.remove('hidden');
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.classList.add('hidden');
    }

    // System Status Management
    handleSystemStatus(status) {
        this.systemMetrics = status.metrics;
        this.updateAgents(status.agents);
        this.updateSystemMetrics(status.metrics, status.uptime);
        
        console.log('📊 System status updated:', status);
    }

    updateSystemStatus(connected) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.system-status span');
        
        if (connected) {
            statusIndicator.classList.add('active');
            statusText.textContent = 'All Systems Online';
        } else {
            statusIndicator.classList.remove('active');
            statusText.textContent = 'Connection Lost';
        }
    }

    updateAgents(agents) {
        this.agents.clear();
        
        agents.forEach(agent => {
            this.agents.set(agent.id, agent);
        });

        this.renderAgentGrid();
        this.renderAgentSelector();
        this.renderDetailedAgentCards();
    }

    renderAgentGrid() {
        const agentGrid = document.getElementById('agent-status-grid');
        if (!agentGrid) return;

        agentGrid.innerHTML = '';
        
        this.agents.forEach((agent, id) => {
            const agentElement = document.createElement('div');
            agentElement.className = `agent-item ${id === this.currentAgent ? 'active' : ''}`;
            agentElement.dataset.agentId = id;
            
            agentElement.innerHTML = `
                <div class="agent-item-emoji">${agent.emoji}</div>
                <div class="agent-item-name">${agent.name}</div>
                <div class="agent-item-status"></div>
            `;
            
            agentElement.addEventListener('click', () => {
                this.switchAgent(id);
            });
            
            agentGrid.appendChild(agentElement);
        });
    }

    renderAgentSelector() {
        const agentMenu = document.getElementById('agent-menu');
        if (!agentMenu) return;

        agentMenu.innerHTML = '';
        
        this.agents.forEach((agent, id) => {
            const agentOption = document.createElement('div');
            agentOption.className = 'agent-option';
            agentOption.dataset.agentId = id;
            
            agentOption.innerHTML = `
                <span class="agent-emoji">${agent.emoji}</span>
                <div class="agent-info">
                    <span class="agent-name">${agent.name}</span>
                    <span class="agent-role">${agent.role}</span>
                </div>
            `;
            
            agentOption.addEventListener('click', () => {
                this.switchAgent(id);
                agentMenu.classList.add('hidden');
            });
            
            agentMenu.appendChild(agentOption);
        });
    }

    renderDetailedAgentCards() {
        const container = document.getElementById('detailed-agent-cards');
        if (!container) return;

        container.innerHTML = '';
        
        this.agents.forEach((agent, id) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'agent-card';
            
            cardElement.innerHTML = `
                <div class="agent-card-header">
                    <div class="agent-avatar">
                        <span class="agent-emoji">${agent.emoji}</span>
                    </div>
                    <div class="agent-details">
                        <h3>${agent.name}</h3>
                        <p class="agent-role">${agent.role}</p>
                        <div class="agent-status ${agent.status}">
                            <span class="status-dot"></span>
                            ${agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                        </div>
                    </div>
                    <button class="btn ${id === this.currentAgent ? 'btn-primary' : ''}" onclick="rikaInterface.switchAgent('${id}')">
                        ${id === this.currentAgent ? 'Active' : 'Select'}
                    </button>
                </div>
                <div class="agent-capabilities">
                    <h4>Capabilities</h4>
                    <div class="capability-tags">
                        ${agent.capabilities ? agent.capabilities.map(cap => 
                            `<span class="capability-tag">${cap}</span>`
                        ).join('') : ''}
                    </div>
                </div>
                <div class="agent-metrics">
                    <div class="metric">
                        <span class="metric-label">Queue Length</span>
                        <span class="metric-value">${agent.queueLength || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Last Active</span>
                        <span class="metric-value">${this.formatTime(agent.lastActive)}</span>
                    </div>
                </div>
            `;
            
            container.appendChild(cardElement);
        });
    }

    switchAgent(agentId) {
        if (!this.agents.has(agentId)) return;

        this.currentAgent = agentId;
        const agent = this.agents.get(agentId);
        
        // Update selected agent display
        const selectedAgent = document.getElementById('selected-agent');
        selectedAgent.innerHTML = `
            <span class="agent-emoji">${agent.emoji}</span>
            <div class="agent-info">
                <span class="agent-name">${agent.name}</span>
                <span class="agent-role">${agent.role}</span>
            </div>
        `;

        // Update current agent indicator
        const agentIndicator = document.getElementById('current-agent-indicator');
        if (agentIndicator) {
            agentIndicator.innerHTML = `
                <span class="agent-emoji">${agent.emoji}</span>
                <span class="agent-name">${agent.name}</span>
            `;
        }

        // Update agent grid
        document.querySelectorAll('.agent-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.agentId === agentId) {
                item.classList.add('active');
            }
        });

        // Notify server
        this.socket.emit('switch_agent', { agentId });

        console.log(`🔄 Switched to agent: ${agent.name}`);
        
        // Add system message
        this.addMessageToChat('system', 
            `Switched to ${agent.emoji} <strong>${agent.name}</strong> - ${agent.role}`, 
            'System'
        );
    }

    updateSystemMetrics(metrics, uptime) {
        // Update metric displays
        const elements = {
            'total-requests': metrics.totalRequests || 0,
            'active-connections': metrics.activeConnections || 0,
            'avg-response-time': `${Math.round(metrics.averageResponseTime || 0)}ms`,
            'uptime': this.formatUptime(uptime),
            'total-agents': this.agents.size
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // Utility Functions
    formatTime(timestamp) {
        if (!timestamp) return 'Never';
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    formatUptime(seconds) {
        if (!seconds) return '0s';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    setupAutoScroll() {
        const chatMessages = document.getElementById('chat-messages');
        let isUserScrolling = false;
        let scrollTimeout;

        chatMessages.addEventListener('scroll', () => {
            isUserScrolling = true;
            clearTimeout(scrollTimeout);
            
            scrollTimeout = setTimeout(() => {
                const { scrollTop, scrollHeight, clientHeight } = chatMessages;
                if (scrollTop + clientHeight >= scrollHeight - 100) {
                    isUserScrolling = false;
                }
            }, 150);
        });

        // Override scrollToBottom to respect user scrolling
        const originalScrollToBottom = this.scrollToBottom;
        this.scrollToBottom = () => {
            if (!isUserScrolling) {
                originalScrollToBottom.call(this);
            }
        };
    }

    handleResize() {
        // Handle responsive layout changes
        const sidebar = document.querySelector('.sidebar');
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile && !sidebar.classList.contains('mobile-optimized')) {
            sidebar.classList.add('mobile-optimized');
        } else if (!isMobile && sidebar.classList.contains('mobile-optimized')) {
            sidebar.classList.remove('mobile-optimized');
        }
    }

    handleEmergencyStop() {
        if (confirm('Are you sure you want to emergency stop all agents?')) {
            this.socket.emit('emergency_stop');
            this.showError('Emergency stop activated. All agents have been halted.', 'warning');
            console.log('🚨 Emergency stop activated');
        }
    }

    handleAgentSwitch(data) {
        console.log(`🔄 Agent switch confirmed: ${data.agentId}`);
        // Additional logic for successful agent switch
    }

    showError(message, type = 'error') {
        // Create and show error notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'error' ? '❌' : '⚠️'}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        console.log(`${type === 'error' ? '❌' : '⚠️'} ${message}`);
    }

    // Public API
    getSystemStatus() {
        this.socket.emit('get_system_status');
    }

    exportChatHistory() {
        const data = JSON.stringify(this.messageHistory, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `rika-chat-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Initialize RIKA Interface when DOM is loaded
let rikaInterface;
document.addEventListener('DOMContentLoaded', () => {
    rikaInterface = new RikaInterface();
});

// Export for global access
window.rikaInterface = rikaInterface;