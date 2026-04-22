<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-27 | Updated: 2026-03-27 -->

# docs (Feature Documentation)

## Purpose
bizpos-web 프로젝트의 PDCA 방법론 기반 피처 문서 저장소입니다.
최신 피처들(anomaly-alert, error-response-unify, pos-device-auth, sales-analytics 등)의
계획, 설계, 분석, 보고서를 포함합니다.

## Key Files

| File | Description |
|------|-------------|
| `features/_INDEX.md` | 전체 피처 인덱스 |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `features/` | 피처별 문서 (plan, design 파일) |
| `03-analysis/` | 갭 분석 문서 |
| `04-report/` | 완료 보고서 |
| `archive/` | 완료된 피처 아카이브 (날짜별) |

## Feature Documents

### Active Features
| Feature | Plan | Design | Analysis | Report |
|---------|------|--------|----------|--------|
| anomaly-alert | ✅ | ✅ | ✅ | ✅ |
| error-response-unify | ✅ | ✅ | ✅ | ✅ |
| pos-device-auth | ✅ | ✅ | ✅ | ✅ |
| sales-analytics | ✅ | ✅ | ✅ | ✅ |

### Archived Features (2026-03)
- online-management
- pos-device-auth (archive)
- pos-realtime-dashboard

## For AI Agents

### Working In This Directory
- 새 피처 문서: `features/{feature-name}.plan.md` 먼저 작성
- PDCA 순서: plan → design → (구현) → 03-analysis → 04-report
- 완료된 피처: `archive/YYYY-MM/{feature}/`로 이동

### Document Naming Convention
```
features/{feature}.plan.md     ← Plan 단계
features/{feature}.design.md   ← Design 단계
03-analysis/{feature}.analysis.md  ← Check 단계
04-report/features/{feature}.report.md  ← Report 단계
```

### Testing Requirements
- 문서 작성 후 `_INDEX.md` 업데이트

## Dependencies

### Internal
- 루트 `docs/AGENTS.md` - 레거시 피처 문서 위치

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
