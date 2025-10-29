import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  images: { type: [String], default: [] },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  createdAt: { type: Date, default: Date.now }
});

// Virtual for average rating (example)
ProductSchema.virtual('_avgRating').get(function () {
  if (!this.reviews || this.reviews.length === 0) return 0;
  // This relies on population that sets review objects with rating
  const sum = this.reviews.reduce((s, r) => s + (r.rating || 0), 0);
  return Math.round((sum / this.reviews.length) * 10) / 10;
});

export default mongoose.model('Product', ProductSchema);
