const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  globalThis.__shitanIo = io;

  io.on("connection", (socket) => {
    socket.on("campus:join", (campusId) => {
      if (typeof campusId === "string" && campusId.length > 0) {
        socket.join(`campus:${campusId}`);
      }
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`真探 running at http://localhost:${port}`);
  });
});
