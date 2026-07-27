import { spawn } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

const dataDirectory = process.env.JWKS_DATA_DIR || '/data';
const jwksPath = `${dataDirectory}/jwks.json`;

function generateJwks() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const jwk = privateKey.export({ format: 'jwk' });

  Object.assign(jwk, {
    alg: 'RS256',
    kid: randomBytes(8).toString('hex'),
    use: 'sig',
  });

  return JSON.stringify({
    keys: [jwk],
  });
}

mkdirSync(dataDirectory, { recursive: true });

let jwks = process.env.JWKS_KEY?.trim();

if (!jwks) {
  if (existsSync(jwksPath)) {
    jwks = readFileSync(jwksPath, 'utf8');
    console.log('JWKS loaded from persistent storage.');
  } else {
    jwks = generateJwks();

    writeFileSync(jwksPath, jwks, {
      encoding: 'utf8',
      mode: 0o600,
    });

    console.log('New persistent JWKS generated.');
  }
}

// Vérifie que la valeur est bien du JSON valide.
JSON.parse(jwks);

process.env.JWKS_KEY = jwks;

// Le bootstrap démarre comme root pour pouvoir écrire sur le volume,
// puis LobeHub tourne avec l’UID non privilégié utilisé officiellement.
if (typeof process.setgid === 'function' && process.getgid?.() === 0) {
  process.setgid(1001);
}

if (typeof process.setuid === 'function' && process.getuid?.() === 0) {
  process.setuid(1001);
}

const child = spawn('/bin/node', ['/app/startServer.js'], {
  env: process.env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
