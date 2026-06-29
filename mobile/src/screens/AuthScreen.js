import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

export default function AuthScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(username, password);
      } else {
        await onRegister(username, password, displayName || username);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Messenger</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Войдите в аккаунт' : 'Создайте аккаунт'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder={mode === 'login' ? 'Тег или email' : '@username (уникальный тег)'}
          placeholderTextColor="#666"
          value={username}
          onChangeText={(val) => setUsername(val.replace(/[^a-zA-Z0-9_@.]/g, ''))}
          autoCapitalize="none"
          minLength={3}
          maxLength={20}
        />

        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Имя (отображается)"
            placeholderTextColor="#666"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={30}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Пароль"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          minLength={4}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          <Text style={styles.switch}>
            {mode === 'login'
              ? 'Нет аккаунта? Зарегистрироваться'
              : 'Уже есть аккаунт? Войти'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 30,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  switch: {
    color: '#4f46e5',
    fontSize: 13,
    textAlign: 'center',
  },
});
