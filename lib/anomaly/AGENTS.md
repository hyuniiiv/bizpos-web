<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# anomaly (이상 감지)

## Purpose
거래 패턴을 분석하여 비정상적인 활동을 감지하는 알고리즘 모듈입니다.
이상 거래 탐지 결과는 `anomaly_alerts` 테이블에 저장되고 대시보드 알림으로 표시됩니다.

## Key Files

| File | Description |
|------|-------------|
| `detector.ts` | 이상 감지 알고리즘 (통계 기반 이상치 탐지) |

## For AI Agents

### Working In This Directory
- 이상 감지는 서버 사이드 배치 작업으로 실행
- 결과: `anomaly_alerts` Supabase 테이블에 저장
- 알림: 대시보드 `/dashboard/alerts` 페이지에서 확인

### Detection Logic
- 거래 금액 이상치 (표준편차 기반)
- 시간대별 거래 패턴 이상
- 단말기별 오류율 급증

### Testing Requirements
- 테스트 거래 데이터로 이상 탐지 시뮬레이션
- 알림 생성 확인: `anomaly_alerts` 테이블 조회

## Dependencies

### Internal
- `lib/supabase/admin.ts` - 알림 저장 (서비스 롤)
- `lib/analytics/queries.ts` - 거래 데이터 조회

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
