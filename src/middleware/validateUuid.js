const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuidParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !UUID_REGEX.test(value)) {
      return res.status(400).json({ error: `Invalid parameter format: ${paramName} must be a valid UUID` });
    }
    next();
  };
}

export function validateUuidBody(fieldName) {
  return (req, res, next) => {
    const value = req.body[fieldName];
    if (!value || !UUID_REGEX.test(value)) {
      return res.status(400).json({ error: `Invalid request body format: ${fieldName} must be a valid UUID` });
    }
    next();
  };
}
