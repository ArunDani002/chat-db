const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🔥 Store mappings
const users = {};         // socket.id → username
const userSocketMap = {}; // username → socket.id

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ JOIN
  socket.on("join", (username) => {
    // 🚫 prevent duplicate usernames
    if (userSocketMap[username]) {
      socket.emit("error_message", "Username already taken");
      return;
    }

    users[socket.id] = username;
    userSocketMap[username] = socket.id;

    console.log(username + " joined");

    // ✅ send updated user list
    io.emit("users_list", Object.keys(userSocketMap));
  });

  // ✅ PRIVATE MESSAGE
  socket.on("private_message", ({ to, message }) => {
    const fromUser = users[socket.id];
    const targetSocketId = userSocketMap[to];

    if (!fromUser) return;

    if (targetSocketId) {
      io.to(targetSocketId).emit("receive_private_message", {
        message,
        from: fromUser,
      });
    }
  });

  // ✅ TYPING INDICATOR
  socket.on("typing", ({ to }) => {
    const fromUser = users[socket.id];
    const targetSocketId = userSocketMap[to];

    if (targetSocketId && fromUser) {
      io.to(targetSocketId).emit("user_typing", {
        from: fromUser,
      });
    }
  });

  // ✅ DISCONNECT
  socket.on("disconnect", () => {
    const username = users[socket.id];

    console.log("User disconnected:", username);

    if (username) {
      delete users[socket.id];
      delete userSocketMap[username];

      // update users list
      io.emit("users_list", Object.keys(userSocketMap));
    }
  });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});