const jwt = require('jsonwebtoken');

// Sample JWKS public key generator for LTI 1.3 LMS registration
const getLTIJWKS = () => {
  return {
    keys: [
      {
        kty: 'RSA',
        alg: 'RS256',
        use: 'sig',
        kid: 'custech-lti-key-1',
        n: 'u1G8...sample-public-modulus...',
        e: 'AQAB',
      },
    ],
  };
};

const verifyLTIClaims = (idToken) => {
  if (!idToken) throw new Error('Missing LTI id_token');
  const decoded = jwt.decode(idToken);
  if (!decoded) throw new Error('Invalid LTI id_token format');

  const ltiVersion = decoded['https://purl.imsglobal.org/spec/lti/claim/version'];
  const messageType = decoded['https://purl.imsglobal.org/spec/lti/claim/message_type'];

  if (ltiVersion !== '1.3.0') {
    throw new Error(`Unsupported LTI version: ${ltiVersion}`);
  }

  return {
    sub: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    context: decoded['https://purl.imsglobal.org/spec/lti/claim/context'],
    resourceLink: decoded['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
    agsEndpoint: decoded['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'],
    messageType,
  };
};

// Post score back to Canvas/Moodle/Blackboard via LTI 1.3 Assignment & Grade Services (AGS)
const postGradeToLMS = async ({ lineItemUrl, studentSub, scoreGiven, scoreMaximum = 100, comment = '' }) => {
  if (!lineItemUrl) {
    return { success: false, message: 'No LTI AGS lineitem endpoint provided' };
  }

  const payload = {
    timestamp: new Date().toISOString(),
    scoreGiven,
    scoreMaximum,
    comment: comment || 'CUSTECH Examination System Grade',
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded',
    userId: studentSub,
  };

  // In production, this would issue an OAuth2 request to lineItemUrl with an LMS access token
  console.log(`[LTI AGS Grade Passback] Sending grade to ${lineItemUrl}:`, payload);
  return { success: true, payload };
};

module.exports = {
  getLTIJWKS,
  verifyLTIClaims,
  postGradeToLMS,
};
