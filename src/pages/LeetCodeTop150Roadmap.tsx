import RoadmapPage from '@/components/RoadmapPage';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const LeetCodeTop150Roadmap = () => (
  <RoadmapPage
    title="LeetCode Top Interview 150"
    icon={<span className="text-lg">📘</span>}
    roadmap={LEETCODE_TOP150_ROADMAP}
  />
);

export default LeetCodeTop150Roadmap;
