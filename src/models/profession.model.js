const mongoose = require('mongoose');

const professionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    specializations: [{
      type: String,
      trim: true,
    }],
    icon: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Profession = mongoose.model('Profession', professionSchema);

module.exports = Profession;
