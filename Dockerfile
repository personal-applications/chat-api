FROM node:21-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN ./node_modules/.bin/prisma generate
RUN npm run build:ts

FROM node:21-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm i --omit=dev

COPY --from=builder /app/prisma ./prisma
RUN ./node_modules/.bin/prisma generate

COPY --from=builder /app/dist ./dist

CMD ["sh"]