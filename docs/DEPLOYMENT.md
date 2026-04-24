# BIZPOS 배포 가이드

## 🚀 버전 배포 프로세스

**중요**: 반드시 다음 순서대로 진행하세요!

### 단계별 가이드

#### 1️⃣ package.json 버전 업데이트
```bash
# package.json에서 version 필드 수정
"version": "0.1.XX"  →  "version": "0.1.YY"
```

#### 2️⃣ 버전 업데이트 커밋
```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: bump version to 0.1.YY"
git push
```

#### 3️⃣ 🏷️ Git Tag 생성 (⚠️ 반드시 필수!)
```bash
git tag v0.1.YY
git push origin v0.1.YY
```

#### 4️⃣ GitHub Release 자동 생성
- GitHub이 tag를 감지하고 자동으로 Release 생성
- Releases 탭에서 Latest 버전 확인

---

## ⚠️ 중요: Git Tag가 없으면 안 됨!

### ❌ 잘못된 방식 (안 됨)
```bash
# package.json만 수정하고 tag 없이 push
git add package.json
git commit -m "chore: bump version to 0.1.YY"
git push
# ❌ GitHub Release가 생성되지 않음
# ❌ Latest 버전이 업데이트되지 않음
```

### ✅ 올바른 방식
```bash
# 1. 커밋 후 푸시
git commit -m "chore: bump version to 0.1.YY"
git push

# 2. 반드시 tag 생성 및 푸시
git tag v0.1.YY
git push origin v0.1.YY
# ✅ GitHub이 tag를 감지하고 Release 생성
# ✅ Latest 버전이 자동으로 업데이트
```

---

## 🔍 배포 상태 확인

### GitHub Releases 확인
```
GitHub 저장소 → Releases 탭
→ Latest 버전 확인
```

### Vercel 배포 상태 확인
```
Vercel 대시보드 → Deployments
→ Production (최종 배포) / Preview (미리보기)
```

### 배포 검증
```bash
# 로컬 빌드 테스트
pnpm build

# TypeScript 타입 체크 (빌드에 포함됨)
# ESLint 확인 (선택사항)
pnpm lint
```

---

## 📋 완전한 배포 체크리스트

- [ ] 코드 변경 완료
- [ ] 로컬 빌드 테스트 (`pnpm build`)
- [ ] package.json 버전 수정
- [ ] pnpm-lock.yaml 최신화 (`pnpm install`)
- [ ] 커밋 (`git commit -m "chore: bump version to X.X.X"`)
- [ ] 푸시 (`git push`)
- [ ] **Tag 생성 (`git tag vX.X.X`)**
- [ ] **Tag 푸시 (`git push origin vX.X.X`)**
- [ ] GitHub Releases 확인 (Latest 버전 업데이트)
- [ ] Vercel 배포 완료 확인

---

## 🚨 일반적인 실수

### 실수 1: Tag 없이 배포
**증상**: package.json은 0.1.55인데 Latest는 0.1.52
**원인**: git tag 생성 안 함
**해결**: `git tag v0.1.55` 및 `git push origin v0.1.55` 실행

### 실수 2: Lockfile 업데이트 안 함
**증상**: Vercel 빌드 실패 (ERR_PNPM_OUTDATED_LOCKFILE)
**원인**: npm/pnpm 패키지 설치 후 lockfile 푸시 안 함
**해결**: `pnpm install` 후 `git add pnpm-lock.yaml && git push`

### 실수 3: TypeScript 빌드 에러 무시
**증상**: 로컬에서는 되는데 Vercel에서 빌드 실패
**원인**: 로컬 build 테스트 미실행
**해결**: 배포 전 반드시 `pnpm build` 실행

---

## 🔄 자동 배포 설정

- **Main 브랜치**: Vercel Production에 자동 배포
- **PR/브랜치**: Vercel Preview에 자동 배포
- **Tag 푸시**: GitHub Release 자동 생성

---

**최종 기억 사항**: 버전 배포 시 **반드시 git tag를 생성하고 푸시**해야 GitHub Release가 생성됩니다! 🏷️
