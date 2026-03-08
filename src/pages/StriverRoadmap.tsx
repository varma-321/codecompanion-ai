import { Map } from 'lucide-react';
import RoadmapPage from '@/components/RoadmapPage';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';

const StriverRoadmap = () => (
  <RoadmapPage
    title="Striver SDE Sheet Roadmap"
    icon={<Map className="h-4 w-4 text-primary" />}
    roadmap={STRIVER_ROADMAP}
  />
);

export default StriverRoadmap;
