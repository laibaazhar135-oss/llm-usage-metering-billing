require('dotenv').config();
const express = require('express');
const usageRoutes = require('./routes/usageRoutes');
const billingRoutes = require('./routes/billingRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const errorHandler = require('./middleware/errorHandler');
const { startReconciliationJob } = require('./jobs/reconciliationJob');

const app = express();
const port = process.env.PORT || 3000;

// CRITICAL ORDER: webhook route must be registered BEFORE express.json().
// If express.json() ran first, it would consume/parse the body, and the webhook
// route's raw-body parser would receive an already-parsed object instead of raw bytes —
// silently breaking signature verification.
app.use(webhookRoutes);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ name: 'LLM Usage Metering & Billing Service', version: '1.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(usageRoutes);
app.use(billingRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  startReconciliationJob(60000); // every 60s — real system would use hours, this is for demo visibility
});