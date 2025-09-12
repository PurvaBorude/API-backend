const Monitor = require('../models/Monitor');
const Log = require('../models/Log');
const mongoose = require('mongoose');

//1. Add new website
exports.addWebsite = async (req, res) => {
  try {
    const { url, name, checkInterval } = req.body;

    const website = await Monitor.create({
      url,
      name,
      checkInterval,
      userId: req.user._id
    });

    res.status(201).json({ message: 'Website added', website });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Website already added' });
    }
    res.status(500).json({ error: err.message });
  }
};

//2. Get all websites with stats
exports.getWebsites = async (req, res) => {
  try {
    const monitors = await Monitor.find({ userId: req.user._id });

    const websitesWithStats = await Promise.all(
      monitors.map(async (monitor) => {
        const logs = await Log.find({ monitorId: monitor._id })
          .sort({ checkedAt: -1 })
          .limit(100);

        const upCount = logs.filter(log => log.status === 'up').length;
        const total = logs.length || 1;

        const uptimePercentage = ((upCount / total) * 100).toFixed(2);

        return {
          ...monitor.toObject(),
          uptimePercentage,
          lastStatus: logs[0]?.status || 'unknown',
          lastResponseTime: logs[0]?.responseTime || null
        };
      })
    );

    res.json({ websites: websitesWithStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//3. Update website
exports.updateWebsite = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, name, checkInterval, isActive } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid monitor ID' });
    }

    // Build update object safely
    const updateData = { url, name, checkInterval };
    if (typeof isActive !== 'undefined') updateData.isActive = isActive;

    const updated = await Monitor.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Monitor not found or unauthorized' });
    }

    res.json({ message: 'Website updated', monitor: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


//4. Delete website
exports.deleteWebsite = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Monitor.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!deleted) {
      return res.status(404).json({ message: 'Monitor not found or unauthorized' });
    }

    res.json({ message: 'Website deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//5. Get logs for a monitor
exports.getLogsForMonitor = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify monitor belongs to user
    const monitor = await Monitor.findOne({ _id: id, userId: req.user._id });
    if (!monitor) {
      return res.status(404).json({ message: 'Monitor not found or unauthorized' });
    }

    const logs = await Log.find({ monitorId: id })
      .sort({ checkedAt: -1 })
      .limit(100);

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//6. Get single website by ID
exports.getWebsiteById = async (req, res) => {
  try {
    const website = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!website) {
      return res.status(404).json({ message: 'Monitor not found or unauthorized' });
    }

    res.json({ website });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

