import mongoose from 'mongoose';

const homeSliderSchema = new mongoose.Schema({
  _id: { type: String, default: 'homepage' },
  movieIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false });

export default mongoose.model('HomeSlider', homeSliderSchema);
