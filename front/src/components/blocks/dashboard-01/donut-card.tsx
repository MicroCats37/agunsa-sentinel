import { CategoryDonutChart, type ChartProps } from '@/components/charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Reparto por categoría de detección.
 *
 * El total vive en el centro del anillo como una capa absoluta sobre el
 * gráfico: es la lectura principal del panel, no un dato más de la leyenda.
 */
export interface DonutCardProps {
  title: string;
  description: string;
  data: ChartProps['data'];
  height?: number;
}

export function DonutCard({ title, description, data, height = 200 }: DonutCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <CategoryDonutChart data={data} height={height} />
      </CardContent>
    </Card>
  );
}
