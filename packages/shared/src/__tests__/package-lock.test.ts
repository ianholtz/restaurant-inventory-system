import * as fs from 'fs';
import * as path from 'path';

describe('Package Lock File', () => {
  const rootDir = path.resolve(__dirname, '../../../..');
  const packageLockPath = path.join(rootDir, 'package-lock.json');

  test('package-lock.json should exist', () => {
    expect(fs.existsSync(packageLockPath)).toBe(true);
  });

  test('package-lock.json should be valid JSON', () => {
    const content = fs.readFileSync(packageLockPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('package-lock.json should have correct structure', () => {
    const content = fs.readFileSync(packageLockPath, 'utf8');
    const lockFile = JSON.parse(content);

    expect(lockFile.name).toBe('restaurant-inventory-system');
    expect(lockFile.version).toBe('1.0.0');
    expect(lockFile.lockfileVersion).toBe(3);
    expect(lockFile.packages).toBeDefined();
    expect(lockFile.packages['']).toBeDefined();
    expect(lockFile.packages[''].workspaces).toEqual(['packages/*']);
  });

  test('package-lock.json should include workspace packages', () => {
    const content = fs.readFileSync(packageLockPath, 'utf8');
    const lockFile = JSON.parse(content);

    expect(lockFile.packages['packages/api']).toBeDefined();
    expect(lockFile.packages['packages/mobile']).toBeDefined();
    expect(lockFile.packages['packages/infrastructure']).toBeDefined();
    expect(lockFile.packages['packages/shared']).toBeDefined();
  });

  test('package-lock.json should include root devDependencies', () => {
    const content = fs.readFileSync(packageLockPath, 'utf8');
    const lockFile = JSON.parse(content);

    const rootPackage = lockFile.packages[''];
    expect(rootPackage.devDependencies).toBeDefined();
    expect(rootPackage.devDependencies['@typescript-eslint/eslint-plugin']).toBeDefined();
    expect(rootPackage.devDependencies['@typescript-eslint/parser']).toBeDefined();
    expect(rootPackage.devDependencies['eslint']).toBeDefined();
    expect(rootPackage.devDependencies['prettier']).toBeDefined();
    expect(rootPackage.devDependencies['typescript']).toBeDefined();
  });
});