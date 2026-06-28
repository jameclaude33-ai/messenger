FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install && cd server && npm install && cd ../client && npm install

COPY . .

RUN echo "Build at $(date)" > /tmp/buildstamp && cd client && npm run build

EXPOSE 10000

ENV NODE_ENV=production
ENV PORT=10000

CMD ["node", "server/src/index.js"]
