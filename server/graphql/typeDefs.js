const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    targetRole: String
    experienceLevel: String
    skills: String
  }

  type AuthResponse {
    token: String!
    user: User!
  }

  type Feedback {
    score: Int
    critique: String
    improvementTip: String
  }

  type QuestionExchange {
    id: ID!
    sequenceIndex: Int!
    questionText: String!
    userAnswerText: String
    answerQuality: String
    feedback: Feedback
  }

  type InterviewSession {
    id: ID!
    type: String!
    status: String!
    startedAt: String!
    overallScore: Float
    resumeText: String
    exchanges: [QuestionExchange]
  }

  type Query {
    me: User
    sessions: [InterviewSession]
    session(id: ID!): InterviewSession
  }

  type Mutation {
    register(name: String!, email: String!, password: String!, targetRole: String, experienceLevel: String): AuthResponse!
    login(email: String!, password: String!): AuthResponse!
    startInterview(type: String!, resumeText: String): InterviewSession!
    sendMessage(sessionId: ID!, message: String!): InterviewSession!
  }
`;

module.exports = typeDefs;
