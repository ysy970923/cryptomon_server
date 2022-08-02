var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;
const util = require('util');

var port = 3000;
var wss = new WebSocketServer({ port: port });
console.log(`server on http://localhost:${port}`);

//0 ~ 9: binary; 10 ~: JSON string
const NumToType = {
    0: 'id',
    1: 'update-user-list',
    2: 'move-user',

    10: 'battle-offer',
    11: 'battle-answer',
    12: 'attack',
    13: 'request-user-info',
    14: 'response-user-info',
    15: 'leave-battle',
}

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
    console.log(ws);
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
            var buffer = new ArrayBuffer(5)
            var dataview = new DataView(buffer)
            dataview.setInt8(0, TypeToNum['leave-battle'])
            dataview.setInt16(1, ws.id)
            dataview.setInt16(3, client.id)
            client.send(buffer)
        })
    })


    ws.on('message', (data) => {
        var buf = new Uint8Array(data).buffer;
        var dv = new DataView(buf);

        const typeNum = dv.getInt8(0);

        if (typeNum >= 10) {
            const to = dv.getInt16(3);
            id2ws[to].send(buf);
        }
        else {
            wss.clients.forEach((client) => {
                if (client !== ws)
                    client.send(buf);
            });
        }
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