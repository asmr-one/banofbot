/**
 * Main app logic
 *
 * @module app
 * @license MIT
 */

/** Dependencies */
const path = require('path')
require('dotenv').config({
  path: path.join(__dirname, '/.env'),
})
const mongoose = require('mongoose')
const bot = require('./helpers/bot')
const config = require('./config')
const db = require('./helpers/db')
const language = require('./helpers/language')
const help = require('./helpers/help')
const lock = require('./helpers/lock')
const requests = require('./helpers/requests')
const admins = require('./helpers/admins')
const limit = require('./helpers/limit')
const time = require('./helpers/time')
const votekickWord = require('./helpers/votekickWord')

global.Promise = require('bluebird')

global.Promise.config({ cancellation: true })

/** Setup mongoose */
mongoose.Promise = require('bluebird')

mongoose.connect(config.database, {
  socketTimeoutMS: 0,
  connectTimeoutMS: 0,
  useUnifiedTopology: true,
  useNewUrlParser: true,
})
mongoose.connection.on('disconnected', () => {
  mongoose.connect(config.database, {
    socketTimeoutMS: 0,
    connectTimeoutMS: 0,
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
})
mongoose.set('useCreateIndex', true)
mongoose.set('useFindAndModify', false)

bot.on('message', (msg) => {
  handle(msg)
})

/**
 * Used to handle incoming message
 * @param {Telegram:Message} msg Message received
 */
function handle(msg) {
  // 如果消息为空，直接返回
  if (!msg) {
    return;
  }

  db.logChatMessage(msg)
      .then(() => {
        // console.log('log message success', msg.message_id, msg.chat.id, msg.from.id, msg.text);
        console.log('log message success', {
          chat_id: msg.chat.id,
          user_id: msg.from.id,
          message_id: msg.message_id,
          text: msg.text,
        });
      })
      .catch(err => console.error(err));

  // 检查需要清理的 message
  db.clearExpiredMessage()
      .then(({deletedCount}) => {
        console.log(`Cleared ${deletedCount} expired messages`);
      })
      .catch(err => console.error(err));

  // 如果消息包含 '@' 且不包含 'vote_to_kick_chn_bot'，则返回，不处理该消息
  if (msg.text && msg.text.includes('@') && !msg.text.includes('vote_to_kick_chn_bot')) {
    return;
  }

  // 判断消息是否为私聊或频道类型
  const isPrivateChat = msg.chat.type === 'private' || msg.chat.type === 'channel';

  // 判断消息是否为命令（即 / 开头的指令）
  const isCommand =
      msg.text &&
      msg.entities &&
      msg.entities[0] &&
      msg.entities[0].type === 'bot_command';

  // 判断是否为新用户进入或群聊创建事件
  const isEntry =
      (msg.new_chat_participant &&
          msg.new_chat_participant.username &&
          msg.new_chat_participant.username === 'vote_to_kick_chn_bot') ||
      msg.group_chat_created;

  // 在数据库中查找当前聊天记录
  db.findChat(msg.chat)
      .then((chat) => {
        // 判断是否是回复消息且包含特定关键字
        let isReply =
            msg.reply_to_message &&
            msg.text &&
            (msg.text.includes('vote_to_kick_chn_bot') ||
                msg.text.includes('@ban') ||
                msg.text.includes('voteban') ||
                msg.text.includes('Voteban') ||
                msg.text.includes('/spam') ||
                (chat.votekickWord &&
                    chat.votekickWord.split(', ').reduce((p, c) => {
                      return (
                          p ||
                          new RegExp(`(?<=[\\s,.:;"']|^)${c}(?=[\\s,.:;"']|$)`, 'gum').test(msg.text)
                      );
                    }, false)));

        // 如果消息为指定的贴纸（file_id 匹配），则视为回复
        if (
            msg.reply_to_message &&
            msg.sticker &&
            msg.sticker.file_id === 'CAADAQADyQIAAgdEiQTkPSm3CRyNIQI'
        ) {
          isReply = true;
        }

        // 处理命令
        if (isCommand) {
          // 如果是私聊或者聊天未被管理员锁定，则处理以下命令
          if (isPrivateChat || !chat.admin_locked) {
            if (msg.text.includes('start')) {
              language.sendLanguage(bot, chat, false);
            } else if (msg.text.includes('help')) {
              help.sendHelp(bot, chat);
            } else if (msg.text.includes('language')) {
              language.sendLanguage(bot, chat, true);
            } else if (msg.text.includes('limit')) {
              if (!isPrivateChat) {
                limit.sendLimit(bot, chat, msg.text);
              }
            } else if (msg.text.includes('time')) {
              if (!isPrivateChat) {
                time.sendTime(bot, chat);
              }
            } else if (msg.text.includes('lock')) {
              if (!isPrivateChat) {
                lock.toggle(bot, chat);
              }
            } else if (msg.text.includes('filterNewcomers')) {
              if (!isPrivateChat) {
                bot.sendMessage(chat.id, 'Please, use @shieldy_bot instead.');
              }
            } else if (msg.text.includes('/banme')) {
              if (!isPrivateChat) {
                bot.banChatMember(msg.chat.id, msg.from.id, {
                  until_date: Math.floor(Date.now() / 1000) + 60,
                });
              }
            } else if (msg.text.includes('/votekickWord')) {
              if (!isPrivateChat) {
                votekickWord.check(bot, chat, msg.text);
              }
            }
          } else {
            // 如果聊天被管理员锁定，则只有管理员能执行命令
            admins
                .isAdmin(bot, chat.id, msg.from.id)
                .then((isAdmin) => {
                  if (!isAdmin) return deleteMessage(msg.chat.id, msg.message_id); // 非管理员消息删除

                  // 处理管理员命令
                  if (msg.text.includes('start')) {
                    language.sendLanguage(bot, chat, false);
                  } else if (msg.text.includes('help')) {
                    help.sendHelp(bot, chat);
                  } else if (msg.text.includes('language')) {
                    language.sendLanguage(bot, chat, true);
                  } else if (msg.text.includes('limit')) {
                    if (!isPrivateChat) {
                      limit.sendLimit(bot, chat, msg.text);
                    }
                  } else if (msg.text.includes('time')) {
                    if (!isPrivateChat) {
                      time.sendTime(bot, chat);
                    }
                  } else if (msg.text.includes('lock')) {
                    lock.toggle(bot, chat);
                  } else if (msg.text.includes('filterNewcomers')) {
                    bot.sendMessage(chat.id, 'Please, use @shieldy_bot instead.');
                  } else if (msg.text.includes('/banme')) {
                    bot.banChatMember(msg.chat.id, msg.from.id, {
                      until_date: Math.floor(Date.now() / 1000) + 60,
                    });
                  } else if (msg.text.includes('/votekickWord')) {
                    votekickWord.check(bot, chat, msg.text);
                  }
                })
                .catch(/** todo: handle error */); // 处理错误（未实现）
          }
        } else if (isEntry) {
          // 如果是新用户进入事件，发送语言选择
          language.sendLanguage(bot, chat, false);
        } else if (isReply) {
          // 如果是投票踢人请求，启动请求处理
          try {
            requests.startRequest(bot, msg);
          } catch (err) {
            console.error(err);
            // 忽略错误
          }
        }
      })
      .catch(/** todo: handle error */); // 处理数据库查找错误（未实现）
}

bot.on('callback_query', (msg) => {
  const options = msg.data.split('~')
  const inline = options[0]
  if (inline === 'li') {
    language.setLanguage(bot, msg)
  } else if (inline === 'vi') {
    try {
      requests.voteQuery(bot, msg)
    } catch (err) {
      // Do nothing
    }
  } else if (inline === 'lti') {
    limit.setLimit(bot, msg)
  } else if (inline === 'tlti') {
    time.setTime(bot, msg)
  }
})

console.info('Bot is up and running')

function getUsername(member) {
  return `${
    member.user.username
      ? `@${member.user.username}`
      : `${member.user.first_name}${
          member.user.last_name ? ` ${member.user.last_name}` : ''
        }`
  }`
}

function deleteMessage(c, m) {
  try {
    bot.deleteMessage(c, m)
  } catch (err) {
    // Do nothing
  }
}
