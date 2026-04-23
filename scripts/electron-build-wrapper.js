#!/usr/bin/env node
/**
 * Electron 빌드 전체 오케스트레이터:
 *   1) prepare: Static Export 불가 경로를 .electron-excluded/로 백업
 *   2) next build (BUILD_TARGET=electron -> out/ 폴더 생성)
 *   3) restore: 백업 경로 원위치 복원 (빌드 실패해도 finally로 실행)
 *
 * 사용: node scripts/electron-build-wrapper.js
 * 실패 시 exit 1 - 이후 electron-builder 실행 안됨.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = __dirname;

function run(cmd, args, env = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  return result.status === 0;
}

function runNode(scriptName) {
  return run('node', [path.join(SCRIPTS_DIR, scriptName)]);
}

let buildSuccess = false;

try {
  console.log('\n[wrapper] Step 1/3: prepare');
  if (!runNode('prepare-electron-build.js')) {
    throw new Error('prepare 스크립트 실패');
  }

  console.log('\n[wrapper] Step 2/3: next build');
  if (!run('pnpm', ['exec', 'next', 'build'], { BUILD_TARGET: 'electron' })) {
    throw new Error('next build 실패');
  }

  buildSuccess = true;
} catch (err) {
  console.error('\n[wrapper] 빌드 중 오류:', err.message);
} finally {
  console.log('\n[wrapper] Step 3/3: restore (항상 실행)');
  if (!runNode('restore-electron-build.js')) {
    console.error('[wrapper] 경고: restore 실패 - 수동으로 .electron-excluded/ 확인 필요');
  }
}

if (!buildSuccess) {
  process.exit(1);
}

console.log('\n[wrapper] 빌드 완료 - electron-builder 준비됨');
