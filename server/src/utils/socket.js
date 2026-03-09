let _io = null;

function setupSocket(io) {
  _io = io;

  io.on('connection', (socket) => {
    socket.on('join-inventory', (inventoryId) => {
      socket.join(`inventory:${inventoryId}`);
    });

    socket.on('leave-inventory', (inventoryId) => {
      socket.leave(`inventory:${inventoryId}`);
    });
  });
}

function emitToInventory(inventoryId, event, data) {
  if (_io) {
    _io.to(`inventory:${inventoryId}`).emit(event, data);
  }
}

module.exports = { setupSocket, emitToInventory };