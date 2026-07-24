const express = require('express');
const router = express.Router();
const { getLTIJWKS, verifyLTIClaims, postGradeToLMS } = require('./service');

// LTI 1.3 tool launch endpoint
router.post('/launch', (req, res) => {
  const { id_token } = req.body;
  try {
    const claims = verifyLTIClaims(id_token);
    res.json({
      message: 'LTI 1.3 launch successful',
      user: claims.sub,
      email: claims.email,
      name: claims.name,
      context: claims.context,
      agsEndpoint: claims.agsEndpoint,
      redirect: '/student',
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// JWKS Public Key Set endpoint for LMS registration
router.get('/jwks', (_req, res) => {
  res.json(getLTIJWKS());
});

// LTI Assignment & Grade Services (AGS) grade passback route
router.post('/grades', async (req, res) => {
  const { lineItemUrl, studentSub, scoreGiven, scoreMaximum, comment } = req.body;
  try {
    const result = await postGradeToLMS({
      lineItemUrl,
      studentSub,
      scoreGiven,
      scoreMaximum,
      comment,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
