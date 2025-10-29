import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'seller', 'buyer'], default: 'buyer' },
  xp: { type: Number, default: 0 },
  badges: { type: [String], default: [] },
  avatar: { type: String, default: '' },
  monerooConnected: { type: Boolean, default: false },
  phone: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
