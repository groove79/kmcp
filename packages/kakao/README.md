# @appmonster/mcp-kakao

MCP server for **KakaoTalk messages** via the Kakao Developers message API: an agent can send a message to the connected account's own chat (나와의 채팅) or to friends who also linked the app, and list those friends. Writes can be gated by human approval ([OK Agent](https://github.com/groove79/okagent)).

카카오톡 메시지 MCP 서버 — 나에게 보내기 / 친구에게 보내기 / 친구 목록. 앱 설치 없이 사장님 폰에 알림을 넣는 가장 짧은 길.

> 알림톡(비즈메시지)은 카카오 공식 딜러사 계약이 필요한 별도 채널입니다. 이 패키지는 개인/소규모 사업자가 바로 쓸 수 있는 Kakao Developers 메시지 API만 다룹니다. 알림톡은 로드맵.

## Tools

| Tool | Access | What it does |
|---|---|---|
| `kakao_me` | read | 연결된 계정·동의 항목 확인 (연결 점검용) |
| `kakao_send_to_me` | **write** | 나와의 채팅방으로 텍스트/피드 카드 전송 (링크·버튼 포함) |
| `kakao_list_friends` | read | 앱을 연결한 친구 목록 (uuid) |
| `kakao_send_to_friends` | **write** | 친구 uuid 최대 5명에게 전송, 건별 성공/실패 |

## Setup (5분, 1회)

1. https://developers.kakao.com → 내 애플리케이션 → 앱 추가. **앱 키 > REST API 키** 복사.
2. **플랫폼 > Web**: 메시지 링크로 쓸 도메인 등록 (예: `https://okagent.kr`).
3. **카카오 로그인 > 활성화 ON**, Redirect URI에 `http://localhost:8788/callback` 추가.
4. **카카오 로그인 > 동의항목**: `카카오톡 메시지 전송 (talk_message)` 을 "선택 동의"로 설정. 친구 기능까지 쓰려면 **카카오톡 소셜 > 친구 목록** 권한 신청 + `friends` 동의항목.
5. 브라우저 로그인 1회:

```bash
KAKAO_REST_API_KEY=… npx @appmonster/mcp-kakao auth
```

토큰은 `~/.config/kmcp/kakao/<app>.json`에 저장되고 자동 갱신됩니다 (refresh ≈ 2개월).

6. MCP client config:

```json
{
  "mcpServers": {
    "kakao": {
      "command": "npx",
      "args": ["-y", "@appmonster/mcp-kakao"],
      "env": { "KAKAO_REST_API_KEY": "…" }
    }
  }
}
```

컨테이너 등 파일 저장이 어려우면 `KAKAO_REFRESH_TOKEN`을 env로 넘기면 됩니다. 앱에서 Client Secret을 켰다면 `KAKAO_CLIENT_SECRET`도.

### Human approval for sends (optional)

```json
"APPROVAL_URL": "https://okagent.kr",
"APPROVAL_API_KEY": "ok_…"
```

## Message spec

`text` (≤200자) 만 주면 텍스트 메시지, `title` 또는 `imageUrl`을 주면 피드 카드. `url`은 앱의 Web 플랫폼에 등록된 도메인이어야 버튼이 열립니다. 버튼은 최대 2개.

## Limits

- 나에게 보내기는 검수 없이 바로 동작. 친구에게 보내기는 상대도 앱을 연결했어야 하며 일일 발송 한도가 있습니다 (에러 -532).
- 에러 코드 힌트: -3 기능 미활성, -401 토큰 만료(`auth` 재실행), -402 동의항목 부족.

## Development

```bash
pnpm --filter @appmonster/mcp-kakao test
```
