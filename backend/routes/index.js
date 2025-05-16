const userRoutes = require('./userRoutes');
const programRoutes = require('./programRoutes');
const challengeRoutes = require('./challengeRoutes');

const setupExpressRoutes = (app) => {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API routes
  app.use('/api/user', userRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/challenges', challengeRoutes);

  // Handle 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
  });
};

module.exports = { setupExpressRoutes };
