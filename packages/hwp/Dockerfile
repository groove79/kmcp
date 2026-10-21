FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-hwp@0.1.0
ENV NODE_ENV=production
ENTRYPOINT ["mcp-hwp"]
