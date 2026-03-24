import express from 'express';
import { getAllUsers, createUser, updateUser, deleteUser } from '../services/userService.js';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// All user routes are protected and require Admin role
router.use(authenticateToken);
router.use(authorizeAdmin);

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new user (worker)
router.post('/', async (req, res) => {
  try {
    const { name, phoneNumber, email, password, role, permissions } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (!phoneNumber && !email) {
      return res.status(400).json({ error: 'Either email or phone number is required' });
    }
    
    const user = await createUser({ name, phoneNumber, email, password, role, permissions });
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, email, role, permissions, password } = req.body;
    
    const user = await updateUser(id, { name, phoneNumber, email, role, permissions, password });
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (parseInt(id) === req.user.userId) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }
    
    await deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
