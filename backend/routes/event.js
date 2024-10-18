import express from 'express';
import FamilyGroup from '../models/FamilyGroup.js';
import Event from '../models/Event.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { body, validationResult } from 'express-validator'; // Validation library

const router = express.Router();

// Middleware for validating event creation
const validateEventCreation = [
    body('unique_code').notEmpty().withMessage('Unique code is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
];


// Fetch all events
router.get('/', verifyToken, async (req, res) => {
    try {
        const events = await Event.find({});
        res.status(200).json({ events });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Fetch Events by Family Group ID with optional pagination
router.get('/family-group/:familyGroupId', verifyToken, async (req, res) => {
    const { familyGroupId } = req.params;
    const user_id = req.user.id;
    const { page = 1, limit = 10 } = req.query; // Pagination params

    try {
        const familyGroup = await FamilyGroup.findById(familyGroupId);
        if (!familyGroup) {
            return res.status(404).json({ message: 'Family group not found' });
        }

        const isMember = familyGroup.members.some(member => member.user_id.toString() === user_id);
        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this family group' });
        }

        const events = await Event.find({ family_group_id: familyGroup._id })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const totalEvents = await Event.countDocuments({ family_group_id: familyGroup._id });

        res.status(200).json({
            events,
            totalPages: Math.ceil(totalEvents / limit),
            currentPage: Number(page),
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create Event Route with validation and logging
router.post('/create', verifyToken, validateEventCreation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { unique_code, title, description, date } = req.body;
    const user_id = req.user.id;
    const full_name = req.user.full_name;

    console.log('Incoming POST request to create event with body:', req.body);

    try {
        const familyGroup = await FamilyGroup.findOne({ unique_code });

        if (!familyGroup) {
            console.log('Family group not found');
            return res.status(404).json({ message: 'Family group not found' });
        }

        const isMember = familyGroup.members.some(member => member.user_id.toString() === user_id);
        if (!isMember) {
            console.log('User is not a member of the family group');
            return res.status(403).json({ message: 'You are not a member of this family group' });
        }

        const newEvent = new Event({
            family_group_id: familyGroup._id,
            user_id,
            title,
            description,
            date,
            interested: familyGroup.members.map(member => ({
                user_id: member.user_id,
                isInterested: false
            })),
            createdAt: new Date(), // Added timestamp
        });

        await newEvent.save();
        console.log('Event created successfully:', newEvent);

        familyGroup.events.push({
            event_id: newEvent._id,
            user_id: user_id,
            title,
        });

        await familyGroup.save();

        res.status(201).json({
            message: 'Event created successfully',
            event: newEvent,
            full_name,
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update Event Route
router.put('/edit/:eventId', verifyToken, async (req, res) => {
    const { title, description, date } = req.body;
    const user_id = req.user.id;
    const { eventId } = req.params;

    try {
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.user_id.toString() !== user_id) {
            return res.status(403).json({ message: 'You are not authorized to edit this event' });
        }

        event.title = title || event.title;
        event.description = description || event.description;
        event.date = date || event.date;

        await event.save();

        res.status(200).json({ message: 'Event updated successfully', event });
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete Event Route
router.delete('/delete/:eventId', verifyToken, async (req, res) => {
    const user_id = req.user.id;
    const { eventId } = req.params;

    try {
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.user_id.toString() !== user_id) {
            return res.status(403).json({ message: 'You are not authorized to delete this event' });
        }

        const familyGroup = await FamilyGroup.findById(event.family_group_id);
        if (!familyGroup) {
            return res.status(404).json({ message: 'Family group not found' });
        }

        familyGroup.events = familyGroup.events.filter(evt => evt.event_id.toString() !== eventId);

        await familyGroup.save();
        await event.remove();

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
