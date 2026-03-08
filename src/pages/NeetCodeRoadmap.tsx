import { Map } from 'lucide-react';
import RoadmapPage from '@/components/RoadmapPage';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';

const NeetCodeRoadmap = () => (
  <RoadmapPage
    title="NeetCode 150"
    icon={<span className="text-lg">💻</span>}
    roadmap={NEETCODE_ROADMAP}
  />
);

export default NeetCodeRoadmap;
