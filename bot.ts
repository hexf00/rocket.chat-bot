import * as process from "process";

//使用您的服务器和BOT帐户信息自定义以下内容
const HOST = '';
process.env.ROCKETCHAT_URL = `https://${HOST}`;
process.env.ROCKETCHAT_USE_SSL = 'true';
process.env.ROCKETCHAT_USER = '';
process.env.ROCKETCHAT_PASSWORD = '';

import { driver, api } from "@rocket.chat/sdk";

var myuserid;
// this simple bot does not handle errors, different message types, server resets 
// and other production situations 

const runbot = async () => {
  const conn = await driver.connect({
    host: HOST
  })
  myuserid = await driver.login();

  // set up subscriptions - rooms we are interested in listening to
  const subscribed = await driver.subscribeToMessages();
  console.log('subscribed');

  // connect the processMessages callback
  const msgloop = await driver.reactToMessages(processMessages);
  console.log('connected and waiting for messages');

  // 该API会提示  getRoomIdByNameOrId  Not allowed
  // 是官方故意限制了该API的使用，详细见GitHub issue
  // console.log("获取名称", await driver.getRoomId("hexf00"))
}

// callback for incoming messages filter and processing
const processMessages = async (err, message, messageOptions) => {
  if (!err) {

    // 过滤掉自己发出的信息
    if (message.u._id === myuserid) return;

    // 私聊roomname是undefined
    const roomname = await driver.getRoomName(message.rid);

    const username = message.u.username;
    const messageContent = message.msg;

    if (messageContent == '在线人数') {
      const names = await api.users.onlineNames()
      driver.sendToRoomId(`当前在线人数： ${names.length} ${names.join()}`, message.rid);
      return;
    } else if (messageContent.match(/^del\s*(.*?)$/)) {
      let deleteUsername = messageContent.match(/^del\s*(.*?)$/)[1]

      //获取发言人加入的所有私聊
      const rooms = await api.get('rooms.adminRooms', {
        count: 1000,
        offset: 0,
        types: ['d'],
        filter: username //发言人
      })

      const deleteRoom = Array.from(rooms.rooms).find(room => {
        //@ts-ignore
        const usernames: any[] = room.usernames
        if (
          usernames.indexOf(username) !== -1 &&
          usernames.indexOf(deleteUsername) !== -1
        ) {
          return true
        }
      })

      if (deleteRoom) {
        try {
          // @ts-ignore
          let result = await driver.callMethod("eraseRoom", deleteRoom._id);
          console.log(result);

        } catch (error) {
          console.log(error);

          await driver.sendToRoomId(`出错了`, message.rid);
        }
      } else {
        await driver.sendToRoomId(`没有这个私聊`, message.rid);
      }
    }

    // 对话API案例
    // if (roomname === undefined) {
    //   //私聊
    //   await driver.sendToRoomId(`你 说的是： ${messageContent}`, message.rid);
    // } else {
    //   //频道
    //   await driver.sendToRoom(`${username} 说的是： ${messageContent}`, roomname)
    // }

  }
}

runbot()