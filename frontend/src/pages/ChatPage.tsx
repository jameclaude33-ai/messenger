import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRooms, createRoom, getMessages, getWebSocket } from '../api';

interface Room {
  id: number;
  name: string;
}

interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  room_id: number;
  created_at: string;
}

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRooms().then(setRooms).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedRoom && token) {
      getMessages(selectedRoom.id).then(setMessages).catch(console.error);

      const ws = getWebSocket(selectedRoom.id, token);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        setMessages(prev => [...prev, msg]);
      };
      ws.onerror = console.error;
      wsRef.current = ws;

      return () => {
        ws.close();
        wsRef.current = null;
      };
    }
  }, [selectedRoom, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ content: inputValue }));
    setInputValue('');
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const room = await createRoom(newRoomName);
      setRooms(prev => [...prev, room]);
      setNewRoomName('');
      setShowModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Чаты</h2>
          <button className="btn-small" onClick={() => setShowModal(true)}>+</button>
        </div>
        <div className="chat-list">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`chat-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => setSelectedRoom(room)}
            >
              {room.name}
            </div>
          ))}
          {rooms.length === 0 && (
            <div style={{ textAlign: 'center', color: '#555', padding: 20 }}>
              Нет чатов
            </div>
          )}
        </div>
        <div className="user-info">
          <span>{user?.username}</span>
          <br />
          <a onClick={logout} style={{ color: '#e94560', cursor: 'pointer', fontSize: 12 }}>
            Выйти
          </a>
        </div>
      </div>

      <div className="chat-area">
        {selectedRoom ? (
          <>
            <div className="chat-header">
              <h3>{selectedRoom.name}</h3>
            </div>
            <div className="messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.sender_id === user?.id ? 'own' : ''}`}>
                  <div className="message-sender">{msg.sender_name}</div>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">{formatTime(msg.created_at)}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="message-input">
              <input
                placeholder="Сообщение..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend}>Отправить</button>
            </div>
          </>
        ) : (
          <div className="no-chat">Выберите чат</div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Новый чат</h3>
            <input
              placeholder="Название чата"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
            />
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Отмена</button>
              <button className="btn-confirm" onClick={handleCreateRoom}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
