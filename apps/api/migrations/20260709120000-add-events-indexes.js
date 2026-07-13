// Analytics query indexes

export const up = async (db) => {
    await db.collection('events').createIndex({ appId: 1, occurredAt: 1 });
    await db.collection('events').createIndex({ appId: 1, type: 1, occurredAt: 1 });
};

export const down = async (db) => {
    await db.collection('events').dropIndex('appId_1_occurredAt_1');
    await db.collection('events').dropIndex('appId_1_type_occurredAt_1');
};