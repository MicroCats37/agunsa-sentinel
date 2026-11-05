import type { Metadata } from 'next';
import { GeospatialPage } from '@/features/scene';

export const metadata: Metadata = {
  title: 'Gemelo digital del perímetro',
  description:
    'Vista geoespacial de AGUNSA Callao con las 36 cámaras del inventario evaluado sobre el terreno real.',
};

export default function GeospatialRoute() {
  return <GeospatialPage />;
}
