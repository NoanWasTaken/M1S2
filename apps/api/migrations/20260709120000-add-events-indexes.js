// Indexes that back the analytics aggregations.
// Every dashboard/analytics pipeline starts with a $match on appId + occurredAt,
// and many also filter by type. createIndex is idempotent: if Mongoose already
// created the index under its default name, this is a no-op.

export const up = async (db) => {
    await db.collection('events').createIndex({ appId: 1, occurredAt: 1 });
    await db.collection('events').createIndex({ appId: 1, type: 1, occurredAt: 1 });
};

export const down = async (db) => {
    await db.collection('events').dropIndex('appId_1_occurredAt_1');
    await db.collection('events').dropIndex('appId_1_type_occurredAt_1');
};