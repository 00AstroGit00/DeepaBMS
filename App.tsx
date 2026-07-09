import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/context/ThemeContext';
import { StoreProvider } from './src/context/StoreContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import Login from './src/Login';
import Layout from './src/Layout';

function MainApp() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <MainApp />
        </AuthProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
