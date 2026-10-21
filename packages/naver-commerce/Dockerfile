# Minimal image for directories that build from Dockerfile (Glama, Smithery) and for OCI distribution later.
FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-naver-commerce@0.2.0
ENV NODE_ENV=production
# Credentials are passed at runtime: -e NAVER_COMMERCE_CLIENT_ID=... -e NAVER_COMMERCE_CLIENT_SECRET=...
ENTRYPOINT ["mcp-naver-commerce"]
