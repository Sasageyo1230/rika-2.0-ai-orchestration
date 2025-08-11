// RIKA 2.0 - Voice Engine: ElevenLabs TTS + Whisper STT + Twilio Integration
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

class VoiceEngine {
    constructor(toolBroker, io) {
        this.toolBroker = toolBroker;
        this.io = io;
        this.activeStreams = new Map();
        this.voiceSettings = {
            defaultVoice: 'EXAVITQu4vr4xnSDxMaL', // Bella (ElevenLabs)
            model: 'eleven_turbo_v2', // Fastest model
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true
        };
        this.realtimeTarget = 800; // 800ms target
    }

    // Text-to-Speech with ElevenLabs
    async synthesizeSpeech(text, options = {}) {
        const startTime = Date.now();
        
        try {
            console.log(`🎤 TTS: "${text.substring(0, 50)}..."`);

            const audioStream = await this.toolBroker.callProvider('elevenlabs', 'synthesize', {
                text: text,
                voiceId: options.voiceId || this.voiceSettings.defaultVoice,
                modelId: this.voiceSettings.model,
                voiceSettings: {
                    stability: this.voiceSettings.stability,
                    similarity_boost: this.voiceSettings.similarityBoost,
                    style: this.voiceSettings.style,
                    use_speaker_boost: this.voiceSettings.useSpeakerBoost
                }
            });

            const processingTime = Date.now() - startTime;
            console.log(`✅ TTS completed in ${processingTime}ms`);

            // Save audio temporarily for streaming
            const audioBuffer = await this.streamToBuffer(audioStream);
            const tempFile = path.join(__dirname, '../temp', `tts_${Date.now()}.mp3`);
            
            // Ensure temp directory exists
            const tempDir = path.dirname(tempFile);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            fs.writeFileSync(tempFile, audioBuffer);

            return {
                audioFile: tempFile,
                audioBuffer: audioBuffer,
                processingTime: processingTime,
                text: text,
                voiceId: options.voiceId || this.voiceSettings.defaultVoice,
                withinTarget: processingTime <= this.realtimeTarget
            };

        } catch (error) {
            console.error('❌ TTS failed:', error);
            throw new Error(`Speech synthesis failed: ${error.message}`);
        }
    }

    // Speech-to-Text with Whisper
    async transcribeAudio(audioFile, options = {}) {
        const startTime = Date.now();

        try {
            console.log('🎧 STT: Processing audio file...');

            const transcription = await this.toolBroker.callProvider('openai', 'transcribe', {
                file: fs.createReadStream(audioFile),
                language: options.language || 'en',
                prompt: options.prompt || '',
                response_format: options.format || 'json',
                temperature: options.temperature || 0.0
            });

            const processingTime = Date.now() - startTime;
            console.log(`✅ STT completed in ${processingTime}ms`);

            return {
                text: transcription.text,
                language: transcription.language,
                duration: transcription.duration,
                processingTime: processingTime,
                confidence: this.calculateConfidence(transcription),
                withinTarget: processingTime <= this.realtimeTarget
            };

        } catch (error) {
            console.error('❌ STT failed:', error);
            throw new Error(`Speech transcription failed: ${error.message}`);
        }
    }

    // Real-time Voice Chat
    async startVoiceSession(socketId, options = {}) {
        console.log(`🎤 Starting voice session for ${socketId}`);

        const sessionId = `voice_${Date.now()}_${socketId}`;
        const session = {
            id: sessionId,
            socketId: socketId,
            startTime: Date.now(),
            isActive: true,
            persona: options.persona || 'rika',
            settings: { ...this.voiceSettings, ...options.settings },
            metrics: {
                messagesProcessed: 0,
                averageLatency: 0,
                totalLatency: 0,
                errors: 0
            }
        };

        this.activeStreams.set(sessionId, session);

        // Emit session started
        this.io.to(socketId).emit('voice_session_started', {
            sessionId: sessionId,
            persona: session.persona,
            realtimeTarget: this.realtimeTarget
        });

        return session;
    }

    async processVoiceMessage(sessionId, audioData, options = {}) {
        const session = this.activeStreams.get(sessionId);
        if (!session) {
            throw new Error('Voice session not found');
        }

        const startTime = Date.now();
        const tempAudioFile = path.join(__dirname, '../temp', `voice_${Date.now()}.wav`);

        try {
            // Save incoming audio
            fs.writeFileSync(tempAudioFile, audioData);

            // 1. Transcribe (STT)
            const transcription = await this.transcribeAudio(tempAudioFile, options.sttOptions);
            
            if (!transcription.text.trim()) {
                throw new Error('Empty transcription');
            }

            // Emit transcription immediately for user feedback
            this.io.to(session.socketId).emit('voice_transcription', {
                sessionId: sessionId,
                text: transcription.text,
                confidence: transcription.confidence
            });

            // 2. Get agent response (using realtime QoS)
            const response = await this.getAgentResponse(transcription.text, {
                persona: session.persona,
                isVoice: true,
                sessionId: sessionId
            });

            // 3. Synthesize response (TTS)
            const synthesis = await this.synthesizeSpeech(response.text, {
                voiceId: session.settings.defaultVoice
            });

            const totalLatency = Date.now() - startTime;

            // Update session metrics
            session.metrics.messagesProcessed++;
            session.metrics.totalLatency += totalLatency;
            session.metrics.averageLatency = session.metrics.totalLatency / session.metrics.messagesProcessed;

            // Emit complete voice response
            this.io.to(session.socketId).emit('voice_response', {
                sessionId: sessionId,
                transcription: transcription.text,
                response: response.text,
                audioBuffer: synthesis.audioBuffer.toString('base64'),
                metrics: {
                    sttTime: transcription.processingTime,
                    agentTime: response.processingTime,
                    ttsTime: synthesis.processingTime,
                    totalTime: totalLatency,
                    withinTarget: totalLatency <= this.realtimeTarget
                }
            });

            // Clean up temp files
            this.cleanupTempFile(tempAudioFile);
            this.cleanupTempFile(synthesis.audioFile);

            console.log(`🎯 Voice message processed in ${totalLatency}ms (target: ${this.realtimeTarget}ms)`);

            return {
                transcription,
                response,
                synthesis,
                totalLatency,
                withinTarget: totalLatency <= this.realtimeTarget
            };

        } catch (error) {
            session.metrics.errors++;
            console.error(`❌ Voice processing failed for ${sessionId}:`, error);
            
            // Emit error to client
            this.io.to(session.socketId).emit('voice_error', {
                sessionId: sessionId,
                error: error.message,
                timestamp: Date.now()
            });

            this.cleanupTempFile(tempAudioFile);
            throw error;
        }
    }

