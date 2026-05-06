FROM node:20-alpine
WORKDIR /app/server

# When built with repo-root build context, copy server deps first for caching.
COPY server/package.json ./package.json
RUN npm install --omit=dev

# Copy server code + static assets (served by server/index.js).
COPY server/ ./
COPY public/ /app/public

EXPOSE 3000
CMD ["node", "index.js"]
