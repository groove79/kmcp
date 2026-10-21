FROM node:22-alpine
WORKDIR /app
RUN npm install -g @appmonster/mcp-popbill@0.1.0
ENV NODE_ENV=production
# Runtime env: POPBILL_LINK_ID, POPBILL_SECRET_KEY, POPBILL_CORP_NUM, POPBILL_USER_ID, POPBILL_TEST=true|false, optional APPROVAL_URL/APPROVAL_API_KEY
ENTRYPOINT ["mcp-popbill"]
