import mongoose, { Schema } from 'mongoose';

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    dueDate: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    boardId:{
      type: Schema.Types.ObjectId,
      ref: 'Board', 
      default: null
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
    attachments: [
      {
        url: String,
        public_id: String,
        bytes: Number,
        format: {
          type: String,
          enum: ['jpg', 'png', 'pdf'],
        },
      },
    ],
  },
  { timestamps: true },
);

taskSchema.index({ createdBy: 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1, createdAt: -1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ boardId: 1, createdAt: -1 });

export const Task = mongoose.model('Task', taskSchema);