    async endVoiceSession(sessionId) {
        const session = this.activeStreams.get(sessionId);
        if (!session) {
            return false;
        }

        session.isActive = false;
        session.endTime = Date.now();
        session.duration = session.endTime - session.startTime;

        console.log(`🔇 Voice session ${sessionId} ended (${session.duration}ms, ${session.metrics.messagesProcessed} messages)`);

        // Emit session ended with metrics
        this.io.to(session.socketId).emit('voice_session_ended', {
            sessionId: sessionId,
            duration: session.duration,
            metrics: session.metrics
        });

        this.activeStreams.delete(sessionId);
        return true;
    }

    // Twilio Integration
    async handleTwilioCall(callSid, from, to, options = {}) {
        console.log(`📞 Twilio call: ${callSid} from ${from} to ${to}`);

        try {
            // Start call recording
            const recording = await this.toolBroker.callProvider('twilio', 'call', {
                url: `${process.env.WEBHOOK_BASE_URL}/webhooks/twilio/voice`,
                to: to,
                from: from,
                record: true,
                recordingStatusCallback: `${process.env.WEBHOOK_BASE_URL}/webhooks/twilio/recording`
            });

            return {
                callSid: recording.sid,
                status: recording.status,
                webhookUrl: `${process.env.WEBHOOK_BASE_URL}/webhooks/twilio/voice`,
                recordingEnabled: true
            };

        } catch (error) {
            console.error('❌ Twilio call failed:', error);
            throw error;
        }
    }

    generateTwiMLResponse(text, options = {}) {
        const voice = options.voice || 'Polly.Joanna';
        const language = options.language || 'en-US';

        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="${voice}" language="${language}">${text}</Say>
    ${options.gather ? `
    <Gather input="speech" timeout="3" speechTimeout="auto">
        <Say voice="${voice}">I'm listening...</Say>
    </Gather>
    ` : ''}
    ${options.hangup ? '<Hangup/>' : ''}
</Response>`;
    }

    // Persona Voice Routing
    async getAgentResponse(text, context = {}) {
        const startTime = Date.now();

        // This would integrate with the intelligence router
        // For now, simulate different personas
        const personas = {
            rika: "I'm RIKA, your AI orchestrator. How can I help coordinate your tasks?",
            rig: "Hey! I'm Rig, your creative assistant. Ready to make something amazing?",
            echo: "Security protocols active. Echo here - what do you need secured?"
        };

        const baseResponse = personas[context.persona] || personas.rika;
        const response = `${baseResponse} You said: "${text}"`;

        return {
            text: response,
            agent: context.persona || 'rika',
            processingTime: Date.now() - startTime
        };
    }

    // Utility methods
    async streamToBuffer(stream) {
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    calculateConfidence(transcription) {
        // Whisper doesn't provide confidence scores directly
        // This is a heuristic based on text characteristics
        const text = transcription.text || '';
        
        if (text.length < 5) return 0.3;
        if (text.includes('[inaudible]') || text.includes('...')) return 0.5;
        if (text.length > 100) return 0.9;
        
        return 0.8; // Default good confidence
    }

    cleanupTempFile(filePath) {
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                console.warn('Failed to cleanup temp file:', filePath);
            }
        }
    }

    // Status and metrics
    getActiveVoiceSessions() {
        return Array.from(this.activeStreams.values()).map(session => ({
            id: session.id,
            socketId: session.socketId,
            persona: session.persona,
            startTime: session.startTime,
            duration: Date.now() - session.startTime,
            metrics: session.metrics
        }));
    }

    getVoiceMetrics() {
        const sessions = Array.from(this.activeStreams.values());
        
        return {
            activeSessions: sessions.length,
            totalProcessed: sessions.reduce((sum, s) => sum + s.metrics.messagesProcessed, 0),
            averageLatency: sessions.reduce((sum, s) => sum + s.metrics.averageLatency, 0) / sessions.length || 0,
            errorRate: sessions.reduce((sum, s) => sum + s.metrics.errors, 0) / Math.max(sessions.reduce((sum, s) => sum + s.metrics.messagesProcessed, 0), 1),
            withinTargetRate: sessions.filter(s => s.metrics.averageLatency <= this.realtimeTarget).length / Math.max(sessions.length, 1)
        };
    }
}

module.exports = VoiceEngine;