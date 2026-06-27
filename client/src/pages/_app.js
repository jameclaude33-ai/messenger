import { useState } from 'react';
import GlobalStyles from '../styles/global';
import { useSocket, useChat } from '../hooks/useChat';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
