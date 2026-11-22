import mongoose from 'mongoose';

const MovieReviewSchema = new mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });
MovieReviewSchema.index({ movie: 1, user: 1 }, { unique: true });
export default mongoose.models.MovieReview || mongoose.model('MovieReview', MovieReviewSchema);
