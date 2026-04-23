#!/usr/bin/env node
/**
 * Electron 빌드 전: Static Export 호환 아닌 경로를 임시 제거.
 * - app/store/admin/**  (SSR, cookies 사용)
 * - app/client/admin/** (SSR, cookies 사용)
 * - app/portal/**       (SSR, cookies 사용)
 * - app/setup/**        (SSR)
 * - app/api/**          (API routes - static export 불가)
 *
 * 제거된 경로는 .electron-excluded/ 로 백업되어 restore 스크립트가 복원.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, '.electron-excluded');

const EXCLUDED_PATHS = [
  'app/store/admin',
  'app/client/admin',
  'app/portal',
  'app/setup',
  'app/api',
];

function moveDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  skip (없음): ${src}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  console.log(`  moved: ${src} -> ${dest}`);
}

console.log('[prepare-electron-build] 제외 경로 백업 시작');

if (fs.existsSync(BACKUP_DIR)) {
  console.log('  경고: .electron-excluded/ 이미 존재 (이전 빌드 비정상 종료?)');
  console.log('  기존 백업 삭제 후 재시작');
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
}

fs.mkdirSync(BACKUP_DIR, { recursive: true });

for (const rel of EXCLUDED_PATHS) {
  const src = path.join(ROOT, rel);
  const dest = path.join(BACKUP_DIR, rel);
  moveDir(src, dest);
}

console.log('[prepare-electron-build] 완료');
