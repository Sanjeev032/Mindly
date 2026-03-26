const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
            
            // Parse feedback JSON for each exchange
            if (session) {
                session.exchanges = session.exchanges.map(ex => ({
                    ...ex,
                    feedback: ex.feedback ? JSON.parse(ex.feedback) : null
                }));
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
        startInterview: async (_, { type }, { user }) => {
            if (!user) throw new Error('Not authenticated');
            const session = await prisma.interviewSession.create({
                data: {
                    type,
                    userId: user.id,
                    exchanges: {
                        create: {
                            sequenceIndex: 0,
                            questionText: `Hello! I'm your AI Interviewer. Ready to start your ${type} interview?`
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

            // Simple AI Mock logic
            const nextQuestion = "That's an interesting answer. Can you tell me more about your technical experience?";
            const feedback = JSON.stringify({
                score: 80,
                critique: "Good answer, but could be more specific.",
                improvementTip: "Try using the STAR method."
            });

            // Update last exchange with user answer and feedback
            if (lastIndex >= 0) {
                const lastExchange = session.exchanges.find(e => e.sequenceIndex === lastIndex);
                await prisma.questionExchange.update({
                    where: { id: lastExchange.id },
                    data: { userAnswerText: message, feedback, answerQuality: 'Good' }
                });
            }

            // Create next exchange
            await prisma.questionExchange.create({
                data: {
                    sessionId,
                    sequenceIndex: lastIndex + 1,
                    questionText: nextQuestion
                }
            });

            const updatedSession = await prisma.interviewSession.findUnique({
                where: { id: sessionId },
                include: { exchanges: true }
            });

            updatedSession.exchanges = updatedSession.exchanges.map(ex => ({
                ...ex,
                feedback: ex.feedback ? JSON.parse(ex.feedback) : null
            }));

            return updatedSession;
        }
    }
};

module.exports = resolvers;
