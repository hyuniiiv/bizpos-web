# BIZPOS 릴리즈 배포 가이드

## 배포 구조

```
git push origin v0.x.x
        ↓
GitHub Actions (windows-latest, ~15분)
        ↓
next build + electron-builder --win
        ↓
GitHub Releases → bizpos-setup-0.x.x.exe
        ↓
단말기 자동 업데이트 알림 (앱 시작 시 + 4시간마다)
```

---

## 배포 명령

```bash
# 1. 버전 올리기
npm version patch   # 0.1.3 → 0.1.4  (버그 수정)
npm version minor   # 0.1.3 → 0.2.0  (기능 추가)
npm version major   # 0.1.3 → 1.0.0  (대규모 변경)

# 2. 커밋
git add package.json
git commit -m "chore: bump version to x.x.x"

# 3. 태그 push → 빌드 자동 트리거
git tag v0.x.x
git push origin {브랜치명}
git push origin v0.x.x
```

빌드 결과: https://github.com/hyuniiiv/bizpos-web/actions  
릴리즈 파일: https://github.com/hyuniiiv/bizpos-web/releases

---

## GitHub Secrets (최초 1회 설정 완료)

| Secret | 설명 |
|---|---|
| `GH_TOKEN` | GitHub Personal Access Token (repo 권한) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `TERMINAL_JWT_SECRET` | 단말기 JWT 서명 키 |
| `INTERNAL_POS_KEY` | 내부 API 키 |
| `BIZPLAY_BASE_URL` | 비플페이 운영 URL |
| `NEXT_PUBLIC_APP_URL` | 운영 앱 URL |

---

## 보안 변경 포함 시 배포 순서 (중요)

`merchantKey` 관련 변경이 포함된 경우 반드시 순서를 지킬 것:

```
1. Electron 앱 배포 (클라이언트 먼저)
        ↓
2. 모든 단말기 업데이트 완료 확인
        ↓
3. 서버 재배포
```

> **이유:** 서버를 먼저 배포하면 구 클라이언트가 `merchantKey` 응답을 기대하다 크래시날 수 있음

---

## 단말기 업데이트 동작

- 앱 시작 시 즉시 새 버전 체크
- 이후 **4시간마다** 주기적 체크
- 새 버전 발견 → 다운로드 여부 다이얼로그
- 다운로드 중 작업표시줄 진행률 표시
- 완료 후 재시작 여부 선택 (나중에 선택 시 다음 실행 때 자동 설치)
