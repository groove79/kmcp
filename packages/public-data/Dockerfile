FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-public-data@0.1.0
ENV NODE_ENV=production
# Runtime env: DATA_GO_KR_KEY, JUSO_KEY
ENTRYPOINT ["mcp-public-data"]
