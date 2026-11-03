import Invitation from '../models/Invitation.js';
import Group from '../models/Group.js';
import User from '../models/User.js';

// @desc    Send an invitation to a registered user
// @route   POST /api/invitations
// @access  Private
export const sendInvitation = async (req, res, next) => {
  try {
    const { groupId, email } = req.body;

    if (!groupId || !email) {
      return res.status(400).json({ message: 'Group ID and recipient email are required' });
    }

    const emailNormalized = email.toLowerCase().trim();

    // 1. Verify group exists and inviter is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isInviterMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isInviterMember) {
      return res.status(403).json({ message: 'You must be a member of the group to invite others' });
    }

    // 2. Find recipient by email
    const recipient = await User.findOne({ email: emailNormalized });
    if (!recipient) {
      return res.status(404).json({ message: 'No registered user found with this email' });
    }

    // 3. Check if recipient is already a member
    const isAlreadyMember = group.members.some(
      (m) => m.toString() === recipient._id.toString()
    );
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    // 4. Check for duplicate pending invitation
    const existingPending = await Invitation.findOne({
      group: groupId,
      recipient: recipient._id,
      status: 'pending',
    });
    if (existingPending) {
      return res.status(400).json({ message: 'An invitation is already pending for this user' });
    }

    // 5. Create invitation
    const invitation = await Invitation.create({
      group: groupId,
      inviter: req.user._id,
      recipient: recipient._id,
      status: 'pending',
    });

    const populatedInvitation = await Invitation.findById(invitation._id)
      .populate('group', 'name description')
      .populate('inviter', 'name email')
      .populate('recipient', 'name email');

    res.status(201).json(populatedInvitation);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invitations received by the logged-in user
// @route   GET /api/invitations
// @access  Private
export const getMyInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.find({
      recipient: req.user._id,
      status: 'pending',
    })
      .populate('group', '_id name description members')
      .populate('inviter', '_id name email')
      .sort({ createdAt: -1 });

    res.status(200).json(invitations);
  } catch (error) {
    next(error);
  }
};

// @desc    Accept invitation
// @route   PUT /api/invitations/:id/accept
// @access  Private
export const acceptInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Verify recipient ownership
    if (invitation.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied: This invitation is not for you' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation has already been ${invitation.status}` });
    }

    // Add recipient to group members
    const group = await Group.findById(invitation.group);
    if (!group) {
      return res.status(404).json({ message: 'The group for this invitation no longer exists' });
    }

    if (!group.members.some((m) => m.toString() === req.user._id.toString())) {
      group.members.push(req.user._id);
      await group.save();
    }

    invitation.status = 'accepted';
    await invitation.save();

    res.status(200).json({
      message: 'Invitation accepted successfully',
      groupId: group._id,
      groupName: group.name,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject invitation
// @route   PUT /api/invitations/:id/reject
// @access  Private
export const rejectInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invitation = await Invitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Verify recipient ownership
    if (invitation.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied: This invitation is not for you' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation has already been ${invitation.status}` });
    }

    invitation.status = 'rejected';
    await invitation.save();

    res.status(200).json({ message: 'Invitation rejected' });
  } catch (error) {
    next(error);
  }
};

