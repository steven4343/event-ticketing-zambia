const pool = require('../config/database');
const { getOrSetCache, invalidateCache, CACHE_TTL } = require('../config/redis');
const { emitToAll, emitToUser } = require('../config/socket');

const browseEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, date_from, date_to, category_id } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `events:list:${page}:${limit}:${search || ''}:${date_from || ''}:${date_to || ''}:${category_id || ''}`;

    const fetchFromDb = async () => {
      let query = `
        SELECT e.id, e.title, e.description, e.venue, e.event_date, e.event_time,
               e.banner_image, e.status, u.name as organizer_name,
               c.name as category_name,
               json_agg(
                 json_build_object('id', tt.id, 'name', tt.name, 'price', tt.price, 'available', tt.available)
                 ORDER BY tt.price DESC
               ) FILTER (WHERE tt.id IS NOT NULL) as ticket_types
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN ticket_types tt ON tt.event_id = e.id
        WHERE e.status = 'approved'
      `;
      const params = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND e.search_vector @@ plainto_tsquery('english', $${paramIndex})`;
        params.push(search);
        paramIndex++;
      }
      if (date_from) {
        query += ` AND e.event_date >= $${paramIndex}`;
        params.push(date_from);
        paramIndex++;
      }
      if (date_to) {
        query += ` AND e.event_date <= $${paramIndex}`;
        params.push(date_to);
        paramIndex++;
      }
      if (category_id) {
        query += ` AND e.category_id = $${paramIndex}`;
        params.push(category_id);
        paramIndex++;
      }

      query += ` GROUP BY e.id, u.name, c.name ORDER BY e.event_date ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      const countResult = await pool.query('SELECT COUNT(*) FROM events WHERE status = $1', ['approved']);

      return {
        events: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      };
    };

    const data = await getOrSetCache(cacheKey, CACHE_TTL.EVENTS_LIST, fetchFromDb);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
};

const getEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `event:${id}`;

    const fetchFromDb = async () => {
      const eventResult = await pool.query(
        `SELECT e.*, u.name as organizer_name, u.phone as organizer_phone
         FROM events e JOIN users u ON e.organizer_id = u.id WHERE e.id = $1`,
        [id]
      );
      if (eventResult.rows.length === 0) return null;

      const ticketTypes = await pool.query(
        'SELECT * FROM ticket_types WHERE event_id = $1 ORDER BY price DESC',
        [id]
      );

      return { ...eventResult.rows[0], ticket_types: ticketTypes.rows };
    };

    const event = await getOrSetCache(cacheKey, CACHE_TTL.EVENT_DETAIL, fetchFromDb);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.json(event);
  } catch (error) {
    next(error);
  }
};

const updateEventTicketTypes = async (client, eventId, ticketTypes) => {
  await client.query('DELETE FROM ticket_types WHERE event_id = $1', [eventId]);
  for (const tt of ticketTypes) {
    await client.query(
      `INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
       VALUES ($1, $2, $3, $4, $5, $5)`,
      [eventId, tt.name, tt.description, tt.price, tt.quantity]
    );
  }
};

