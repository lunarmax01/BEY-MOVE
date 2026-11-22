import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  publicId: { type: String, required: true, unique: true, immutable: true },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'], default: 'USER' },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  dateOfBirth: { type: Date, default: null },
  premiumUntil: { type: Date, default: null },
  avatar: { type: String, default: '' },
  lastProfileEditAt: { type: Date, default: null },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
