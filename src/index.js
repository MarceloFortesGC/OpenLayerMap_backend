const {createServer} = require ("http");
const {WebSocket, WebSocketServer} = require ("ws");

// Local Server
const server = createServer();
const wss = new WebSocketServer({server});
const sqlite3 = require('sqlite3');
const db = sqlite3.verbose().Database;
const dbPath = new db("./src/database/local.db");


wss.on('connection', (ws) => {
    console.log('Client connected');

    const sql = `SELECT * FROM localStorage`;
    dbPath.all(sql, (err, rows) => {
        if (err) {
            console.log("Erro ao buscar registros no banco de dados local");
        } else {
            console.log("Registros buscados com sucesso no banco de dados local");
            ws.send(JSON.stringify({type: "infoLocal", data: rows}));
        }
    }
    );
    
    ws.on('message', async (message) => {
        var data = JSON.parse(message.toString());

        if(data.mensagem == null || data.mensagem == undefined){
            data.mensagem = "";
        }
        
        const sql = `INSERT INTO localStorage (id, latitude, longitude, mensagem, savedInLocal, savedInOnline) VALUES (?,?,?,?,?,?)`;
        const result = await new Promise((resolve, reject) => {
            dbPath.run(sql, [data.id, data.latitude, data.longitude, data.mensagem, true, false], (err) => {
                if (err) {
                    console.log("Erro ao inserir no banco de dados");
                    reject(err);
                } else {
                    console.log("Registro inserido com sucesso");
                    resolve(data.id);
                }
            });
        })

        ws.send(JSON.stringify({type: "local", id: result}));

        const online = new WebSocket('ws://127.0.0.1:7070');
        online.on('open', function () {
            this.send(message.toString());
        });

        online.on('message', function (data) {

            var {id} = JSON.parse(data.toString());

            const sql = `UPDATE localStorage SET savedInOnline = ? WHERE id = ?`;
            dbPath.run(sql, [true, id], (err) => {
                if (err) {
                    console.log("Erro ao atualizar registro no banco de dados online");
                } else {
                    console.log("Registro atualizado com sucesso no banco de dados online");
                }
            });

            ws.send(data.toString());
        });
    });
});

server.once('listening', async () => {
    await new Promise((resolve, reject) => {
        dbPath.exec(`CREATE TABLE IF NOT EXISTS localStorage(
            id VARCHAR PRIMARY KEY,
            latitude VARCHAR NOT NULL,
            longitude VARCHAR NOT NULL,
            mensagem VARCHAR(512),
            savedInLocal BOOLEAN NOT NULL,
            savedInOnline BOOLEAN NOT NULL
        )`, (err) => {
            if (err) {
                console.log("Erro ao criar tabela");
                reject(err);
            } else {
                console.log("Tabela criada com sucesso!");
                resolve();
            }
        });

    });
    console.log('Server started');
});



server.listen(6969);