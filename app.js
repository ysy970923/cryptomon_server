var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;
const util = require('util');

var port = 8080;
var wss = new WebSocketServer({ port: port });
console.log(`server on http://localhost:${port}`);

//0 ~ 9: binary; 10 ~: JSON string
const NumToType = {
    0: "id",
    1: "update-user-list",
    2: "move-user",

    10: "video-offer",
    11: "video-answer",
    12: "new-ice-candidate",
    13: "hange-up",
};

const reverseMapping = o => Object.keys(o).reduce((r, k) =>
    Object.assign(r, { [o[k]]: (r[o[k]] || []).concat(k) }), {})

const TypeToNum = reverseMapping(NumToType)

function sendMsgToClient(type, client, msg) {
    const typeNum = TypeToNum[type];

    const buffer1 = new ArrayBuffer(1);
    const dataview = new DataView(buffer1);
    dataview.setInt8(0, typeNum);

    const msgJSON = JSON.stringify(msg);
    const encoder = new util.TextEncoder();
    const buffer2 = encoder.encode(msgJSON).buffer;

    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), 1);
    client.send(tmp.buffer);
}

var counter = 0;

var id2ws = {};

wss.on('connection', (ws) => {
    ws.id = counter;
    counter++;

    id2ws[ws.id] = ws;

    const buffer = new ArrayBuffer(3);
    const dataview = new DataView(buffer);
    dataview.setInt8(0, TypeToNum["id"]);
    dataview.setInt16(1, ws.id);
    ws.send(buffer);

    wss.clients.forEach((client) => {
        sendMsgToClient("update-user-list", client, {
            "user-list": Object.keys(id2ws),
        })
    })

    ws.on('close', () => {
        delete id2ws[ws.id];
        wss.clients.forEach((client) => {
            sendMsgToClient("update-user-list", client, {
                "user-list": Object.keys(id2ws),
            })
        })
    })


    ws.on('message', (data) => {
        var buf = new Uint8Array(data).buffer;
        var dv = new DataView(buf);
        var msg = null;

        const type = NumToType[dv.getInt8(0)];
        wss.clients.forEach((client) => {
            if (client !== ws)
                client.send(buf);
        });
        // if (type == "move-user") {
        //     wss.clients.forEach((client) => {
        //         if (client !== ws)
        //             client.send(buf);
        //     });
        // }
        // else {
        //     wss.clients

        // }
        // if (msg.type == "username") {
        //     var nameChanged = false;
        //     var origName = msg.name;

        //     var appendToMakeUnique = 1;
        //     while (!isUsernameUnique(msg.name)) {
        //         msg.name = origName + appendToMakeUnique;
        //         appendToMakeUnique++;
        //         nameChanged = true;
        //     }
        //     usernames.add(msg.name);

        //     if (nameChanged) {
        //         var changeMsg = {
        //             id: msg.id,
        //             type: "rejectusername",
        //             name: msg.name
        //         };
        //         ws.send(JSON.stringify(changeMsg));
        //     }
        //     ws.username = msg.name;
        //     name2id[ws.username] = ws.id;
        //     sendUserListToAll();
        // }
        // else if (msg.type == "message") {
        //     msg.name = ws.username;
        //     msg.text = msg.text;
        // }
        // var msgString = JSON.stringify(msg);
        // if (msg.target && msg.target != undefined)
        //     sendToOneUser(msg.target, msgString);
        // else
        //     wss.clients.forEach((client) => { client.send(msgString); });
    });
});