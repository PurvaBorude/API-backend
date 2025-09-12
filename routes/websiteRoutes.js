const express = require('express');
const router = express.Router();
const {
  addWebsite,
  getWebsites,
  deleteWebsite,
  updateWebsite,
  getLogsForMonitor,
  getWebsiteById 
} = require('../controllers/WebsiteController');

const authenticate = require('../middleware/auth');

router.post('/', authenticate, addWebsite);
router.get('/', authenticate, getWebsites);
router.put('/:id', authenticate, updateWebsite);
router.delete('/:id', authenticate, deleteWebsite);
router.get('/:id/logs', authenticate, getLogsForMonitor);
//router.get('/:id', authenticate, getSingleMonitor); 

router.get('/:id', authenticate, getWebsiteById);

module.exports = router;
