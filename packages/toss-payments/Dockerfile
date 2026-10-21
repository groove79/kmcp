FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-toss-payments@0.1.1
ENV NODE_ENV=production
# Runtime env: TOSS_SECRET_KEY, optional APPROVAL_URL/APPROVAL_API_KEY
ENTRYPOINT ["mcp-toss-payments"]
