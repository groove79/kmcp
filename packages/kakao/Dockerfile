FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-kakao@0.1.0
ENV NODE_ENV=production
# Runtime env: KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET (optional), KAKAO_REFRESH_TOKEN, optional APPROVAL_URL/APPROVAL_API_KEY
ENTRYPOINT ["mcp-kakao"]
