import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };
  public static contextType = ThemeContext;
  public context!: React.ContextType<typeof ThemeContext>;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const t = this.context?.theme;
      return (
        <View style={[styles.container, { backgroundColor: t?.bg || '#fff' }]}>
          <Text style={[styles.title, { color: t?.text || '#000' }]}>
            Something went wrong
          </Text>
          <Text style={[styles.msg, { color: t?.sub || '#666' }]}>
            {this.state.error?.message}
          </Text>
          <Button title="Reload app" onPress={() => window.location.reload()} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  msg: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
});
