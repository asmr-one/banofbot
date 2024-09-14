// Dependencies
const mongoose = require('mongoose')

// Schema
const Schema = mongoose.Schema
const messageSchema = new Schema(
  {
    chat_id: {
      type: Number,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    message_id: {
      type: Number,
      required: true,
    }
  },
  { timestamps: true, usePushEach: true }
)

messageSchema.index({ chat_id: 1, user_id: 1 })
messageSchema.index({ updatedAt: 1 })

// Exports
module.exports = mongoose.model('message', messageSchema)
