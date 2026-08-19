import React, { type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureException } from './sentry';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches React render crashes (white screen) and reports them to Sentry when configured.
 */
export class CrashErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureException(error);
    if (__DEV__) {
      console.warn('[CrashErrorBoundary]', error.message, info.componentStack);
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>The screen hit an error. You can try again without losing data stored on this device.</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ error: null })}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  body: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
});
