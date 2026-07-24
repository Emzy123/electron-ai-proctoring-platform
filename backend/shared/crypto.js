const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const sha256 = (data) =>
  crypto.createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');

const keysPath = path.join(__dirname, '..', 'config', 'manifest_keys.json');
let privateKey = process.env.MANIFEST_PRIVATE_KEY;
let publicKey = process.env.MANIFEST_PUBLIC_KEY;

if (!privateKey || !publicKey) {
  try {
    if (fs.existsSync(keysPath)) {
      const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
      privateKey = keys.privateKey;
      publicKey = keys.publicKey;
    } else {
      const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      privateKey = priv;
      publicKey = pub;
      fs.mkdirSync(path.dirname(keysPath), { recursive: true });
      fs.writeFileSync(keysPath, JSON.stringify({ publicKey: pub, privateKey: priv }), 'utf8');
    }
  } catch (e) {
    console.error('Failed to load/generate manifest keys:', e);
  }
}

const signManifest = (manifest) => {
  try {
    if (!privateKey) throw new Error('No private key available');
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(manifest));
    return sign.sign(privateKey, 'base64');
  } catch (e) {
    console.error('Error signing manifest:', e.message);
    return sha256(JSON.stringify(manifest));
  }
};

const verifyManifestSignature = (manifest, signature) => {
  try {
    if (!publicKey) {
      const expected = sha256(JSON.stringify(manifest));
      return signature === expected;
    }
    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(manifest));
    return verify.verify(publicKey, signature, 'base64');
  } catch {
    return false;
  }
};

const computeHashChain = (answers, salt, seed = 'custech-seed') => {
  let prevHash = seed;
  const chain = [];
  for (const answer of answers) {
    const payload = `${answer.questionId}:${answer.selectedOption}:${prevHash}:${salt}`;
    const hash = sha256(payload);
    chain.push({ questionId: answer.questionId, hash, timestamp: new Date() });
    prevHash = hash;
  }
  return { chain, finalHash: prevHash };
};

const verifyHashChain = (answers, salt, chain, finalHash) => {
  const computed = computeHashChain(answers, salt);
  if (computed.finalHash !== finalHash) return false;
  if (chain.length !== computed.chain.length) return false;
  return chain.every((entry, i) => entry.hash === computed.chain[i].hash);
};

const signPayload = (payload, secret) => {
  const hmac = crypto.createHmac('sha256', secret || process.env.FRAME_SIGNING_SECRET || 'custech-default');
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

const verifyPayloadSignature = (payload, signature) => {
  if (!signature) return false;
  const expected = signPayload(payload);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

const generateSessionSalt = () => crypto.randomBytes(32).toString('hex');

module.exports = {
  sha256,
  verifyManifestSignature,
  signManifest,
  computeHashChain,
  verifyHashChain,
  signPayload,
  verifyPayloadSignature,
  generateSessionSalt,
};
