const assert = require('assert');
const path = require('path');

let pass = 0;
let fail = 0;

const test = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    pass++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
    fail++;
  }
};

console.log('====================================================');
console.log('  CUSTECH Osara — Automated E2E Lockdown Test Suite');
console.log('====================================================\n');

// 1. Test LTI 1.3 Service & JWKS Endpoint
test('LTI 1.3 JWKS key set generation', () => {
  const { getLTIJWKS } = require('../backend/lti/service');
  const jwks = getLTIJWKS();
  assert.ok(Array.isArray(jwks.keys), 'JWKS keys must be an array');
  assert.strictEqual(jwks.keys[0].alg, 'RS256');
  assert.strictEqual(jwks.keys[0].kty, 'RSA');
});

test('LTI 1.3 Claim Validation', () => {
  const jwt = require('../backend/node_modules/jsonwebtoken');
  const { verifyLTIClaims } = require('../backend/lti/service');
  const mockToken = jwt.sign(
    {
      sub: 'student-123',
      email: 'student@custech.edu',
      'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
    },
    'secret'
  );
  const claims = verifyLTIClaims(mockToken);
  assert.strictEqual(claims.sub, 'student-123');
  assert.strictEqual(claims.email, 'student@custech.edu');
});

// 2. Test Storage & Queue Fallback Module
test('Storage & Queue resilience module load', () => {
  const storageQueue = require('../backend/shared/storageQueue');
  assert.ok(typeof storageQueue.uploadEvidence === 'function');
  assert.ok(typeof storageQueue.publishQueueEvent === 'function');
});

// 3. Test Threat Process Filtering
test('Cheat process detection list integrity', () => {
  const { CHEAT_PROCESSES } = require('../electron-app/src/main/systemMonitor.js');
  assert.ok(CHEAT_PROCESSES.includes('chatgpt'), 'ChatGPT should be blacklisted');
  assert.ok(CHEAT_PROCESSES.includes('claude'), 'Claude should be blacklisted');
  assert.ok(CHEAT_PROCESSES.includes('obs'), 'OBS should be blacklisted');
  assert.ok(CHEAT_PROCESSES.includes('vnc'), 'VNC should be blacklisted');
});

// 4. Test Keyboard Blocker Configuration
test('Keyboard shortcut blocker configuration', () => {
  const keyboardBlocker = require('../electron-app/src/main/keyboardBlocker.js');
  assert.ok(typeof keyboardBlocker.registerKeyboardBlockers === 'function');
  assert.ok(typeof keyboardBlocker.unregisterKeyboardBlockers === 'function');
});

console.log('\n----------------------------------------------------');
console.log(`  Suite Summary: ${pass} PASSED, ${fail} FAILED`);
console.log('----------------------------------------------------');

if (fail > 0) process.exit(1);
