import { spawn } from 'node:child_process';
import {
  generateKeyPairSync,
  randomBytes,
} from 'node:crypto';
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

try {
  mkdirSync(dataDirectory, { recursive: true });

  let jwks = process.env.JWKS_KEY?.trim();

  if (!jwks) {
    if (existsSync(jwksPath)) {
      jwks = readFileSync(jwksPath, 'utf8');
      console.log('Persistent JWKS loaded.');
    } else {
      jwks = generateJwks();

      writeFileSync(jwksPath, jwks, {
        encoding: 'utf8',
        mode: 0o600,
      });

      console.log('New persistent JWKS generated.');
    }
  }

  // Vérification avant le lancement de LobeHub
  const parsed = JSON.parse(jwks);

  if (!Array.isArray(parsed.keys) || parsed.keys.length === 0) {
    throw new Error('JWKS_KEY does not contain a valid keys array.');
  }

  process.env.JWKS_KEY = jwks;

  // LobeHub fonctionne officiellement avec UID/GID 1001.
  if (process.getgid?.() === 0) {
    process.setgid(1001);
  }

  if (process.getuid?.() === 0) {
    process.setuid(1001);
  }

  const child = spawn('/bin/node', ['/app/startServer.js'], {
    env: process.env,
    stdio: 'inherit',
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`LobeHub stopped by signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 1);
  });
} catch (error) {
  console.error('Bootstrap failed:', error);
  process.exit(1);
}
