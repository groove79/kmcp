# Claude Desktop 원클릭 설치 파일 (.mcpb)

각 K-MCP 서버를 [MCP Bundle](https://github.com/modelcontextprotocol/mcpb)(.mcpb, 예전 이름 DXT)로 묶은 것입니다.
사용자는 파일을 더블클릭하거나 Claude Desktop **설정 → 확장 프로그램**으로 끌어다 놓으면 설치되고, 키는 설치 화면의 입력칸에 넣습니다(JSON 편집 불필요).

## 구성

```
bundles/
  icon.png                 공용 아이콘 (512×512)
  <name>/manifest.json     번들 정의 (커밋 대상)
  <name>/server/           빌드 산출물 (gitignore)
scripts/build-bundles.mjs  빌드 → 단일 파일 번들 → 검증 → 패킹
dist-bundles/              결과 .mcpb (gitignore — GitHub Release에 올림)
```

- `server/index.js`는 esbuild로 만든 **단일 파일**이라 node_modules가 필요 없습니다(번들당 160~230KB).
- 실행 전 런처가 빈 값과 치환 안 된 `${user_config.…}` 환경변수를 지워서, 선택 항목을 비워 둬도 "미설정"으로 동작합니다.
- 쓰기 도구가 있는 서버는 `OKAGENT_API_KEY`(선택)·`KMCP_WRITE_MODE`(선택) 입력칸이 있습니다. 비워 두면 confirm 모드(대화창 확인 후 실행).

## 빌드

```bash
cd /Volumes/Dev/kmcp && node scripts/build-bundles.mjs            # 전체
cd /Volumes/Dev/kmcp && node scripts/build-bundles.mjs hwp coupang # 일부
cd /Volumes/Dev/kmcp && node scripts/build-bundles.mjs --no-build  # dist/ 재사용
```

버전은 각 `packages/<name>/package.json`에서 가져와 manifest에 자동 반영됩니다. 도구가 추가·변경되면 `manifest.json`의 `tools` 목록도 같이 고쳐 주세요.

## 배포 (GitHub Release)

```bash
cd /Volumes/Dev/kmcp && gh release create bundles-2026-10-23 dist-bundles/*.mcpb --title "Claude Desktop 원클릭 설치 파일" --notes "각 .mcpb 파일을 내려받아 더블클릭하면 Claude Desktop에 설치됩니다."
```

다운로드 주소: `https://github.com/groove79/kmcp/releases/latest/download/kmcp-<name>-<version>.mcpb`

## README에 넣을 섹션 (초안)

```markdown
## Claude Desktop 원클릭 설치 / One-click install for Claude Desktop

JSON 설정 없이 설치하려면 아래 파일을 내려받아 **더블클릭**하세요(또는 Claude Desktop → 설정 → 확장 프로그램에 끌어다 놓기). 키는 설치 화면에서 입력합니다.
Download a file below and double-click it — Claude Desktop installs it and asks for your keys in a form.

| 서버 | 키 | 다운로드 |
|---|---|---|
| 📅 세무·영업일 캘린더 | 필요 없음 | [kmcp-kr-biz-calendar.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 📄 한글(HWP) 읽기 | 필요 없음 | [kmcp-hwp.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 🇯🇵 일본 구매대행 브릿지 | 선택 | [kmcp-japan-bridge.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 🏛 공공데이터 | 무료 키 | [kmcp-public-data.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 📦 택배 조회 | 무료 키 | [kmcp-delivery.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 🛒 스마트스토어 | 커머스API 키 | [kmcp-naver-commerce.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 🛒 쿠팡 윙 | OPEN API 키 | [kmcp-coupang.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 🛒 카페24 | 앱 키 + 리프레시 토큰 | [kmcp-cafe24.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 🧾 팝빌 | 연동 키 | [kmcp-popbill.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 💳 토스페이먼츠 | 시크릿 키 | [kmcp-toss-payments.mcpb](https://github.com/groove79/kmcp/releases/latest) |
| 💬 카카오톡 | REST 키 + 리프레시 토큰 | [kmcp-kakao.mcpb](https://github.com/groove79/kmcp/releases/latest) |

카페24·카카오톡은 확장 프로그램 안에서 브라우저 로그인(`auth`)을 할 수 없어서, 리프레시 토큰을 설치 화면에 넣어야 합니다.
```

(파일명에 버전이 붙으므로, Release 이후 실제 파일 링크로 바꾸거나 Release 페이지 링크를 그대로 두세요.)

## 디렉터리 등록

Anthropic 디렉터리는 **더 이상 .mcpb 단독(데스크톱 확장) 등록을 받지 않습니다.** 로컬 서버는 **플러그인**에 넣어 제출합니다(claude.ai/directory/manage → Submit new → Plugin bundle). 원격 서버(okagent.kr 게이트웨이)는 같은 포털에서 **MCP connector**로 따로 제출합니다.
