// 최초 실행 시 .env(관리자 비밀번호, 세션 비밀키)를 만든다. 이미 있으면 아무것도 하지 않는다.
import fs from 'fs';
import crypto from 'crypto';
import readline from 'readline';

if (fs.existsSync('.env')) process.exit(0);

const ask = q => new Promise(resolve => {
  if (!process.stdin.isTTY) return resolve('');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, a => { rl.close(); resolve(a.trim()); });
});

let pw = process.env.ADMIN_PASSWORD || (await ask('\n관리자 비밀번호를 정하세요 (엔터 = 자동 생성): '));
const generated = !pw;
if (generated) pw = crypto.randomBytes(9).toString('base64url');

fs.writeFileSync('.env', `ADMIN_PASSWORD=${pw}\nSESSION_SECRET=${crypto.randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
console.log(generated ? `\n관리자 비밀번호(자동 생성): ${pw}   ← 메모해 두세요 (.env 파일에도 있습니다)\n` : '\n관리자 비밀번호를 저장했습니다 (.env)\n');
