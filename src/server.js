const path = require('path');
const express = require('express');
require('./db/db');

const dashboardRoutes = require('./routes/dashboard');
const taskRoutes = require('./routes/tasks');
const completionRoutes = require('./routes/completions');
const attachmentRoutes = require('./routes/attachments');
const equipmentRoutes = require('./routes/equipment');
const tagRoutes = require('./routes/tags');
const historyRoutes = require('./routes/history');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', completionRoutes);
app.use('/api', attachmentRoutes);
app.use('/api', equipmentRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/history', historyRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Kalle Kotiapuri käynnissä portissa ${PORT}`);
});
