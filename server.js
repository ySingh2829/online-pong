const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = {};
const games = {};

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

wss.on('connection', (ws) => {
    ws.on('error', console.error);

    ws.on('close', () => {
        let disconnect_client;

        for (let client in clients) {
            if (clients[client].connection === ws) {
                disconnect_client = clients[client];
                delete clients[client];
                break;
            }
        }

    });

    ws.on('message', (data) => { 

        const response = JSON.parse(data);
        let clientId; 
        let gameId; 
        let pay_load;
        let ws_client;
        switch (response.method) {
            case 'create':
                clientId = response.clientId;
                gameId = guid();
                games[gameId] =  {
                    gameId,
                    state: "created",
                    "clients": [{ clientId, score: 0, status: "waiting", paddle: "paddle_1" }]
                };

                pay_load = {
                    "method": "create",
                    "game": games[gameId]
                }


                ws_client = clients[clientId]["connection"];
                if (ws_client.ready_state === WebSocket.OPEN)
                    ws_client.send(JSON.stringify(pay_load));
                break;
            case 'join':
                clientId = response.clientId;
                let gameRoomAvailable = false;
                for (let game in games) {

                    if (games[game].clients.length <= 2) {
                        gameRoomAvailable = true;
                        games[game].state = "ready";
                        games[game].clients.push({ clientId, score: 0, status: "waiting", paddle: "paddle_2" });
                        pay_load = {
                            method: "join",
                            "game": games[game]
                        }
                        
                        // tell all players that a new player has joined
                        games[game].clients.forEach( ({ clientId }) => {
                            clients[clientId]["connection"].send(JSON.stringify(pay_load));
                        });
                        break;
                    }
                }
            
                // No game room is available
                if (!gameRoomAvailable)
                    clients[clientId].connection.send(JSON.stringify({ method: "error", type: "no room available"}));
                gameRoomAvailable = false;
                break;
            case 'begin':
                clientId = response.clientId;
                gameId = response.gameId;

                    const clientStatus = response.clientStatus;

                    // change client status and attach paddle positions
                    for (let client of games[gameId].clients)
                        if (client.clientId === clientId)
                            client.status = clientStatus;


                    // check wether all players have start status
                    for (let client of games[gameId].clients)
                        if (client.status !== "start")
                            return;

                    // players are ready to play
                    games[gameId].state = "play";

                    pay_load = {
                        method: "begin",
                        game: games[gameId]
                    }

                games[gameId].clients.forEach( ({ clientId }) => {
                    clients[clientId]["connection"].send(JSON.stringify(pay_load));
                });
                break;
            case 'play':
                clientId = response.clientId;
                gameId = response.gameId;
                if (response.type === "paddle") {

                    pay_load = {
                        method: "play",
                        type: "paddle",
                        clientId: response.clientId,
                        gameId: response.gameId,
                        paddle_style_top: response.paddle_style_top
                    }
                } else {
                    pay_load = response;
                }

                // Only broadcast to player excluding self
                games[gameId].clients.forEach( client => {
                    if (clientId !== client.clientId) 
                        clients[client.clientId]["connection"].send(JSON.stringify(pay_load));
                });

                break;
            default:
                clientId = response.clientId;
                clients[clientId].connection.send(JSON.stringify({ method: "error", type: "bad request"}));
        }
    });

    // generate a new clientId
    const clientId = guid();
    clients[clientId] =  { "connection": ws };

    const pay_load = {
        "method": "connect",
        "clientId": clientId
    }

    ws.send(JSON.stringify(pay_load));

});

server.listen(3000, () => console.log('server listening on port 3000'));


function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substring(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
