
export interface ContestProblem {
  key: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  starterCode?: string;
  category: string;
}

export const CONTEST_PROBLEMS: ContestProblem[] = [
  {
    key: 'contest-1',
    title: 'The Alchemist\'s Sequence',
    difficulty: 'Easy',
    category: 'Arrays',
    description: 'Given an array of integers representing the potency of different potions, find the longest continuous sequence of potions where each potion is strictly more potent than the previous one.',
    starterCode: 'public class Solution {\n    public int longestPotentSequence(int[] potions) {\n        // Your code here\n        return 0;\n    }\n}'
  },
  {
    key: 'contest-2',
    title: 'Digital Root Sum',
    difficulty: 'Easy',
    category: 'Math',
    description: 'Calculate the sum of digits of a number repeatedly until you get a single-digit number. Return that number.',
    starterCode: 'public class Solution {\n    public int digitalRoot(int n) {\n        // Your code here\n        return 0;\n    }\n}'
  },
  {
    key: 'contest-3',
    title: 'Cyber Cryptogram',
    difficulty: 'Medium',
    category: 'Strings',
    description: 'Decrypt a string where each character has been shifted by its position in the string (0-indexed). Return the original string.',
    starterCode: 'public class Solution {\n    public String decrypt(String encrypted) {\n        // Your code here\n        return "";\n    }\n}'
  },
  {
    key: 'contest-4',
    title: 'Path of the Ancient Explorer',
    difficulty: 'Medium',
    category: 'Graphs',
    description: 'In a 2D grid, an explorer can move in 4 directions. Some cells are blocked. Find the minimum number of steps to reach the bottom-right corner starting from the top-left.',
    starterCode: 'public class Solution {\n    public int minSteps(int[][] grid) {\n        // Your code here\n        return -1;\n    }\n}'
  },
  {
    key: 'contest-5',
    title: 'Quantum Bit Flip',
    difficulty: 'Hard',
    category: 'Bit Manipulation',
    description: 'Given a large number, find the maximum number of consecutive set bits you can obtain by flipping exactly one zero bit.',
    starterCode: 'public class Solution {\n    public int maxConsecutiveBits(long n) {\n        // Your code here\n        return 0;\n    }\n}'
  },
  {
    key: 'contest-6',
    title: 'Lunar Mining Optimization',
    difficulty: 'Hard',
    category: 'Dynamic Programming',
    description: 'A robot can mine resources on a path with different values. However, mining in one spot disables the adjacent spots for cooling. Maximize the total resources mined.',
    starterCode: 'public class Solution {\n    public int maxResources(int[] spots) {\n        // Your code here\n        return 0;\n    }\n}'
  },
  {
    key: 'contest-7',
    title: 'Viking Shield Wall',
    difficulty: 'Medium',
    category: 'Stacks',
    description: 'Given heights of shields in a wall, for each shield, find the distance to the next shield on the right that is taller than it. If none exists, use 0.',
    starterCode: 'public class Solution {\n    public int[] nextTallerShield(int[] heights) {\n        // Your code here\n        return new int[0];\n    }\n}'
  },
  {
    key: 'contest-8',
    title: 'Solar Panel Alignment',
    difficulty: 'Easy',
    category: 'Two Pointers',
    description: 'Align two arrays of solar panels to maximize their overlap where the values match. Return the maximum overlap count.',
    starterCode: 'public class Solution {\n    public int maxOverlap(int[] p1, int[] p2) {\n        // Your code here\n        return 0;\n    }\n}'
  },
  {
    key: 'contest-9',
    title: 'Gravity Well Traversal',
    difficulty: 'Hard',
    category: 'Heaps',
    description: 'You are at a specific gravity level. You can jump to higher levels using boost canisters. Each canister gives a specific boost. You want to reach a target level with the minimum number of canisters. Use a Max-Heap strategy.',
    starterCode: 'public class Solution {\n    public int minCanisters(int[] boosts, int start, int target) {\n        // Your code here\n        return -1;\n    }\n}'
  },
  {
    key: 'contest-10',
    title: 'The Architect\'s Tower',
    difficulty: 'Medium',
    category: 'Trees',
    description: 'Find the "unbalance" factor of a binary tree, defined as the maximum difference between the sum of values in any two subtrees.',
    starterCode: 'public class Solution {\n    public int maxUnbalance(TreeNode root) {\n        // Your code here\n        return 0;\n    }\n}'
  }
];
