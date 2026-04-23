#!/usr/bin/env node
/**
 * Electron 빌드 후: prepare 스크립트가 백업한 경로를 원위치 복원.
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
    console.log(`  skip (백업 없음): ${src}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  console.log(`  restored: ${src} -> ${dest}`);
}

console.log('[restore-electron-build] 백업 경로 복원 시작');

if (!fs.existsSync(BACKUP_DIR)) {
  console.log('  .electron-excluded/ 없음 - 복원할 파일 없음');
  process.exit(0);
}

for (const rel of EXCLUDED_PATHS) {
  const src = path.join(BACKUP_DIR, rel);
  const dest = path.join(ROOT, rel);
  moveDir(src, dest);
}

try {
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  console.log('  .electron-excluded/ 정리 완료');
} catch (err) {
  console.warn('  백업 디렉토리 정리 실패:', err.message);
}

console.log('[restore-electron-build] 완료');
