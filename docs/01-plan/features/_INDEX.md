# Feature Plan Index

| Feature | 설명 | 우선순위 | 상태 | Plan 문서 |
|---------|------|:--------:|------|-----------|
| sales-analytics | 메뉴별·기간별·단말기별 매출 분석 차트 | 1 | Plan | [sales-analytics.plan.md](sales-analytics.plan.md) |
| error-response-unify | Device API 에러 응답 포맷 통일 (기술 부채) | 2 | Plan | [error-response-unify.plan.md](error-response-unify.plan.md) |
| anomaly-alert | 이상 거래 감지 알림 | 3 | Plan | [anomaly-alert.plan.md](anomaly-alert.plan.md) |

## 추천 구현 순서

1. **sales-analytics** — F-05 핵심 미구현 기능, 즉시 가치 제공
2. **error-response-unify** — 소규모 기술 부채 해소 (1-2시간), 다음 피쳐 전 정리
3. **anomaly-alert** — 중장기 안전망, 독립적으로 구현 가능

## 아카이브된 피쳐

| Feature | Match Rate | 아카이브 경로 |
|---------|:----------:|--------------|
| pos-device-auth | 98% | docs/archive/2026-03/pos-device-auth/ |
| merchant-terminal-key | 100% | (report only) |
| online-management | 95% | docs/archive/2026-03/online-management/ |
