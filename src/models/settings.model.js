const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    siteLogo: {
      type: String,
      trim: true,
      default: "/logo.png",
    },
    siteAddress: {
      type: String,
      trim: true,
      default: "دمشق، سوريا",
    },
    siteWorkingHours: {
      type: String,
      trim: true,
      default: "24/7",
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
