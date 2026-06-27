import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { register as apiRegister, login as apiLogin } from '../services/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem('messenger_token');
      const storedUser = await AsyncStorage.getItem('messenger_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to load auth:', err);
    } finally {
      setLoading(false);
    }
  }

  async function register(username, password) {
    const data = await apiRegister(username, password);
    await AsyncStorage.setItem('messenger_token', data.token);
    await AsyncStorage.setItem('messenger_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function login(username, password) {
    const data = await apiLogin(username, password);
    await AsyncStorage.setItem('messenger_token', data.token);
    await AsyncStorage.setItem('messenger_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    await AsyncStorage.removeItem('messenger_token');
    await AsyncStorage.removeItem('messenger_user');
    setToken(null);
    setUser(null);
  }

  return { user, token, loading, register, login, logout };
}
