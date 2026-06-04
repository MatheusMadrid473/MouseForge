const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const versionPath = path.join(root, 'VERSION');
const apiPackagePath = path.join(root, 'api', 'package.json');
const apiLockPath = path.join(root, 'api', 'package-lock.json');
const webPackagePath = path.join(root, 'web', 'package.json');
const webLockPath = path.join(root, 'web', 'package-lock.json');
const apiVersionPath = path.join(root, 'api', 'src', 'version.ts');
const webVersionPath = path.join(root, 'web', 'src', 'version.ts');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function readVersion() {
  if (!fs.existsSync(versionPath)) {
    return '0.0.0';
  }

  return fs.readFileSync(versionPath, 'utf8').trim() || '0.0.0';
}

function bumpVersion(version, bump) {
  const [major, minor, patch] = version.split('.').map((part) => Number(part) || 0);

  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }

  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  if (bump === 'patch') {
    return `${major}.${minor}.${patch + 1}`;
  }

  return version;
}

function detectBump(message) {
  if (/BREAKING CHANGE|^[a-z]+(?:\([^)]+\))?!:/i.test(message)) {
    return 'major';
  }

  if (/^feat(?:\([^)]+\))?:/i.test(message)) {
    return 'minor';
  }

  if (/^fix(?:\([^)]+\))?:/i.test(message)) {
    return 'patch';
  }

  return 'none';
}

function syncPackageVersion(filePath, version) {
  const data = readJson(filePath);
  data.version = version;
  writeJson(filePath, data);
}

function syncPackageLockVersion(filePath, version) {
  const data = readJson(filePath);
  data.version = version;

  if (data.packages && data.packages['']) {
    data.packages[''].version = version;
  }

  writeJson(filePath, data);
}

function syncVersion(version) {
  fs.writeFileSync(versionPath, `${version}\n`);
  syncPackageVersion(apiPackagePath, version);
  syncPackageLockVersion(apiLockPath, version);
  syncPackageVersion(webPackagePath, version);
  syncPackageLockVersion(webLockPath, version);
  fs.writeFileSync(apiVersionPath, `export const APP_VERSION = '${version}';\n`);
  fs.writeFileSync(webVersionPath, `export const APP_VERSION = '${version}';\n`);
}

const messageFileIndex = process.argv.indexOf('--message-file');
const messageFile = messageFileIndex >= 0 ? process.argv[messageFileIndex + 1] : undefined;
const sourceIndex = process.argv.indexOf('--source');
const source = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
const currentVersion = readVersion();
const message = messageFile && fs.existsSync(messageFile) ? fs.readFileSync(messageFile, 'utf8').trim() : '';
const shouldSkipBump = source === 'commit' || source === 'merge' || source === 'squash';
const nextVersion = shouldSkipBump ? currentVersion : bumpVersion(currentVersion, message ? detectBump(message) : 'none');

syncVersion(nextVersion);
console.log(`MouseForge version ${currentVersion} -> ${nextVersion}`);

if (messageFile) {
  execFileSync('git', [
    'add',
    'VERSION',
    'api/package.json',
    'api/package-lock.json',
    'api/src/version.ts',
    'web/package.json',
    'web/package-lock.json',
    'web/src/version.ts',
  ], { cwd: root, stdio: 'inherit' });
}
