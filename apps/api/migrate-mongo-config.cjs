require('dotenv').config();

/** @type {import('migrate-mongo').config.Config} */
const config = {
    mongodb: {
        url: process.env.MONGODB_URI,
    },
    migrationsDir: 'migrations',
    changelogCollectionName: 'changelog',
    lockCollectionName: 'changelog_lock',
    lockTtl: 0,
    migrationFileExtension: '.js',
    useFileHash: false,
    moduleSystem: 'esm',
};

module.exports = config;