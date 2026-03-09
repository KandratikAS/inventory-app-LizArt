// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};
