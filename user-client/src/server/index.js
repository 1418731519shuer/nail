const { createAppServer, ensureStorageDirs, port } = require("./handlers.js");

const server = createAppServer();

server.listen(port, () => {
  ensureStorageDirs();
  console.log(`Nail try-on prototype: http://localhost:${port}`);
});
