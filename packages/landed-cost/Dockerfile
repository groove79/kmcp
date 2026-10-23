FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-landed-cost@0.1.0
ENV NODE_ENV=production
ENTRYPOINT ["mcp-landed-cost"]
