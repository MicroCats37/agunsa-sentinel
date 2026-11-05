import { IncidentDetailView } from '@/features/incidents/incident-detail-view';

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IncidentDetailView incidentId={id} />;
}
