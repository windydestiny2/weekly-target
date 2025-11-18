// backend/controllers/learningLogController.js
const model = require('../models/learningLogModel');

/**
 * Handler untuk membuat log belajar baru
 */
const createLog = async (req, res) => {
  const { user_id, log_date, notes } = req.body;

  if (!user_id || !log_date) {
    return res.status(400).json({ success: false, message: 'user_id and log_date required' });
  }

  try {
    const created = await model.create({ user_id, log_date, notes });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to create log' });
  }
};

/**
 * Handler untuk mengambil log belajar mingguan
 */
const getWeeklyLogs = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id required' });
  }

  try {
    // Tentukan rentang tanggal (7 hari terakhir)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // 7 hari total (termasuk hari ini)

    // Format ke YYYY-MM-DD
    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    const items = await model.findByUserAndDateRange(user_id, startDateStr, endDateStr);
    return res.status(200).json({
      success: true,
      range: { start: startDateStr, end: endDateStr },
      data: items
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to get logs' });
  }
};

module.exports = {
  createLog,
  getWeeklyLogs,
};
