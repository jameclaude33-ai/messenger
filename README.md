# Messenger

Полнофункциональный мессенджер с реальным временем, шифрованием и P2P звонками.

## Фазы разработки

| Фаза | Фичи | Статус |
|------|------|--------|
| 1 (MVP) | Базовый чат, backend + frontend, простое шифрование | ✅ Готово |
| 2 | Группы (до 50–100), улучшенное шифрование, файлы | ✅ Готово |
| 3 | JWT авторизация, P2P звонки (WebRTC), PostgreSQL/Redis инфра | ✅ Готово |
| 4 | Мобильное приложение (React Native/Expo), оптимизация | ✅ Готово |

## Запуск

```bash
# Установить зависимости
npm run install:all

# Запустить веб (сервер + клиент)
npm run dev

# Запустить мобильное приложение
npm run dev:mobile

# Или через Docker (с PostgreSQL + Redis)
docker-compose up --build
```

## Архитектура

```
messenger/
├── server/          # Express + Socket.io (порт 3001)
│   ├── src/
│   │   ├── index.js           # Основной сервер
│   │   ├── models/
│   │   │   ├── user.js        # Пользователи (JWT, bcrypt)
│   │   │   ├── message.js     # Сообщения
│   │   │   └── group.js       # Групповые чаты
│   │   ├── routes/
│   │   │   ├── auth.js        # POST /api/auth/register, /login
│   │   │   └── upload.js      # POST /api/upload
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT middleware
│   │   └── utils/
│   │       └── crypto.js      # AES-256-GCM + PBKDF2 + HMAC
│   └── .env
├── client/          # Next.js (порт 3000)
│   └── src/
│       ├── components/
│       │   ├── AuthScreen.js  # Авторизация
│       │   ├── CallModal.js   # P2P звонки
│       │   └── ...
│       └── hooks/
│           └── useChat.js     # useAuth, useSocket, useChat, useP2PCall
├── mobile/          # React Native (Expo)
│   └── src/
│       ├── screens/
│       │   ├── AuthScreen.js  # Авторизация
│       │   ├── ChatScreen.js  # Чат
│       │   └── GroupsScreen.js # Группы
│       ├── hooks/
│       │   ├── useAuth.js     # Авторизация (AsyncStorage)
│       │   ├── useChat.js     # Чат (Socket.io)
│       │   └── useGroups.js   # Группы
│       └── services/
│           ├── api.js         # REST API
│           └── socket.js      # Socket.io клиент
├── docker-compose.yml         # PostgreSQL + Redis
└── package.json               # Монорепо
```

## API Endpoints

### Авторизация
- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — логин (JWT токен)

### Здоровье
- `GET /api/health` — статус сервера

### Загрузка файлов
- `POST /api/upload` — загрузка файлов (multer, 10MB)

## Socket.io События

### Чат
- `message:send` — отправить сообщение
- `message:new` — новое сообщение
- `message:history` — история сообщений

### Пользователи
- `user:list` — список онлайн
- `user:typing` / `user:stopTyping` — индикатор набора

### Группы
- `group:create` — создать группу
- `group:join` — вступить
- `group:leave` — покинуть
- `group:message:send` — отправить сообщение в группу
- `group:list` — список групп

### P2P Звонки
- `call:initiate` — начать звонок
- `call:incoming` — входящий звонок
- `call:accept` — принять
- `call:reject` — отклонить
- `call:end` — завершить
- `call:ice-candidate` — ICE кандидаты WebRTC

## Техстек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 14, React 18, Socket.io-client |
| Mobile | React Native, Expo, Socket.io-client |
| Backend | Express, Socket.io, Multer, JWT, bcrypt |
| БД | PostgreSQL (опционально, in-memory fallback) |
| Шифрование | AES-256-GCM, PBKDF2, HMAC-SHA256 |
| Инфра | Docker, Redis (для масштабирования) |

## Следующие шаги

- [ ] Развернуть на VPS/Railway/Vercel
- [ ] Настроить PostgreSQL для постоянной истории
- [ ] Добавить Redis для горизонтального масштабирования
- [ ] Push-уведомления (Expo Notifications)
- [ ]Видео звонки
- [ ] End-to-end шифрование (Signal Protocol)
