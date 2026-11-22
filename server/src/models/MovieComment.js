import mongoose from 'mongoose';

const MovieCommentSchema = new mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'MovieComment', default: null },
  body: { type: String, required: true, trim: true, minlength: 2, maxlength: 1200 },
}, { timestamps: true });
MovieCommentSchema.index({ movie: 1, createdAt: -1 });
export default mongoose.models.MovieComment || mongoose.model('MovieComment', MovieCommentSchema);
