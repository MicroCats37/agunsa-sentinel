import { CameraDetailView } from '@/features/monitoring/camera-detail-view';

export default async function CameraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CameraDetailView cameraId={id} />;
}
