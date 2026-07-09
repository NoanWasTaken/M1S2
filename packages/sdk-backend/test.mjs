import { AnalyticsServer } from './dist/index.js';

const analytics = new AnalyticsServer({
    appId: 'app_cf61cb1988aef04bc430632d0ba4a278',
    appSecret: 'sk_b4a1e880ab66c1095feb275e102244035ad925a4479a4c598d29643040b7b756',
    endpoint: 'http://localhost:4000/api/v1/ingestion/server',
});

await analytics.track('order_paid', {
    amount: 79.9,
    currency: 'EUR',
    orderId: 'CMD-1234',
});

console.log('Event sent!');