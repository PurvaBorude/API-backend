const cron = require('node-cron');
const axios = require('axios');
const Monitor = require('../models/Monitor');
const Log = require('../models/Log');

cron.schedule('* * * * *', async () => {
  try {
    const now = Date.now();
    const monitors = await Monitor.find({ isActive: true });

    for (const monitor of monitors) {
      const lastChecked = monitor.lastChecked?.getTime() || 0;
      const intervalMs = monitor.checkInterval * 60 * 1000;

      if (now - lastChecked < intervalMs) continue; // ⏱️ Not time yet

      const start = Date.now();
      let status = 'up';
      let statusCode = 0;
      let error = null;

      try {
        const res = await axios.get(monitor.url, {
          timeout: 5000,
          validateStatus: () => true, // 👈 Don't throw for non-2xx
        });

        statusCode = res.status;

        if (res.status === 403) {
          status = 'blocked';
          error = '403 Forbidden – Site may be blocking bots or automated checks.';
        } else if (res.status >= 200 && res.status < 400) {
          status = 'up';
        } else {
          status = 'down';
          error = `Received HTTP ${res.status}`;
        }

      } catch (err) {
        status = 'down';
        error = err.message || 'Request failed';
        statusCode = err.response?.status || 0;
      }

      const responseTime = Date.now() - start;

      await Log.create({
        monitorId: monitor._id,
        status,
        statusCode,
        responseTime,
        error,
        timestamp: new Date(),
      });

      monitor.lastChecked = new Date();
      await monitor.save();

      console.log(`${monitor.url} → ${status.toUpperCase()} (${statusCode}) in ${responseTime}ms`);
      if (error) console.warn(`   ⚠️ ${error}`);
    }

    console.log(`✅ Ping job finished at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error('❌ Cron job error:', err.message);
  }
});