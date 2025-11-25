FROM node:24-slim

WORKDIR /app

COPY package.json ./
COPY server.js ./

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
