FROM node:22-slim

WORKDIR /app

# Root pipeline dependencies — needed because this server reuses
# src/sources/forexFactory.js and src/dashboard/dataStore.js directly
# from the parent repo instead of duplicating that logic.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Portfolio server dependencies
COPY portfolio-app/server/package.json portfolio-app/server/package-lock.json ./portfolio-app/server/
RUN cd portfolio-app/server && npm ci --omit=dev

# App source
COPY src ./src
COPY portfolio-app/server ./portfolio-app/server

WORKDIR /app/portfolio-app/server
EXPOSE 4000
CMD ["node", "src/index.js"]
