# BIZPOS Offline-First 아키텍처 마이그레이션 로드맵

## 1. 목적
네트워크 연결 상태와 관계없이 안정적인 POS 운영 및 결제 정합성을 보장하기 위해, 기존의 웹 기반 IndexedDB 아키텍처를 Electron 환경에 최적화된 파일 기반 DB(SQLite) 아키텍처로 전환하고 하드코딩된 설정을 제거한다.

## 2. 상세 로드맵

### Phase 1: 환경 안정화 (Infrastructure & Stability)
*   **목표**: 배포 환경 독립성 확보 및 설정 오류 방지.
*   **주요 작업**:
    *   `localhost` 하드코딩 제거: `app/api/` 등에서 도메인 참조를 `process.env`로 표준화.
    *   동적 포트 할당: `electron/main.js`에서 Next.js 서버 기동 시 가용 포트 자동 탐색 및 주입.
    *   운영 환경 배포 가이드 작성: CI/CD 환경 변수 주입 및 보안 설정 관리.

### Phase 2: 데이터 스토리지 전환 (Storage Migration)
*   **목표**: 데이터 안정성 및 영속성 강화 (IndexedDB → SQLite).
*   **주요 작업**:
    *   `better-sqlite3` 패키지 도입.
    *   Electron 메인 프로세스(Node.js)에 DB 핸들러 구현 (SQLite 파일 접근).
    *   Renderer(브라우저)와 Main 프로세스 간 IPC 통신 채널(`preload.js`) 설계 및 구현.

### Phase 3: 아키텍처 계층화 (Abstraction & Transaction)
*   **목표**: 비즈니스 로직과 데이터 저장소 분리 및 결제 일관성 확보.
*   **주요 작업**:
    *   **Repository 패턴 도입**: 컴포넌트에서 DB 직접 호출 제거 → `lib/repository/`를 통한 추상화 계층 적용.
    *   **원자적 결제 트랜잭션**: [Local DB 생성(pending) → Remote API 호출 → Local DB 상태 업데이트] 트랜잭션 구현.

### Phase 4: 동기화 및 검증 (Reliability)
*   **목표**: 오프라인 데이터의 원활한 동기화 및 시스템 무결성 보증.
*   **주요 작업**:
    *   `txSync.ts`를 SQLite 기반의 주기적 백그라운드 동기화 서비스로 고도화.
    *   전체 테스트: 오프라인 모드 시뮬레이션 및 동기화 무결성 테스트.

## 3. Todo List
- [x] 환경 설정: 포트 동적 할당 및 하드코딩 제거 (운영 환경 대응)
- [x] SQLite 전환: better-sqlite3 도입 및 Electron 메인 프로세스 DB 인터페이스 구현
- [x] IPC 정의: 프론트엔드-메인 프로세스 간 통신 채널(preload.js) 설계
- [x] 결제 트랜잭션 로직: Local DB 생성 -> Remote API 호출 -> Local DB 결과 업데이트 트랜잭션 설계
- [x] 동기화 서비스: txSync 로직을 SQLite 기반으로 재구현 및 검증
- [x] app/pos: 프론트엔드 API 호출을 Repository 계층으로 전환
- [ ] 테스트: 오프라인/온라인 시나리오별 트랜잭션 무결성 검증
