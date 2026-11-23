// backend/src/models/user.js
const mongoose = require('mongoose');
const argon2 = require('argon2');

const UserSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, select: false },
  refreshTokenHash: { type: String, select: false },
  tokenVersion: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Virtual setter for plain password
UserSchema.virtual('password').set(function (pwd) {
  this._plainPassword = pwd;
});

UserSchema.pre('validate', async function () {
  if (this._plainPassword) {
    this.passwordHash = await argon2.hash(this._plainPassword, { type: argon2.argon2id });
    delete this._plainPassword;
  }
});

UserSchema.methods.verifyPassword = async function (pwd) {
  return await argon2.verify(this.passwordHash, pwd);
};

module.exports = mongoose.model('User', UserSchema);
