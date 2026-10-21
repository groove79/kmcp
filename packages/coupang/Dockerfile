FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-coupang@0.1.0
ENV NODE_ENV=production
# Runtime env: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY, COUPANG_VENDOR_ID, optional APPROVAL_URL/APPROVAL_API_KEY
ENTRYPOINT ["mcp-coupang"]
