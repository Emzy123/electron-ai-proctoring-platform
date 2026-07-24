const express = require('express');
const router = express.Router();

// SAML/OAuth SSO stub — integrate passport-saml in production deployment
router.get('/saml/metadata', (_req, res) => {
  res.type('application/xml').send(`<?xml version="1.0"?>
<EntityDescriptor entityID="${process.env.SAML_ENTITY_ID || 'custech-exam'}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"/>
</EntityDescriptor>`);
});

router.post('/saml/callback', (req, res) => {
  res.status(501).json({ message: 'Configure SAML IdP credentials (SAML_ENTRY_POINT, SAML_CERT) to enable SSO' });
});

router.get('/oauth/callback', (req, res) => {
  res.status(501).json({ message: 'Configure OAuth provider (OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET) to enable SSO' });
});

module.exports = router;
