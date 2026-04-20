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

// 필수 섹션 존재 여부
const requiredSections = [
  { pattern: /^## 기능 요약/m,               label: '## 기능 요약' },
  { pattern: /^## 파일 목록/m,               label: '## 파일 목록' },
  { pattern: /^## 1\. DTO/m,                 label: '## 1. DTO' },
  { pattern: /^## 2\. Repository Interface/m, label: '## 2. Repository Interface' },
  { pattern: /^## 3\. Repository 구현/m,     label: '## 3. Repository 구현' },
  { pattern: /^## 4\. Service/m,             label: '## 4. Service' },
  { pattern: /^## 5\. Controller/m,          label: '## 5. Controller' },
  { pattern: /^## 6\. 테스트 케이스/m,       label: '## 6. 테스트 케이스' },
  { pattern: /^## 7\. Response 코드/m,       label: '## 7. Response 코드' },
];

for (const section of requiredSections) {
  if (!section.pattern.test(content)) {
    failures.push(`섹션 누락: ${section.label}`);
  }
}

// 테스트 케이스 필수 항목
if (!/\[SUCCESS\]/.test(content))         failures.push('테스트 케이스: [SUCCESS] 누락');
if (!/\[FAIL:validation\]/.test(content)) failures.push('테스트 케이스: [FAIL:validation] 누락');

// Repository Interface 섹션에서 where 파라미터 타입 검증
// "변경 없음" 명시 시 신규 메서드 없으므로 스킵
const interfaceSection = content.match(/## 2\. Repository Interface([\s\S]*?)(?=^##)/m)?.[1] ?? '';
const hasNewWhereParam = /where\s*[:(]/.test(interfaceSection);
const hasChanges = !/변경\s*없음/.test(interfaceSection);
if (hasNewWhereParam && hasChanges && !/FindOptionsWhere/.test(interfaceSection)) {
  failures.push('Repository Interface: where 파라미터에 FindOptionsWhere<Entity> 미사용');
}

// frontmatter 없어야 함
if (/^---/.test(content)) {
  failures.push('frontmatter 존재: work 파일에 frontmatter 불필요');
}

// 결과 출력
if (failures.length > 0) {
  console.error(`[harness] STOP: ${fileName} 검증 실패`);
  failures.forEach(f => console.error(`  ❌ ${f}`));
  process.exit(1);
}

console.log(`[harness] OK: ${fileName} 검증 통과`);
