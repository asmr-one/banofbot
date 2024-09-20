/**
 * @module models/user
 * @license MIT
 */

/** Dependencies */
const mongoose = require('mongoose')

/** Schema */
const Schema = mongoose.Schema
const userSchema = new Schema(
  {
    id: {
      type: Number,
      required: true,
    },
    first_name: String,
    last_name: String,
    username: String,
  },
  { timestamps: true, usePushEach: true }
)

userSchema.methods.name = function (user) {
  if (!user) { user = this }

  if (user.username) {
    return `@${user.username}`
  }
  else if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`
  }
  else if (user.first_name) {
    return user.first_name
  }
  else {
    return `UserID: ${user.id}`
  }

}

userSchema.methods.realNameWithHTML = function(bot, chatId) {
  return bot.getChatMember(chatId, this.id).then(res => {
    const user = res.user
    const name = this.name(user)
    return `<a href="tg://user?id=${user.id}">${name.replace('<', '').replace('>', '')}</a>`
  })
}

/** Exports */
module.exports = mongoose.model('user', userSchema)
