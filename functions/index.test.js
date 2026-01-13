/**
 * Privacy and functionality tests for Write Your Senator
 *
 * These tests verify:
 * 1. No logging of user data occurs
 * 2. No data persistence
 * 3. Functions work correctly
 *
 * Run with: npm test
 */

import { strict as assert } from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Privacy Tests', () => {

  describe('No Logging Verification', () => {

    it('should not contain console.log in index.js', () => {
      const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
      const hasConsoleLog = /console\.log\s*\(/.test(indexContent);
      assert.equal(hasConsoleLog, false, 'index.js should not contain console.log');
    });

    it('should not contain console.error in index.js', () => {
      const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
      const hasConsoleError = /console\.error\s*\(/.test(indexContent);
      assert.equal(hasConsoleError, false, 'index.js should not contain console.error');
    });

    it('should not contain console.warn in index.js', () => {
      const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
      const hasConsoleWarn = /console\.warn\s*\(/.test(indexContent);
      assert.equal(hasConsoleWarn, false, 'index.js should not contain console.warn');
    });

    it('should not contain console.info in index.js', () => {
      const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
      const hasConsoleInfo = /console\.info\s*\(/.test(indexContent);
      assert.equal(hasConsoleInfo, false, 'index.js should not contain console.info');
    });

  });

  describe('No Data Storage Verification', () => {

    it('should not import firebase-admin/firestore', () => {
      const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
      const hasFirestore = /firebase-admin\/firestore|getFirestore|collection\(|doc\(/.test(indexContent);
      assert.equal(hasFirestore, false, 'index.js should not use Firestore');
    });

    it('should not import firebase-admin/database', () => {
      const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
      const hasDatabase = /firebase-admin\/database|getDatabase|ref\(/.test(indexContent);
      assert.equal(hasDatabase, false, 'index.js should not use Realtime Database');
    });

    it('should not write to persistent storage', () => {
      const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
      // Check for Firestore/database write patterns (not in-memory Map which is fine)
      const hasPersistentStorage = /firestore\(\)|\.collection\(|\.doc\(|writeFile|fs\.write|admin\.database/.test(indexContent);
      assert.equal(hasPersistentStorage, false, 'index.js should not write to persistent storage');
    });

  });

  describe('Privacy Comments Verification', () => {

    it('should have privacy comments in catch blocks', () => {
      const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
      const catchBlocks = indexContent.match(/catch\s*\{[^}]*\}/g) || [];

      for (const block of catchBlocks) {
        const hasPrivacyComment = /Privacy:/.test(block);
        assert.equal(hasPrivacyComment, true, 'All catch blocks should have privacy comments');
      }
    });

  });

});

describe('Functionality Tests', () => {

  describe('Senator Data', () => {

    it('should have all 50 states in senators.js', async () => {
      const { senators } = await import('./senators.js');
      const stateCount = Object.keys(senators).length;
      assert.equal(stateCount, 50, 'Should have exactly 50 states');
    });

    it('should have 2 senators per state', async () => {
      const { senators } = await import('./senators.js');
      for (const [state, stateSenators] of Object.entries(senators)) {
        assert.equal(stateSenators.length, 2, `${state} should have exactly 2 senators`);
      }
    });

    it('should have required fields for each senator', async () => {
      const { senators } = await import('./senators.js');
      for (const [state, stateSenators] of Object.entries(senators)) {
        for (const senator of stateSenators) {
          assert.ok(senator.name, `Senator in ${state} should have a name`);
          assert.ok(senator.party, `Senator in ${state} should have a party`);
          assert.ok(senator.address, `Senator in ${state} should have an address`);
        }
      }
    });

  });

  describe('State Abbreviations', () => {

    it('should have all 50 state name mappings', async () => {
      const { stateAbbreviations } = await import('./senators.js');
      const count = Object.keys(stateAbbreviations).length;
      assert.equal(count, 50, 'Should have exactly 50 state abbreviation mappings');
    });

  });

});

describe('Rate Limiting', () => {

  it('should have rate limit configuration', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const hasRateLimitConfig = /RATE_LIMIT_WINDOW_MS|RATE_LIMIT_MAX_REQUESTS/.test(indexContent);
    assert.equal(hasRateLimitConfig, true, 'Should have rate limit configuration');
  });

  it('should have maxInstances set for lookupSenators', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const hasMaxInstances = /lookupSenators\s*=\s*onRequest\(\s*\{[^}]*maxInstances/.test(indexContent);
    assert.equal(hasMaxInstances, true, 'lookupSenators should have maxInstances configured');
  });

  it('should have maxInstances set for generateLetter', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const hasMaxInstances = /generateLetter\s*=\s*onRequest\(\s*\{[^}]*maxInstances/.test(indexContent);
    assert.equal(hasMaxInstances, true, 'generateLetter should have maxInstances configured');
  });

  it('should check rate limit in lookupSenators', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const lookupFn = indexContent.match(/export const lookupSenators[\s\S]*?^\}\);/m)?.[0] || '';
    const hasRateCheck = /checkRateLimit/.test(lookupFn);
    assert.equal(hasRateCheck, true, 'lookupSenators should call checkRateLimit');
  });

  it('should check rate limit in generateLetter', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const generateFn = indexContent.match(/export const generateLetter[\s\S]*?^\}\);/m)?.[0] || '';
    const hasRateCheck = /checkRateLimit/.test(generateFn);
    assert.equal(hasRateCheck, true, 'generateLetter should call checkRateLimit');
  });

  it('should return 429 when rate limited', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const has429 = /status\(429\)/.test(indexContent);
    assert.equal(has429, true, 'Should return 429 status when rate limited');
  });

});

describe('Letter Output Cleanup', () => {

  it('should have CRITICAL instruction to prevent preamble', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const hasCritical = /CRITICAL.*Output ONLY|Start directly with.*Dear Senator/i.test(indexContent);
    assert.equal(hasCritical, true, 'Prompt should have CRITICAL instruction to prevent preamble');
  });

  it('should strip content before Dear Senator', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const hasCleanup = /Dear Senator.*\.index|letterBody\.match\(.*Dear Senator/i.test(indexContent);
    assert.equal(hasCleanup, true, 'Should have cleanup logic for content before Dear Senator');
  });

  it('should handle Sincerely ending', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const hasSincerelyCleanup = /Sincerely|sincerelyMatch|sincerelyIndex/i.test(indexContent);
    assert.equal(hasSincerelyCleanup, true, 'Should have cleanup logic for Sincerely ending');
  });

});

describe('Letter Length Constraints', () => {

  it('should specify word limit in prompt', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const hasWordLimit = /250-300 words|one page|ONE page/.test(indexContent);
    assert.equal(hasWordLimit, true, 'Prompt should specify word/page limit');
  });

  it('should specify paragraph limit in prompt', () => {
    const indexContent = readFileSync(join(__dirname, 'index.js'), 'utf-8');
    const hasParagraphLimit = /3-4.*paragraph|short paragraph/.test(indexContent);
    assert.equal(hasParagraphLimit, true, 'Prompt should specify paragraph limit');
  });

});
