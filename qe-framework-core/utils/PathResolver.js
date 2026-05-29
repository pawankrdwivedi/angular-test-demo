import fs from 'fs';
import path from 'path';

function hasPackageJson(dir) {
  return fs.existsSync(path.join(dir, 'package.json'));
}

function getAppRoot() {
  const cwd = process.cwd();

  if (path.basename(cwd) === 'app' && hasPackageJson(cwd)) {
    return cwd;
  }

  const nestedApp = path.join(cwd, 'app');
  if (hasPackageJson(nestedApp)) {
    return nestedApp;
  }

  return cwd;
}

function resolveFromAppRoot(...segments) {
  return path.join(getAppRoot(), ...segments);
}

export { getAppRoot, resolveFromAppRoot };
