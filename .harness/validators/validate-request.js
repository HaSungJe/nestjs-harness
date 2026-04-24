#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('[harness] validate-request: 파일 경로가 필요합니다.');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
if (!fmMatch) {
  console.error('[harness] STOP: frontmatter가 없습니다. .harness/templates/request.md를 사용하세요.');
  process.exit(1);
}

const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'request.schema.json'), 'utf-8')
);

const lines = fmMatch[1].split('\n');
const fm = {};
for (const line of lines) {
  const [key, ...rest] = line.split(':');
  if (key && rest.length) fm[key.trim()] = rest.join(':').trim();
}

const missing = [];
for (const field of schema.required) {
  const val = fm[field];
  if (!val || val === '""' || val === '[]') missing.push(field);
}

if (missing.length > 0) {
  console.error(`[harness] STOP: 필수 항목 누락 → ${missing.join(', ')}`);
  console.error('[harness] .harness/templates/request.md 양식을 채운 후 다시 저장하세요.');
  process.exit(1);
}

console.log(`[harness] OK: ${path.basename(filePath)} 검증 통과 → work 파일 작성을 시작합니다.`);
