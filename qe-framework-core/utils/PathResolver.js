import fs from 'fs';
import path from 'path';

function hasPackageJson(dir) {
  return fs.existsSync(path.join(dir, 'package.json'));
}

function getAppRoot() {
  const cwd = process.cwd();

  // Respect APP env var (if set) to name the application folder (e.g. 'risk-desktop')
  const appFolderName = process.env.APP || 'app';

  if (path.basename(cwd) === appFolderName && hasPackageJson(cwd)) {
    return cwd;
  }

  const nestedApp = path.join(cwd, appFolderName);
  if (hasPackageJson(nestedApp)) {
    return nestedApp;
  }

  // Fallback to legacy 'app' folder if present
  const legacyApp = path.join(cwd, 'app');
  if (hasPackageJson(legacyApp)) {
    return legacyApp;
  }

  return cwd;
}

function resolveFromAppRoot(...segments) {
  return path.join(getAppRoot(), ...segments);
}

export { getAppRoot, resolveFromAppRoot };
