const Settings = require('../models/settings.model');

// Get site settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if they don't exist
      settings = new Settings({
        siteName: 'JobScope',
        description: 'Your job platform.',
        contactEmail: 'contact@jobscope.com',
        contactPhone: '+1234567890',
      });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Update site settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const { siteName, description, contactEmail, contactPhone } = req.body;

    settings.siteName = siteName || settings.siteName;
    settings.description = description || settings.description;
    settings.contactEmail = contactEmail || settings.contactEmail;
    settings.contactPhone = contactPhone || settings.contactPhone;

    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};