// server/controllers/knowledgeController.js
import KnowledgeItem from '../models/KnowledgeItem.js';

// ─── GET ALL (paginated, filterable) ─────────────────────────────────────────

export async function getKnowledgeItems(req, res) {
  try {
    const { category, service, priority, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (service) filter.service = { $regex: service, $options: 'i' };
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { investigation: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      KnowledgeItem.find(filter)
        .sort({ sourceTicketId: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-embedding -searchableContent'),
      KnowledgeItem.countDocuments(filter)
    ]);

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('getKnowledgeItems error:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge items' });
  }
}

// ─── GET ONE ──────────────────────────────────────────────────────────────────

export async function getKnowledgeItemById(req, res) {
  try {
    const item = await KnowledgeItem.findById(req.params.id).select('-embedding');
    if (!item) return res.status(404).json({ error: 'Knowledge item not found' });
    res.json(item);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid knowledge item ID' });
    console.error('getKnowledgeItemById error:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge item' });
  }
}

// ─── GET STATS ────────────────────────────────────────────────────────────────

export async function getKnowledgeStats(req, res) {
  try {
    const [total, withEmbeddings, byCategory] = await Promise.all([
      KnowledgeItem.countDocuments(),
      KnowledgeItem.countDocuments({ embedding: { $exists: true, $ne: [] } }),
      KnowledgeItem.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({ total, withEmbeddings, byCategory });
  } catch (err) {
    console.error('getKnowledgeStats error:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge stats' });
  }
}