const createEvent = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { title, description, venue, event_date, event_time, banner_image, ticket_types, category_id } = req.body;

    await client.query('BEGIN');

    const eventResult = await client.query(
      `INSERT INTO events (title, description, venue, event_date, event_time, banner_image, organizer_id, category_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING id, title, status`,
      [title, description, venue, event_date, event_time, banner_image, req.user.id, category_id]
    );

    const event = eventResult.rows[0];

    for (const tt of ticket_types) {
      await client.query(
        `INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
         VALUES ($1, $2, $3, $4, $5, $5)`,
        [event.id, tt.name, tt.description, tt.price, tt.quantity]
      );
    }

    await client.query('COMMIT');

    await invalidateCache('events:*');

    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const updateEvent = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { title, description, venue, event_date, event_time, banner_image, ticket_types, category_id } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE events SET title = COALESCE($1, title), description = COALESCE($2, description),
       venue = COALESCE($3, venue), event_date = COALESCE($4, event_date),
       event_time = COALESCE($5, event_time), banner_image = COALESCE($6, banner_image),
       category_id = COALESCE($7, category_id), updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND organizer_id = $9
       RETURNING id, title, status`,
      [title, description, venue, event_date, event_time, banner_image, category_id, id, req.user.id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found or not authorized' });
    }

    if (ticket_types) {
      await updateEventTicketTypes(client, id, ticket_types);
    }

    await client.query('COMMIT');

    await invalidateCache(`event:${id}`);
    await invalidateCache('events:*');

    res.json({ message: 'Event updated successfully', event: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

const cancelEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE events SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND (organizer_id = $2 OR $3 = 'super_admin')
       RETURNING id, title`,
      [id, req.user.id, req.user.role]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not authorized' });
    }

    await invalidateCache(`event:${id}`);
    await invalidateCache('events:*');

    res.json({ message: 'Event cancelled successfully', event: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const approveEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const result = await pool.query(
      `UPDATE events SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
       RETURNING id, title, status, organizer_id`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await invalidateCache(`event:${id}`);
    await invalidateCache('events:*');

    emitToUser(result.rows[0].organizer_id, 'event-status', result.rows[0]);

    res.json({ message: `Event ${status}`, event: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getOrganizerEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, COUNT(t.id) as tickets_sold,
        (SELECT COALESCE(SUM(o.total_amount), 0) FROM orders o WHERE o.event_id = e.id AND o.payment_status = 'completed') as revenue
      FROM events e
      LEFT JOIN tickets t ON t.event_id = e.id
      WHERE e.organizer_id = $1
    `;
    const params = [req.user.id];
    let paramIdx = 2;

    if (status) {
      query += ` AND e.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ` GROUP BY e.id ORDER BY e.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM events WHERE organizer_id = $1', [req.user.id]);

    res.json({
      events: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (error) {
    next(error);
  }
};

const getEventStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `event:stats:${id}`;

    const fetchFromDb = async () => {
      const eventCheck = await pool.query(
        'SELECT title FROM events WHERE id = $1 AND (organizer_id = $2 OR $3 = \'super_admin\')',
        [id, req.user.id, req.user.role]
      );
      if (eventCheck.rows.length === 0) return null;

      const stats = await pool.query(`
        SELECT
          COUNT(t.id) FILTER (WHERE t.status IN ('active', 'used')) as tickets_sold,
          COUNT(t.id) FILTER (WHERE t.status = 'used') as checked_in,
          COUNT(t.id) FILTER (WHERE t.status = 'active') as active_tickets,
          COALESCE(SUM(o.total_amount), 0) FILTER (WHERE o.payment_status = 'completed') as total_revenue
        FROM events e
        LEFT JOIN orders o ON o.event_id = e.id AND o.payment_status = 'completed'
        LEFT JOIN tickets t ON t.event_id = e.id
        WHERE e.id = $1
      `, [id]);

      const ticketTypes = await pool.query(
        `SELECT tt.name, tt.quantity, tt.available, (tt.quantity - tt.available) as sold, tt.price
         FROM ticket_types tt WHERE tt.event_id = $1`,
        [id]
      );

      return {
        event_title: eventCheck.rows[0].title,
        ...stats.rows[0],
        ticket_types: ticketTypes.rows,
      };
    };

    const stats = await getOrSetCache(cacheKey, CACHE_TTL.STATS, fetchFromDb);
    if (!stats) return res.status(404).json({ error: 'Event not found or not authorized' });

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

const cloneEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sourceResult = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND organizer_id = $2',
      [id, req.user.id]
    );
    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not authorized' });
    }

    const source = sourceResult.rows[0];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const eventResult = await client.query(
        `INSERT INTO events (title, description, venue, event_date, event_time, banner_image, organizer_id, category_id, is_draft, clone_source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
         RETURNING id, title, status`,
        [
          `${source.title} (Copy)`, source.description, source.venue,
          source.event_date, source.event_time, source.banner_image,
          req.user.id, source.category_id, source.id,
        ]
      );

      const newEvent = eventResult.rows[0];

      const ticketTypes = await client.query(
        'SELECT name, description, price, quantity FROM ticket_types WHERE event_id = $1',
        [id]
      );

      for (const tt of ticketTypes.rows) {
        await client.query(
          `INSERT INTO ticket_types (event_id, name, description, price, quantity, available)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [newEvent.id, tt.name, tt.description, tt.price, tt.quantity]
        );
      }

      await client.query('COMMIT');
      await invalidateCache('events:*');

      res.status(201).json({ message: 'Event cloned successfully', event: newEvent });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

const publishEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE events SET is_draft = false, status = 'pending', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organizer_id = $2 AND is_draft = true
       RETURNING id, title, status`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft event not found or already published' });
    }

    await invalidateCache(`event:${id}`);
    await invalidateCache('events:*');

    res.json({ message: 'Event submitted for approval', event: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = { browseEvents, getEvent, createEvent, updateEvent, cancelEvent, approveEvent, getOrganizerEvents, getEventStats, getCategories, cloneEvent, publishEvent };
