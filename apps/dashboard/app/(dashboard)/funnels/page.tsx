import { TrackingManager } from '@/components/tracking/tracking-manager';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function FunnelsPage() {
    return (
        <ProtectedRoute>
            <TrackingManager mode="funnels" />
        </ProtectedRoute>
    );
}
