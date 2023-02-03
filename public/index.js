const ws = new WebSocket('ws://localhost:3000');

const board = document.querySelector('.board');
const paddle_1 = document.querySelector('.paddle_1');
const paddle_2 = document.querySelector('.paddle_2');
const initial_ball = document.querySelector('.ball');
const ball = document.querySelector('.ball');
const message = document.querySelector('.message');
const score_1 = document.querySelector('.player_1_score');
const score_2 = document.querySelector('.player_2_score');
const btn_create = document.getElementById('btn_create');
const btn_join = document.getElementById('btn_join');

let board_coord = board.getBoundingClientRect();
let paddle_1_coord = paddle_1.getBoundingClientRect();
let paddle_2_coord = paddle_2.getBoundingClientRect();
let paddle_common = document.querySelector('.paddle').getBoundingClientRect();
let initial_ball_coord = initial_ball.getBoundingClientRect();
let ball_coord = initial_ball_coord;

let clientId = null;
let gameId = null;
let gameState = null;
let players = [];
let homePlayer = null;

let dx = Math.floor(Math.random() * 4) + 3;
let dy = Math.floor(Math.random() * 4) + 3;
let dxd = Math.floor(Math.random() * 2);
let dyd = Math.floor(Math.random() * 2);

btn_create.addEventListener('click', e => {

    const pay_load = {
        "method": "create",
        "clientId": clientId
    }

    ws.send(JSON.stringify(pay_load));
});

btn_join.addEventListener('click', () => {
    
    const pay_load = {
        "method": "join",
        "clientId": clientId
    }

    ws.send(JSON.stringify(pay_load));
});

document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {

        if (players.length === 0) {
            console.error("No game started or joined");
            return;
        }


        const pay_load = {
            method: "begin",
            clientId,
            clientStatus: "start",
            gameId
        }

        ws.send(JSON.stringify(pay_load));
    }

    if (gameState === 'play') {
        let paddle = homePlayer.paddle;
        if (e.key === 'w') {
            if (paddle === "paddle_1") {
                paddle_1.style.top = Math.max(
                    board_coord.top,
                    paddle_1_coord.top - 100 * 0.12
                ) + 'px';
                paddle_1_coord = paddle_1.getBoundingClientRect();
            } else {
                paddle_2.style.top = Math.max(
                    board_coord.top,
                    paddle_2_coord.top - 100 * 0.12
                ) + 'px';
                paddle_2_coord = paddle_2.getBoundingClientRect();
            }
            const pay_load = {
                "method": "play",
                "type": "paddle",
                "clientId": clientId,
                "gameId": gameId,
                paddle_style_top: (paddle === "paddle_1") ? paddle_1.style.top : paddle_2.style.top
            };
            ws.send(JSON.stringify(pay_load));
        }
        else if (e.key === 's') {
            if (paddle === "paddle_1") {
                paddle_1.style.top = Math.min(
                    board_coord.bottom - paddle_common.height,
                    paddle_1_coord.top + 100 * 0.12
                ) + 'px';
                paddle_1_coord = paddle_1.getBoundingClientRect();
            } else {
                paddle_2.style.top = Math.min(
                    board_coord.bottom - paddle_common.height,
                    paddle_2_coord.top + 100 * 0.12
                ) + 'px';
                paddle_2_coord = paddle_2.getBoundingClientRect();
            }
            const pay_load = {
                "method": "play",
                "type": "paddle",
                "clientId": clientId,
                "gameId": gameId,
                paddle_style_top: (paddle === "paddle_1") ? paddle_1.style.top : paddle_2.style.top
            };
            ws.send(JSON.stringify(pay_load));
        }
    }
});

function startBall() {

    if (gameState === 'play') {
        requestAnimationFrame(() => {
            dx = Math.floor(Math.random() * 4) + 3;
            dy = Math.floor(Math.random() * 4) + 3;
            dxd = Math.floor(Math.random() * 2);
            dyd = Math.floor(Math.random() * 2);
            moveBall(dx, dy, dxd, dyd);
        });
    }
}

