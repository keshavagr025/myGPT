dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fetch from 'node-fetch'; // or use axios if you prefer
import dotenv from 'dotenv';
import { Message } from './models/Message.js'; // Adjust the path as needed
import mongoose from 'mongoose';


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // or your frontend origin for better security
    methods: ['GET', 'POST'],
  },
});

async function generateAIReply(message) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // free model
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Sorry, I did not understand that.';

  } catch (err) {
    console.error('Error calling OpenRouter:', err);
    return 'Oops! Failed to get a reply.';
  }
}


io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('user_message', async (userMessage) => {
  const aiReply = await generateAIReply(userMessage);
  await Message.create({
    user: socket.id,
    prompt: userMessage,
    aiReply,
  });

  socket.emit('bot reply', aiReply);
});


  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
