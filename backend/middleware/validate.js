const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({ body: req.body, params: req.params, query: req.query });
    next();
  } catch (err) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.errors?.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }
};

const schemas = {
  login: z.object({
    body: z.object({
      identifier: z.string().min(1),
      password: z.string().min(1),
    }),
  }),
  register: z.object({
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      matricNo: z.string().min(1),
      password: z.string().min(6),
      faceDescriptor: z.array(z.number()).length(128),
      faceImage: z.string().optional(),
    }),
  }),
  saveAnswer: z.object({
    body: z.object({
      questionId: z.string(),
      selectedOption: z.number().int().min(0).max(3),
      encryptedPayload: z.string().optional(),
    }),
  }),
  verifyManifest: z.object({
    body: z.object({
      manifest: z.object({}).passthrough(),
      signature: z.string(),
      sessionId: z.string().optional(),
    }),
  }),
  submitHashChain: z.object({
    body: z.object({
      sessionId: z.string(),
      hashChain: z.array(z.object({
        questionId: z.string(),
        hash: z.string(),
        timestamp: z.string().optional(),
      })),
      finalHash: z.string(),
    }),
  }),
  evidenceFrame: z.object({
    body: z.object({
      sessionId: z.string(),
      frame: z.string(),
      timestamp: z.string(),
      signature: z.string().optional(),
      nonce: z.string().optional(),
    }),
  }),
};

module.exports = { validate, schemas };
