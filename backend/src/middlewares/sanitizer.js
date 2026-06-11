const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim().replace(/<[^>]*>/g, '');
      }
    }
  }
  next();
};

module.exports = { sanitizeInput };
