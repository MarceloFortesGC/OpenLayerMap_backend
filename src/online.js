const {createServer} = require ("http");
const {WebSocket, WebSocketServer} = require ("ws");

// Local Server
const server = createServer();
const wss = new WebSocketServer({server});
const sqlite3 = require('sqlite3');
const db = sqlite3.verbose().Database;
const dbPath = new db("./src/database/online.db");


wss.on('connection', (ws) => {
    console.log('Client connected to online');

    ws.on('message', async (message) => {
        var data = JSON.parse(message.toString());
        console.log(data);

        if(data.mensagem == null || data.mensagem == undefined){
            data.mensagem = "";
        }
        
        const sql = `INSERT INTO onlineStorage (id, latitude, longitude, mensagem, savedInLocal, savedInOnline) VALUES (?,?,?,?,?,?)`;
        const result = await new Promise((resolve, reject) => {
            dbPath.run(sql, [data.id, data.latitude, data.longitude, data.mensagem, true, true], (err) => {
                if (err) {
                    console.log("Erro ao inserir no banco de dados online");
                    reject(err);
                } else {
                    console.log("Registro inserido com sucesso no banco de dados online");
                    resolve(data.id);
                }
            });
        })

        ws.send(JSON.stringify({type: "online", id: result}));

    });
});

server.once('listening', async () => {
    await new Promise((resolve, reject) => {
        dbPath.exec(`CREATE TABLE IF NOT EXISTS onlineStorage(
            id VARCHAR PRIMARY KEY,
            latitude VARCHAR NOT NULL,
            longitude VARCHAR NOT NULL,
            mensagem VARCHAR(512),
            savedInLocal BOOLEAN NOT NULL,
            savedInOnline BOOLEAN NOT NULL
        )`, (err) => {
            if (err) {
                console.log("Erro ao criar tabela online");
                reject(err);
            } else {
                console.log("Tabela criada com sucesso no banco de dados online!");
                resolve();
            }
        });

    });
    console.log('Server started');
});

server.listen(7070);