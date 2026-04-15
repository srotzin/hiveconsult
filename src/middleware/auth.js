import { v4 as uuidv4 } from 'uuid';

const HIVECONSULT_INTERNAL_KEY = 'hive_internal_125e04e071e8829be631ea0216dd4a0c9b707975fcecaf8c62c6a2ab43327d46';

// ─── DID Extraction ──────────────────────────────────────────

function extractDID(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer did:hive:')) {
    return authHeader.replace('Bearer ', '');
  }
  if (req.headers['x-hivetrust-did']?.startsWith('did:hive:')) {
    return req.headers['x-hivetrust-did'];
  }
  // Also accept DID in request body
  if (req.body?.did?.startsWith('did:hive:')) {
    return req.body.did;
  }
  return null;
}

function isValidDID(did) {
  if (process.env.ALLOW_TEST_DIDS === 'true' && did.startsWith('did:hive:test_agent_')) return true;
  return /^did:hive:[a-zA-Z0-9_-]{3,}$/.test(did);
}

// ─── Middleware ───────────────────────────────────────────────

export function requireDID(req, res, next) {
  // Internal key bypass
  const internalKey = req.headers['x-hive-internal'];
  if (internalKey === HIVECONSULT_INTERNAL_KEY) {
    req.agentDid = extractDID(req) || 'did:hive:internal';
    req.isInternal = true;
    return next();
  }

  const did = extractDID(req);
  if (did && isValidDID(did)) {
    req.agentDid = did;
    req.isInternal = false;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Valid DID required. Provide a did:hive: identifier via Authorization header, X-HiveTrust-DID header, or request body.'
  });
}

export { HIVECONSULT_INTERNAL_KEY };
