FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-cafe24@0.1.0
ENV NODE_ENV=production
# Runtime env: CAFE24_MALL_ID, CAFE24_CLIENT_ID, CAFE24_CLIENT_SECRET, CAFE24_REFRESH_TOKEN
ENTRYPOINT ["mcp-cafe24"]
