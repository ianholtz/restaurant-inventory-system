import * as fs from 'fs';
import * as path from 'path';

describe('CI/CD Integration Requirements', () => {
  const rootDir = path.resolve(__dirname, '../../../..');

  test('should have package-lock.json for npm ci command', () => {
    const packageLockPath = path.join(rootDir, 'package-lock.json');
    expect(fs.existsSync(packageLockPath)).toBe(true);
    
    // Verify it's a valid lock file format
    const content = fs.readFileSync(packageLockPath, 'utf8');
    const lockFile = JSON.parse(content);
    
    expect(lockFile.lockfileVersion).toBeDefined();
    expect(lockFile.packages).toBeDefined();
    expect(typeof lockFile.lockfileVersion).toBe('number');
  });

  test('should have supported lock file pattern for GitHub Actions cache', () => {
    const rootFiles = fs.readdirSync(rootDir);
    const supportedLockFiles = [
      'package-lock.json',
      'npm-shrinkwrap.json',
      'yarn.lock'
    ];
    
    const hasLockFile = supportedLockFiles.some(lockFile => 
      rootFiles.includes(lockFile)
    );
    
    expect(hasLockFile).toBe(true);
  });

  test('should have workspace configuration for monorepo', () => {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content);
    
    expect(packageJson.workspaces).toBeDefined();
    expect(Array.isArray(packageJson.workspaces)).toBe(true);
    expect(packageJson.workspaces).toContain('packages/*');
  });

  test('should have all workspace packages defined in lock file', () => {
    const packageLockPath = path.join(rootDir, 'package-lock.json');
    const content = fs.readFileSync(packageLockPath, 'utf8');
    const lockFile = JSON.parse(content);
    
    const expectedPackages = [
      'packages/api',
      'packages/mobile',
      'packages/infrastructure',
      'packages/shared'
    ];
    
    expectedPackages.forEach(pkg => {
      expect(lockFile.packages[pkg]).toBeDefined();
      expect(lockFile.packages[pkg].name).toBeDefined();
      expect(lockFile.packages[pkg].version).toBeDefined();
    });
  });
});