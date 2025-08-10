#!/usr/bin/env node

/**
 * Script to validate package-lock.json integrity
 * This ensures the lock file is properly formatted and contains all workspace packages
 */

const fs = require('fs');
const path = require('path');

function validateLockFile() {
  const rootDir = path.resolve(__dirname, '..');
  const packageLockPath = path.join(rootDir, 'package-lock.json');
  const packageJsonPath = path.join(rootDir, 'package.json');

  console.log('🔍 Validating package-lock.json...');

  // Check if lock file exists
  if (!fs.existsSync(packageLockPath)) {
    console.error('❌ package-lock.json not found!');
    process.exit(1);
  }

  // Check if it's valid JSON
  let lockFile;
  try {
    const content = fs.readFileSync(packageLockPath, 'utf8');
    lockFile = JSON.parse(content);
  } catch (error) {
    console.error('❌ package-lock.json is not valid JSON:', error.message);
    process.exit(1);
  }

  // Check basic structure
  if (!lockFile.name || !lockFile.version || !lockFile.lockfileVersion || !lockFile.packages) {
    console.error('❌ package-lock.json is missing required fields');
    process.exit(1);
  }

  // Check workspace packages
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.workspaces) {
    const expectedPackages = ['packages/api', 'packages/mobile', 'packages/infrastructure', 'packages/shared'];
    
    for (const pkg of expectedPackages) {
      if (!lockFile.packages[pkg]) {
        console.error(`❌ Workspace package ${pkg} not found in lock file`);
        process.exit(1);
      }
    }
  }

  console.log('✅ package-lock.json is valid and contains all workspace packages');
  console.log(`📦 Lock file version: ${lockFile.lockfileVersion}`);
  console.log(`🏷️  Project: ${lockFile.name}@${lockFile.version}`);
}

if (require.main === module) {
  validateLockFile();
}

module.exports = { validateLockFile };