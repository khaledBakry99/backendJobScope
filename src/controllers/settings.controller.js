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
    const updateData = req.body;

    // Use findOneAndUpdate to find the single settings document and update it
    // The filter is empty {} to match the first document found
    const settings = await Settings.findOneAndUpdate({}, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators
    });

    if (!settings) {
      // This case should ideally not be hit if settings are seeded correctly
      return res.status(404).json({ message: 'Settings not found' });
    }

    res.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: 'Server error' });
  }
};