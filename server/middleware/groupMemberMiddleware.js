import Group from '../models/Group.js';

export const verifyGroupMembership = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.body.groupId || req.query.groupId;

    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this group' });
    }

    req.group = group;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error checking group membership', error: error.message });
  }
};

