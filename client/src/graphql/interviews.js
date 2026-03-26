import { gql } from '@apollo/client';

export const GET_SESSIONS = gql`
  query GetSessions {
    sessions {
      id
      type
      status
      startedAt
      overallScore
    }
  }
`;

export const START_INTERVIEW = gql`
  mutation StartInterview($type: String!, $resumeText: String) {
    startInterview(type: $type, resumeText: $resumeText) {
      id
      type
      status
    }
  }
`;

export const GET_SESSION = gql`
  query GetSession($id: ID!) {
    session(id: $id) {
      id
      type
      status
      overallScore
      exchanges {
        id
        sequenceIndex
        questionText
        userAnswerText
        answerQuality
        feedback {
          score
          critique
          improvementTip
        }
      }
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($sessionId: ID!, $message: String!) {
    sendMessage(sessionId: $sessionId, message: $message) {
      id
      exchanges {
        id
        sequenceIndex
        questionText
        userAnswerText
        answerQuality
        feedback {
          score
          critique
          improvementTip
        }
      }
    }
  }
`;
