import mongoose from 'mongoose';

const EpisodeSchema = new mongoose.Schema({
  season: { type: Number, required: true, min: 1, max: 100 },
  number: { type: Number, required: true, min: 1, max: 999 },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, default: '', maxlength: 2000 },
  duration: { type: Number, default: null, min: 1, max: 1440 },
  videoPath: { type: String, required: true, select: false },
  published: { type: Boolean, default: false },
}, { timestamps: true });

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  category: { type: String, enum: ['kino', 'serial', 'anime', 'multfilm', 'kattalar'], required: true },
  genre: { type: String, default: '' },
  year: Number,
  duration: Number,
  poster: { type: String, default: '' },
  banner: { type: String, default: '' },
  videoPath: { type: String, default: '' },
  episodes: { type: [EpisodeSchema], default: [] },
  premium: { type: Boolean, default: false },
  ageRestricted: { type: Boolean, default: false },
  published: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export default mongoose.model('Movie', MovieSchema);
