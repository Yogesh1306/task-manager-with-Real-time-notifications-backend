import mongoose, { Schema } from 'mongoose';

const boardSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['member'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

boardSchema.index({ admin: 1 });
boardSchema.index({ 'members.user': 1 });

export const Board = mongoose.model('Board', boardSchema);
