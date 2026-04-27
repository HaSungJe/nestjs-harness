#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('[harness] validate-work: 파일 경로가 필요합니다.');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const fileName = path.basename(filePath);
const failures = [];

// harness-config.json 에서 필수 섹션 목록 로드 (프로젝트별 override 가능)
let requiredSections;
try {
  const configPath = path.join(__dirname, '..', 'harness-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  requiredSections = config.harness_rules?.required_work_sections;
} catch (_) {}

if (!Array.isArray(requiredSections) || requiredSections.length === 0) {
  // fallback — 설정 누락 시 기본 뼈대
  requiredSections = ['## 기능 요약', '## 파일 목록', '## 6. 테스트 케이스'];
}

// 필수 섹션 존재 여부 (정규식 특수문자 이스케이프 + 줄 시작 매칭)
for (const label of requiredSections) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('^' + escaped, 'm');
  if (!pattern.test(content)) {
    failures.push(`섹션 누락: ${label}`);
  }
}

// 테스트 케이스 필수 항목
if (!/\[SUCCESS\]/.test(content))         failures.push('테스트 케이스: [SUCCESS] 누락');
if (!/\[FAIL:validation\]/.test(content)) failures.push('테스트 케이스: [FAIL:validation] 누락');

// frontmatter 없어야 함 (work 파일은 frontmatter 미사용)
if (/^---/.test(content)) {
  failures.push('frontmatter 존재: work 파일에 frontmatter 불필요');
}

if (failures.length > 0) {
  console.error(`[harness] STOP: ${fileName} 검증 실패`);
  failures.forEach(f => console.error(`  ❌ ${f}`));
  process.exit(1);
}

console.log(`[harness] OK: ${fileName} 검증 통과`);
