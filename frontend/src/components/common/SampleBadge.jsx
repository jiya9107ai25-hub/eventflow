import { FlaskConical } from 'lucide-react';
import { Badge } from '@/components/ui';

/** Clearly marks sample/demo content wherever it appears. */
export function SampleBadge({ className }) {
  return (
    <Badge tone="warning" className={className} title="This is sample data created for demonstration">
      <FlaskConical className="h-3 w-3" /> Sample data
    </Badge>
  );
}
