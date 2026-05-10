function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    const details = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return res.status(400).json({ error: `Validation error: ${details}` });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
