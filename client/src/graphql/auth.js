import { gql } from '@apollo/client';

export const REGISTER_USER = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $targetRole: String, $experienceLevel: String) {
    register(name: $name, email: $email, password: $password, targetRole: $targetRole, experienceLevel: $experienceLevel) {
      token
      user {
        id
        name
        email
        targetRole
        experienceLevel
      }
    }
  }
`;

export const LOGIN_USER = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        targetRole
        experienceLevel
      }
    }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      targetRole
      experienceLevel
      skills
    }
  }
`;
