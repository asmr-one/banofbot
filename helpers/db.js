/**
 * @module db
 * @license MIT
 */

/** Get schemas **/
const {
  Chat,
  User,
  Request,
  Message
} = require('../models');


/**
 * Function to get chat, creates if none exists yet
 * @param {Telegram:Chat} chat Chat object that was passed from Telegram
 * @return {Promise(Mongoose:Chat)} Chat that was created by mongoose
 */
function findChat(chat) {
  return Chat.findOne({ id: chat.id })
    .then((dbchat) => {
      if (dbchat) {
        return dbchat;
      }
      return new Chat(chat).save();
    });
}

function findChatsWithNewcomers() {
  return Chat.find({ 'newcomers.0': { '$exists': true } });
}

/**
 * Function to get user, creates if none exists yet
 * @param {Telegram:User} user User object that was passed from Telegram
 * @return {Promise(Mongoose:User)} User that was created by mongoose
 */
function findUser(user) {
  return User.findOne({ id: user.id })
    .then((dbuser) => {
      if (dbuser) {
        return dbuser;
      }
      return new User(user).save();
    });
}

/**
 * Function to get request from db
 * @param {Mongoose:ObjectId} id Id of the request
 * @return {Promise(Mongoose:Request)} Found request
 */
function findRequest(id) {
  return Request.findById(id);
}

/**
 * Function to create a request
 * @param {Mongoose:Request} request Request object without _id
 * @return {Promise(Mongoose:Request)} Created request
 */
function createRequest(request) {
  const req = new Request(request);
  return req.save();
}

function logChatMessage(msg) {
  return Message.create({
    chat_id: msg.chat.id,
    user_id: msg.from.id,
    message_id: msg.message_id
  });
}

function findChatMessages(chatId, userId) {
  // return message_id list only
  return Message.find({ chat_id: chatId, user_id: userId }).select('message_id');
}

function clearExpiredMessage() {
  // 48 hrs
  return Message.deleteMany({ updatedAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } });
}


/** Exports */
module.exports = {
  findChat,
  findUser,
  findRequest,
  createRequest,
  findChatsWithNewcomers,
  logChatMessage,
  findChatMessages,
  clearExpiredMessage
};
