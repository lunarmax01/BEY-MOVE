import mongoose from 'mongoose';

const BlockSchema = new mongoose.Schema({
  blockId: { type: String, required: true },
  type: { type: String, required: true, enum: ['text','section','banner','image','button','movieGrid','divider','spacer'] },
  title: { type: String, default: '', maxlength: 150 },
  content: { type: String, default: '', maxlength: 3000 },
  imageUrl: { type: String, default: '', maxlength: 600 },
  buttonLabel: { type: String, default: '', maxlength: 80 },
  buttonUrl: { type: String, default: '', maxlength: 300 },
  background: { type: String, default: '#141414' },
  align: { type: String, enum: ['left','center','right'], default: 'left' },
  hidden: { type: Boolean, default: false },
  movieIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
}, { _id: false });

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 70 },
  slug: { type: String, required: true, unique: true, immutable: true, maxlength: 64 },
  description: { type: String, default: '', maxlength: 500 },
  published: { type: Boolean, default: true },
  navVisible: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  builtIn: { type: Boolean, default: false },
  background: { type: String, default: '#070707' },
  blocks: { type: [BlockSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('Category', CategorySchema);
