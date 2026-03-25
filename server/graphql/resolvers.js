const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ollamaService = require('../services/ollamaService');

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) return null;
      const foundUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (foundUser) {
        // Map string to array for skills/claims
        foundUser.skills = foundUser.skills ? JSON.parse(foundUser.skills) : [];
        foundUser.resumeClaims = foundUser.resumeClaims ? JSON.parse(foundUser.resumeClaims) : [];
      }
      return foundUser;
    },
    sessions: async (_, __, { user }) => {
      if (!user) return [];
      return await prisma.interviewSession.findMany({
        where: { userId: user.id },
        include: { exchanges: true },
        orderBy: { startedAt: 'desc' }
      });
    },
    session: async (_, { id }, { user }) => {
      if (!user) return null;
      return await prisma.interviewSession.findUnique({
        where: { id },
        include: { exchanges: { orderBy: { sequenceIndex: 'asc' } } }
      });
    }
  },

  Mutation: {
    register: async (_, { name, email, password, targetRole, experienceLevel }) => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          targetRole: targetRole || 'Software Engineer',
          experienceLevel: experienceLevel || 'Junior'
        }
      });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
      return { token, user };
    },

    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error('Invalid credentials');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error('Invalid credentials');

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
      return { token, user };
    },

    startInterview: async (_, { type }, { user }) => {
      if (!user) throw new Error('Authentication required');

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const skills = dbUser.skills ? JSON.parse(dbUser.skills) : [];

      let systemPrompt = `You are a professional ${type} Interviewer. Start by introducing yourself and asking the first question.`;
      if (skills.length > 0) {
        systemPrompt += `\nCONTEXT: The candidate knows ${skills[0]}. Ask about it.`;
      }

      const aiGreeting = await ollamaService.generate(systemPrompt);

      const session = await prisma.interviewSession.create({
        data: {
          userId: user.id,
          type: type || 'HR',
          status: 'ACTIVE',
          exchanges: {
            create: {
              sequenceIndex: 1,
              questionText: aiGreeting,
              topic: 'Opening',
              complexity: 'Easy'
            }
          }
        },
        include: { exchanges: true }
      });

      return session;
    },

    sendMessage: async (_, { sessionId, message }, { user }) => {
      if (!user) throw new Error('Authentication required');

      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: { exchanges: { orderBy: { sequenceIndex: 'desc' }, take: 1 } }
      });
      if (!session) throw new Error('Session not found');

      const lastExchange = session.exchanges[0];

      // Update last exchange with user answer
      await prisma.questionExchange.update({
        where: { id: lastExchange.id },
        data: { userAnswerText: message }
      });

      // AI Logic for next question
      const systemPrompt = `Analyze the candidate's answer: "${message}" to the question: "${lastExchange.questionText}". Provide next question in JSON format: { "answer_quality": "...", "counter_question": "..." }`;
      
      let aiResponse;
      try {
        const raw = await ollamaService.generate(systemPrompt, 'llama3.2', { format: 'json' });
        aiResponse = JSON.parse(raw);
      } catch (e) {
        aiResponse = { answer_quality: "N/A", counter_question: "Could you elaborate on that?" };
      }

      // Create new exchange
      await prisma.questionExchange.create({
        data: {
          sessionId,
          sequenceIndex: lastExchange.sequenceIndex + 1,
          questionText: aiResponse.counter_question,
          answerQuality: aiResponse.answer_quality
        }
      });

      return await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: { exchanges: { orderBy: { sequenceIndex: 'asc' } } }
      });
    }
  }
};

module.exports = resolvers;