function moveBall(dx, dy, dxd, dyd) {

    if (ball_coord.top <= board_coord.top)
        dyd = 1;

    if (ball_coord.bottom >= board_coord.bottom)
        dyd = 0;

    if (
        ball_coord.left <= paddle_1_coord.right &&
        ball_coord.top >= paddle_1_coord.top &&
        ball_coord.bottom <= paddle_1_coord.bottom
    ) {
        dxd = 1;
        dx = Math.floor(Math.random() * 4) + 3;
        dy = Math.floor(Math.random()* 4) + 3;
    }

    if (
        ball_coord.right >= paddle_2_coord.left &&
        ball_coord.top >= paddle_2_coord.top &&
        ball_coord.bottom <= paddle_2_coord.bottom
    ) {
        dxd = 0;
        dx = Math.floor(Math.random() * 4) + 3;
        dy = Math.floor(Math.random()* 4) + 3;
    }

    if (
        ball_coord.left <= board_coord.left ||
        ball_coord.right >= board_coord.right
    ) {

        if (ball_coord.left <= board_coord.left)
            score_2.textContent = Number(score_2.textContent) + 1;
        else
            score_1.textContent = Number(score_1.textContent) + 1;

        gameState = 'start';

        ball_coord = initial_ball_coord;
        ball.style = initial_ball.style;
        message.textContent = 'Press Enter to continue';
        message.style.left = 238 + 'px';
        const pay_load = {
            method: "play",
            type: "ball",
            clientId: clientId,
            gameId: gameId,
            score: {
                score_1: score_1.textContent,
                score_2: score_2.textContent,
            },
            ball_style: {
                ball_style_top: ball.style.top,
                ball_style_left: ball.style.left
            }
        }

        ws.send(JSON.stringify(pay_load));
        return;
    }

    ball.style.top = ball_coord.top + dy * (dyd === 0 ? -1 : 1) + 'px';
    ball.style.left = ball_coord.left + dx * (dxd === 0 ? -1 : 1) + 'px';
    ball_coord = ball.getBoundingClientRect();

    const pay_load = {
        method: "play",
        type: "ball",
        clientId: clientId,
        gameId: gameId,
        ball_style: {
            ball_style_top: ball.style.top,
            ball_style_left: ball.style.left
        }
    }

    ws.send(JSON.stringify(pay_load));

    requestAnimationFrame(() => {
        if (homePlayer.paddle === "paddle_1")
            moveBall(dx, dy, dxd, dyd);
    });

}

ws.onmessage = function(event) {
    const response = JSON.parse(event.data);

    switch(response.method) {
        case 'connect':
            clientId = response.clientId;
            break;
        case 'create':
            gameId = response.game.gameId;
            gameState = response.game.state; 
            break;
        case 'join':
            if (gameId === null)
                gameId = response.game.gameId;
            gameState = response.game.state; 
            response.game.clients.forEach(client => {
                players.push(client);
            });
            message.textContent = 'Press Enter to continue';
            //message.style.left = 238 + 'px';
            break;
        case 'begin':
            gameState = response.game.state; 
            players = [];
            response.game.clients.forEach(client => {
                players.push(client);
            });
            [ homePlayer ] = players.filter(client => client.clientId === clientId);
            message.textContent = 'Game Started';
            if (homePlayer.paddle === "paddle_1")
                startBall();
            break;
        case 'play':
            if (response.type === "paddle") {
                const [player] = players.filter(client => client.clientId === response.clientId);
                if (player.paddle === "paddle_1") {
                    paddle_1.style.top = response.paddle_style_top;
                    paddle_1_coord = paddle_1.getBoundingClientRect();
                } else {
                    paddle_2.style.top = response.paddle_style_top;
                    paddle_2_coord = paddle_2.getBoundingClientRect();
                }
            } else {
                ball.style.top = response.ball_style.ball_style_top;
                ball.style.left = response.ball_style.ball_style_left;
                ball_coord = ball.getBoundingClientRect();
                const score = response?.score;
                if (score && Object.keys(score).length) {
                    score_1.textContent = score.score_1;
                    score_2.textContent = score.score_2;
                }
            }
            break;
        case 'error':
            console.error(response);
            break;
        default:
            console.error("Can't identify method");
    }
};
