import { ApolloClient, InMemoryCache, createHttpLink, ApolloProvider } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const getApiUrl = () => {
  if (import.meta.env.VITE_GRAPHQL_URI) return import.meta.env.VITE_GRAPHQL_URI;
  return `${window.location.origin.replace('5173', '5001')}/graphql`;
};

const httpLink = createHttpLink({
  uri: getApiUrl(),
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;
