import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import familyGroupRoutes from './routes/familyGroup.js'; // Import family group routes
import FamilyGroup from './models/FamilyGroup.js'; // Fixed the import path

// Chat app additional from marvin
import http from 'http';
import { Server } from 'socket.io';

// chat app end

// Load environment variables
dotenv.config();

const app = express();

// Chat app additional from marvin
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // You might want to restrict this in production
        methods: ['GET', 'POST'],
    },
});

//chat app end

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1); 
    }
};

// Connect to the database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/family-group', familyGroupRoutes); // Use family group routes

// Chat app additional from marvin

// Handle socket connections Chat app start
io.on('connection', async (socket) => {
    console.log('New client connected');

    // Listen for requests to load messages of a specific family group
    socket.on('loadMessages', async (familyGroupId) => {
        try {
            // Fetch the family group by ID
            const familyGroup = await FamilyGroup.findById(familyGroupId).select('mensahe').lean();

            // If the family group exists, send the messages
            if (familyGroup) {
                socket.emit('previousMessages', familyGroup.mensahe);
            } else {
                socket.emit('error', 'Family group not found');
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            socket.emit('error', 'Error fetching messages');
        }
    });

    // Listen for incoming messages
    socket.on('sendMessage', async (data) => {
        const { familyGroupId, msname, message, ava } = data;

        try {
            // Add the new message to the family's mensahe array
            const updatedFamilyGroup = await FamilyGroup.findByIdAndUpdate(
                familyGroupId,
                {
                    $push: {
                        mensahe: {
                            msname,
                            message,
                            ava,
                        },
                    },
                },
                { new: true }
            );

            // If the family group is found and updated, broadcast the new message
            if (updatedFamilyGroup) {
                const newMessage = updatedFamilyGroup.mensahe[updatedFamilyGroup.mensahe.length - 1]; // Get the last message
                io.emit('newMessage', newMessage);
            } else {
                socket.emit('error', 'Family group not found');
            }
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', 'Error saving message'); 
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

//chat app end


// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
