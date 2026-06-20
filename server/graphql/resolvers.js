const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const prompts = require('../config/interviewPrompts');
const aiService = require('../services/aiService');

const resolvers = {
    Query: {
        me: async (_, __, { user }) => {
            if (!user) return null;
            return await prisma.user.findUnique({ where: { id: user.id } });
        },
        sessions: async (_, __, { user }) => {
            if (!user) throw new Error('Not authenticated');
            return await prisma.interviewSession.findMany({
                where: { userId: user.id },
                orderBy: { startedAt: 'desc' }
            });
        },
        session: async (_, { id }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const session = await prisma.interviewSession.findUnique({
                where: { id },
                include: { exchanges: true }
            });
            if (session && session.userId !== user.id) throw new Error('Unauthorized');
            
            // Safely parse feedback JSON for each exchange
            if (session) {
                session.exchanges = session.exchanges.map(ex => {
                    let parsedFeedback = null;
                    if (ex.feedback) {
                        try {
                            parsedFeedback = JSON.parse(ex.feedback);
                        } catch (e) {
                            console.error(`Failed to parse feedback for exchange ${ex.id}:`, e.message);
                        }
                    }
                    return { ...ex, feedback: parsedFeedback };
                });
            }
            return session;
        }
    },
    Mutation: {
        register: async (_, { name, email, password, targetRole, experienceLevel }) => {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({
                data: { name, email, password: hashedPassword, targetRole, experienceLevel }
            });
            const token = jwt.sign({ id: user.id }, JWT_SECRET);
            return { token, user };
        },
        login: async (_, { email, password }) => {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) throw new Error('User not found');
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) throw new Error('Invalid password');
            const token = jwt.sign({ id: user.id }, JWT_SECRET);
            return { token, user };
        },
        startInterview: async (_, { type, resumeText }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
            
            const aiResponse = await aiService.generateQuestion(
                type,
                currentUser.targetRole || 'Software Engineer',
                currentUser.experienceLevel || 'Mid-level',
                resumeText || null
            );

            const session = await prisma.interviewSession.create({
                data: {
                    type,
                    userId: user.id,
                    resumeText, // Store for continuity
                    exchanges: {
                        create: {
                            sequenceIndex: 0,
                            questionText: aiResponse.nextQuestion
                        }
                    }
                },
                include: { exchanges: true }
            });
            return session;
        },
        sendMessage: async (_, { sessionId, message }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const session = await prisma.interviewSession.findUnique({
                where: { id: sessionId },
                include: { exchanges: true }
            });
            if (!session || session.userId !== user.id) throw new Error('Session not found');

            // Find current sequence index
            const lastIndex = session.exchanges.length > 0 ? 
                Math.max(...session.exchanges.map(e => e.sequenceIndex)) : -1;

            // Build conversation history
            const history = session.exchanges
                .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
                .map(ex => ([
                    { role: 'assistant', content: ex.questionText },
                    ...(ex.userAnswerText ? [{ role: 'user', content: ex.userAnswerText }] : [])
                ])).flat();

            // Call Grok
            const aiResponse = await aiService.sendMessage(history, message);

            // Update last exchange with user answer and feedback
            if (lastIndex >= 0) {
                const lastExchange = session.exchanges.find(e => e.sequenceIndex === lastIndex);
                await prisma.questionExchange.update({
                    where: { id: lastExchange.id },
                    data: { 
                        userAnswerText: message, 
                        feedback: JSON.stringify(aiResponse.feedback), 
                        answerQuality: aiResponse.feedback ? (aiResponse.feedback.score > 70 ? 'Good' : 'Needs Improvement') : 'Neutral'
                    }
                });
            }

            // Create next exchange
            await prisma.questionExchange.create({
                data: {
                    sessionId,
                    sequenceIndex: lastIndex + 1,
                    questionText: aiResponse.nextQuestion
                }
            });

            const updatedSession = await prisma.interviewSession.findUnique({
                where: { id: sessionId },
                include: { exchanges: true }
            });

            // Safely parse feedback JSON — AI responses can occasionally be malformed
            updatedSession.exchanges = updatedSession.exchanges.map(ex => {
                let parsedFeedback = null;
                if (ex.feedback) {
                    try {
                        parsedFeedback = JSON.parse(ex.feedback);
                    } catch (e) {
                        console.error(`Failed to parse feedback for exchange ${ex.id}:`, e.message);
                    }
                }
                return { ...ex, feedback: parsedFeedback };
            });

            return updatedSession;
        }
    }
};

module.exports = resolvers;
