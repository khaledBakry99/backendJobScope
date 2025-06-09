const Settings = require("../models/settings.model");

// Get site settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if they don't exist
      settings = new Settings({
        siteName: "JobScope", // سيتم تحديثه من إعدادات الأدمن
        description: "منصة للربط بين طالبي الخدمة والحرفيين",
        contactEmail: "info@jobscope.com",
        contactPhone: "+963 912 345 678",
        siteLogo: "/logo.png",
        siteAddress: "دمشق، سوريا",
        siteWorkingHours: "24/7",
      });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update site settings
exports.updateSettings = async (req, res) => {
  try {
    const {
      siteName,
      description,
      contactEmail,
      contactPhone,
      siteLogo,
      siteAddress,
      siteWorkingHours,
    } = req.body;

    // Create an object with only the fields we want to update
    const updateData = {};
    if (siteName !== undefined) updateData.siteName = siteName;
    if (description !== undefined) updateData.description = description;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (siteLogo !== undefined) updateData.siteLogo = siteLogo;
    if (siteAddress !== undefined) updateData.siteAddress = siteAddress;
    if (siteWorkingHours !== undefined)
      updateData.siteWorkingHours = siteWorkingHours;

    // Use findOneAndUpdate to find the single settings document and update it
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: updateData },
      {
        new: true, // Return the updated document
        runValidators: true, // Run schema validators
      }
    );

    if (!settings) {
      // This case should ideally not be hit if settings are seeded correctly
      return res.status(404).json({ message: "Settings not found" });
    }

    res.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};
