const { gql } = require('graphql-tag');

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    targetRole: String
    experienceLevel: String
    skills: [String]
    resumeClaims: [String]
    interviewsCompleted: Int
    avgScore: Float
    createdAt: String
  }

  type InterviewSession {
    id: ID!
    type: String!
    status: String!
    overallScore: Int
    startedAt: String
    endedAt: String
    transcriptSummary: String
    exchanges: [QuestionExchange]
  }

  type QuestionExchange {
    id: ID!
    sequenceIndex: Int!
    questionText: String!
    userAnswerText: String
    answerQuality: String
    feedback: Feedback
    createdAt: String
  }

  type Feedback {
    score: Int
    critique: String
    improvementTip: String
    toneAnalysis: String
  }

  type Query {
    me: User
    sessions: [InterviewSession]
    session(id: ID!): InterviewSession
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!, targetRole: String, experienceLevel: String): AuthPayload
    login(email: String!, password: String!): AuthPayload
    startInterview(type: String!): InterviewSession
    sendMessage(sessionId: ID!, message: String!): InterviewSession
  }
`;

module.exports = typeDefs;
