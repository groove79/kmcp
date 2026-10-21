FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-japan-bridge@0.1.0
ENV NODE_ENV=production
# Runtime env: RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY, YAHOO_JP_APP_ID (all optional), BRIDGE_* cost defaults
ENTRYPOINT ["mcp-japan-bridge"]
