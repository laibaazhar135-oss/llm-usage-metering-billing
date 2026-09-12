// Professional error handling: respect a status code the error itself set,
// otherwise default to 500. Never leak stack traces to the client.
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(err.details ? { details: err.details } : {})
  });
}

module.exports = errorHandler;