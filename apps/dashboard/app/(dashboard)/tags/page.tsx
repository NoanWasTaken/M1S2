import { TrackingManager } from '@/components/tracking/tracking-manager';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function TagsPage() {
    return (
        <ProtectedRoute>
            <TrackingManager mode="tags" />
        </ProtectedRoute>
    );
}
