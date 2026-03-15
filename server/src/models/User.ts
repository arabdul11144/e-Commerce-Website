import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSavedAddress {
  _id?: mongoose.Types.ObjectId;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
}

export interface IUser extends Document {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password?: string;
  role: 'user' | 'admin';
  avatar?: string;
  status: 'active' | 'blocked';
  savedAddresses: IUserSavedAddress[];
  createdAt: Date;
  updatedAt: Date;
}

const SavedAddressSchema: Schema = new Schema(
  {
    fullName: { type: String, default: '' },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  { _id: true }
);

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatar: { type: String, default: '' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    savedAddresses: { type: [SavedAddressSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);