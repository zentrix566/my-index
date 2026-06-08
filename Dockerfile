FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY favicon.svg ./
COPY src/ ./src/

RUN npm run build

FROM nginx:1.25-alpine

LABEL maintainer="Zentrix"

RUN rm /etc/nginx/nginx.conf && rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
