console.log('DONATION ROUTES FILE LOADED');

const express = require('express');
const router = express.Router();
const Donation = require('../models/donation');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new donation (donor only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Please log in again.' });
    }
    if (user.role !== 'donor') {
      return res.status(403).json({ message: 'Only registered donors can create food donations.' });
    }

    const { title, description, quantity, expiryDate, pickupAddress, contactInfo } = req.body;
    if (!title || !quantity) {
      return res.status(400).json({ message: 'Title and quantity are required.' });
    }
    const donation = await Donation.create({
      title,
      description,
      quantity,
      expiryDate,
      pickupAddress,
      contactInfo,
      donor: req.user.userId,
    });
    return res.status(201).json({ message: 'Donation created.', donation });
  } catch (err) {
    console.error('Create donation error:', err.message);
    return res.status(500).json({ message: 'Unable to create donation.' });
  }
});

// Get donations visible to volunteers (available and claimed, but not completed)
router.get('/volunteer', authMiddleware, async (req, res) => {
  console.log('Volunteer route hit, user:', req.user);
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Please log in again.' });
    }
    if (user.role !== 'volunteer') {
      return res.status(403).json({ message: 'Only volunteer accounts can view volunteer deliveries.' });
    }
    // Return donations that are either available or already claimed (by any NGO)
    const donations = await Donation.find({ status: { $in: ['available', 'claimed'] } })
      .populate('donor', 'name email contactInfo')
      .sort({ createdAt: -1 });
    return res.status(200).json({ donations });
  } catch (err) {
    console.error('Fetch volunteer deliveries error:', err.message);
    return res.status(500).json({ message: 'Unable to fetch volunteer deliveries.' });
  }
});

router.get('/available', authMiddleware, async (req, res) => {
  try {
    const donations = await Donation.find({ status: 'available' })
      .populate('donor', 'name email contactInfo')
      .sort({ createdAt: -1 });
    return res.status(200).json({ donations });
  } catch (err) {
    console.error('Fetch available donations error:', err.message);
    return res.status(500).json({ message: 'Unable to fetch available donations.' });
  }
});

// Get claimed donations for the logged-in NGO
router.get('/claimed', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Please log in again.' });
    }
    if (user.role !== 'ngo') {
      return res.status(403).json({ message: 'Only registered NGO accounts can view claimed donations.' });
    }

    const donations = await Donation.find({ claimedBy: req.user.userId })
      .populate('donor', 'name email contactInfo')
      .sort({ updatedAt: -1 });
    return res.status(200).json({ donations });
  } catch (err) {
    console.error('Fetch claimed donations error:', err.message);
    return res.status(500).json({ message: 'Unable to fetch claimed donations.' });
  }
});

// Claim a donation (NGO only)
router.post('/:id/claim', authMiddleware, async (req, res) => {
  try {
    // 1. Verify user role: only NGO accounts can claim
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Please log in again.' });
    }
    if (user.role !== 'ngo') {
      return res.status(403).json({ message: 'Only registered NGO accounts can claim food donations.' });
    }

    // 2. Find donation and verify existence
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    // 3. Prevent donor from claiming their own donation
    if (donation.donor && donation.donor.toString() === req.user.userId.toString()) {
      return res.status(400).json({ message: 'Donors cannot claim their own donations.' });
    }

    // 4. Prevent multiple NGOs from claiming the same donation
    if (donation.status !== 'available' || donation.claimedBy) {
      return res.status(409).json({ message: 'This donation has already been claimed.' });
    }

    // 5. Safe atomic update
    const updatedDonation = await Donation.findOneAndUpdate(
      { _id: req.params.id, status: 'available', claimedBy: null },
      { $set: { status: 'claimed', claimedBy: req.user.userId } },
      { returnDocument: 'after' }
    ).populate('donor', 'name email contactInfo');

    if (!updatedDonation) {
      return res.status(409).json({ message: 'This donation was just claimed by another NGO.' });
    }

    return res.status(200).json({
      message: 'Donation claimed successfully!',
      donation: updatedDonation,
    });
  } catch (err) {
    console.error('Claim donation error:', err.message);
    return res.status(500).json({ message: 'Unable to claim donation.' });
  }
});

// Get donations (handles donor own donations, or query filters)
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.query.status === 'available') {
      const donations = await Donation.find({ status: 'available' })
        .populate('donor', 'name email contactInfo')
        .sort({ createdAt: -1 });
      return res.status(200).json({ donations });
    }

    if (req.query.claimed === 'true') {
      const donations = await Donation.find({ claimedBy: req.user.userId })
        .populate('donor', 'name email contactInfo')
        .sort({ updatedAt: -1 });
      return res.status(200).json({ donations });
    }

    // Default: fetch donations belonging to the logged-in donor
    const donations = await Donation.find({ donor: req.user.userId }).sort({ createdAt: -1 });
    return res.status(200).json({ donations });
  } catch (err) {
    console.error('Fetch donor donations error:', err.message);
    return res.status(500).json({ message: 'Unable to fetch donations.' });
  }
});

// Update a donor's own donation (permitted only while available)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, donor: req.user.userId });
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }
    if (donation.status !== 'available') {
      return res.status(400).json({ message: 'Only available donations can be updated.' });
    }

    // Only allow updating safe fields; status cannot be altered directly via PUT
    const allowedFields = ['title', 'description', 'quantity', 'expiryDate', 'pickupAddress', 'contactInfo'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        donation[field] = req.body[field];
      }
    }
    await donation.save();
    return res.status(200).json({ message: 'Donation updated.', donation });
  } catch (err) {
    console.error('Update donation error:', err.message);
    return res.status(500).json({ message: 'Unable to update donation.' });
  }
});

// Delete a donor's own donation (permitted only while available)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, donor: req.user.userId });
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }
    if (donation.status !== 'available') {
      return res.status(400).json({ message: 'Cannot delete a donation that has already been claimed or completed.' });
    }

    await Donation.deleteOne({ _id: req.params.id });
    return res.status(200).json({ message: 'Donation deleted.' });
  } catch (err) {
    console.error('Delete donation error:', err.message);
    return res.status(500).json({ message: 'Unable to delete donation.' });
  }
});

module.exports = router;
