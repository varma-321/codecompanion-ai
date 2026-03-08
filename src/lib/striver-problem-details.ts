/**
 * Problem descriptions, examples, starter code, and built-in test cases
 * for the Striver SDE Sheet problems.
 */

export interface ProblemDetail {
  key: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  starterCode: string;
  testCases: { inputs: Record<string, string>; expected: string }[];
  functionName: string;
  returnType: string;
  params: { name: string; type: string }[];
}

export const PROBLEM_DETAILS: Record<string, ProblemDetail> = {
  // ── Arrays ──
  'arr-19': {
    key: 'arr-19',
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.`,
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
    ],
    starterCode: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[]{};
    }
}`,
    testCases: [
      { inputs: { nums: '[2,7,11,15]', target: '9' }, expected: '[0, 1]' },
      { inputs: { nums: '[3,2,4]', target: '6' }, expected: '[1, 2]' },
      { inputs: { nums: '[3,3]', target: '6' }, expected: '[0, 1]' },
    ],
    functionName: 'twoSum',
    returnType: 'int[]',
    params: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
  },
  'arr-4': {
    key: 'arr-4',
    description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.`,
    examples: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: 'nums = [1]', output: '1' },
      { input: 'nums = [5,4,-1,7,8]', output: '23' },
    ],
    starterCode: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { nums: '[-2,1,-3,4,-1,2,1,-5,4]' }, expected: '6' },
      { inputs: { nums: '[1]' }, expected: '1' },
      { inputs: { nums: '[5,4,-1,7,8]' }, expected: '23' },
    ],
    functionName: 'maxSubArray',
    returnType: 'int',
    params: [{ name: 'nums', type: 'int[]' }],
  },
  'arr-6': {
    key: 'arr-6',
    description: `You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy and a single day to sell. Return the maximum profit you can achieve. If no profit is possible, return 0.`,
    examples: [
      { input: 'prices = [7,1,5,3,6,4]', output: '5', explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.' },
      { input: 'prices = [7,6,4,3,1]', output: '0' },
    ],
    starterCode: `class Solution {
    public int maxProfit(int[] prices) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { prices: '[7,1,5,3,6,4]' }, expected: '5' },
      { inputs: { prices: '[7,6,4,3,1]' }, expected: '0' },
      { inputs: { prices: '[2,4,1]' }, expected: '2' },
    ],
    functionName: 'maxProfit',
    returnType: 'int',
    params: [{ name: 'prices', type: 'int[]' }],
  },
  'arr-15': {
    key: 'arr-15',
    description: `Given an array nums of size n, return the majority element.\n\nThe majority element is the element that appears more than ⌊n / 2⌋ times. You may assume that the majority element always exists.`,
    examples: [
      { input: 'nums = [3,2,3]', output: '3' },
      { input: 'nums = [2,2,1,1,1,2,2]', output: '2' },
    ],
    starterCode: `class Solution {
    public int majorityElement(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { nums: '[3,2,3]' }, expected: '3' },
      { inputs: { nums: '[2,2,1,1,1,2,2]' }, expected: '2' },
      { inputs: { nums: '[1]' }, expected: '1' },
    ],
    functionName: 'majorityElement',
    returnType: 'int',
    params: [{ name: 'nums', type: 'int[]' }],
  },
  'arr-5': {
    key: 'arr-5',
    description: `Given an array nums with n objects colored red (0), white (1), or blue (2), sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue.\n\nYou must solve this problem without using the library's sort function.`,
    examples: [
      { input: 'nums = [2,0,2,1,1,0]', output: '[0,0,1,1,2,2]' },
      { input: 'nums = [2,0,1]', output: '[0,1,2]' },
    ],
    starterCode: `class Solution {
    public void sortColors(int[] nums) {
        // Write your solution here (Dutch National Flag)
    }
}`,
    testCases: [
      { inputs: { nums: '[2,0,2,1,1,0]' }, expected: '[0, 0, 1, 1, 2, 2]' },
      { inputs: { nums: '[2,0,1]' }, expected: '[0, 1, 2]' },
    ],
    functionName: 'sortColors',
    returnType: 'void',
    params: [{ name: 'nums', type: 'int[]' }],
  },
  'arr-27': {
    key: 'arr-27',
    description: `Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. Return the number of unique elements.`,
    examples: [
      { input: 'nums = [1,1,2]', output: '2' },
      { input: 'nums = [0,0,1,1,1,2,2,3,3,4]', output: '5' },
    ],
    starterCode: `class Solution {
    public int removeDuplicates(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { nums: '[1,1,2]' }, expected: '2' },
      { inputs: { nums: '[0,0,1,1,1,2,2,3,3,4]' }, expected: '5' },
    ],
    functionName: 'removeDuplicates',
    returnType: 'int',
    params: [{ name: 'nums', type: 'int[]' }],
  },

  // ── Strings ──
  'str-10': {
    key: 'str-10',
    description: `Given two strings s and t, return true if t is an anagram of s, and false otherwise.\n\nAn Anagram is a word formed by rearranging the letters of a different word, using all the original letters exactly once.`,
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: 'true' },
      { input: 's = "rat", t = "car"', output: 'false' },
    ],
    starterCode: `class Solution {
    public boolean isAnagram(String s, String t) {
        // Write your solution here
        return false;
    }
}`,
    testCases: [
      { inputs: { s: '"anagram"', t: '"nagaram"' }, expected: 'true' },
      { inputs: { s: '"rat"', t: '"car"' }, expected: 'false' },
      { inputs: { s: '"a"', t: '"a"' }, expected: 'true' },
    ],
    functionName: 'isAnagram',
    returnType: 'boolean',
    params: [{ name: 's', type: 'String' }, { name: 't', type: 'String' }],
  },
  'str-1': {
    key: 'str-1',
    description: `Given an input string s, reverse the order of the words.\n\nA word is defined as a sequence of non-space characters. The words in s will be separated by at least one space. Return a string with the words in reverse order concatenated by a single space.`,
    examples: [
      { input: 's = "the sky is blue"', output: '"blue is sky the"' },
      { input: 's = "  hello world  "', output: '"world hello"' },
    ],
    starterCode: `class Solution {
    public String reverseWords(String s) {
        // Write your solution here
        return "";
    }
}`,
    testCases: [
      { inputs: { s: '"the sky is blue"' }, expected: 'blue is sky the' },
      { inputs: { s: '"  hello world  "' }, expected: 'world hello' },
    ],
    functionName: 'reverseWords',
    returnType: 'String',
    params: [{ name: 's', type: 'String' }],
  },

  // ── Linked List ──
  'll-1': {
    key: 'll-1',
    description: `Given the head of a singly linked list, reverse the list, and return the reversed list.`,
    examples: [
      { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' },
      { input: 'head = [1,2]', output: '[2,1]' },
    ],
    starterCode: `class Solution {
    public ListNode reverseList(ListNode head) {
        // Write your solution here
        return null;
    }
}`,
    testCases: [
      { inputs: { head: '[1,2,3,4,5]' }, expected: '[5, 4, 3, 2, 1]' },
      { inputs: { head: '[1,2]' }, expected: '[2, 1]' },
      { inputs: { head: '[]' }, expected: '[]' },
    ],
    functionName: 'reverseList',
    returnType: 'ListNode',
    params: [{ name: 'head', type: 'ListNode' }],
  },

  // ── Stack & Queue ──
  'sq-5': {
    key: 'sq-5',
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    starterCode: `class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        return false;
    }
}`,
    testCases: [
      { inputs: { s: '"()"' }, expected: 'true' },
      { inputs: { s: '"()[]{}"' }, expected: 'true' },
      { inputs: { s: '"(]"' }, expected: 'false' },
      { inputs: { s: '"([)]"' }, expected: 'false' },
    ],
    functionName: 'isValid',
    returnType: 'boolean',
    params: [{ name: 's', type: 'String' }],
  },

  // ── Binary Search ──
  'bs-1': {
    key: 'bs-1',
    description: `Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return -1.`,
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' },
    ],
    starterCode: `class Solution {
    public int search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`,
    testCases: [
      { inputs: { nums: '[-1,0,3,5,9,12]', target: '9' }, expected: '4' },
      { inputs: { nums: '[-1,0,3,5,9,12]', target: '2' }, expected: '-1' },
      { inputs: { nums: '[5]', target: '5' }, expected: '0' },
    ],
    functionName: 'search',
    returnType: 'int',
    params: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
  },
  'bs-7': {
    key: 'bs-7',
    description: `There is an integer array nums sorted in ascending order (with distinct values). Prior to being passed to your function, nums is possibly rotated at an unknown pivot index.\n\nGiven the array nums after rotation and an integer target, return the index of target if it is in nums, or -1 if not.`,
    examples: [
      { input: 'nums = [4,5,6,7,0,1,2], target = 0', output: '4' },
      { input: 'nums = [4,5,6,7,0,1,2], target = 3', output: '-1' },
    ],
    starterCode: `class Solution {
    public int search(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}`,
    testCases: [
      { inputs: { nums: '[4,5,6,7,0,1,2]', target: '0' }, expected: '4' },
      { inputs: { nums: '[4,5,6,7,0,1,2]', target: '3' }, expected: '-1' },
      { inputs: { nums: '[1]', target: '0' }, expected: '-1' },
    ],
    functionName: 'search',
    returnType: 'int',
    params: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }],
  },

  // ── Recursion ──
  'rec-7': {
    key: 'rec-7',
    description: `The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other.\n\nGiven an integer n, return all distinct solutions to the n-queens puzzle. Each solution contains a distinct board configuration.`,
    examples: [
      { input: 'n = 4', output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]' },
      { input: 'n = 1', output: '[["Q"]]' },
    ],
    starterCode: `class Solution {
    public List<List<String>> solveNQueens(int n) {
        // Write your solution here
        return new ArrayList<>();
    }
}`,
    testCases: [
      { inputs: { n: '4' }, expected: '2' },
      { inputs: { n: '1' }, expected: '1' },
    ],
    functionName: 'solveNQueens',
    returnType: 'List<List<String>>',
    params: [{ name: 'n', type: 'int' }],
  },

  // ── Trees ──
  'tree-5': {
    key: 'tree-5',
    description: `Given the root of a binary tree, return its maximum depth.\n\nA binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.`,
    examples: [
      { input: 'root = [3,9,20,null,null,15,7]', output: '3' },
      { input: 'root = [1,null,2]', output: '2' },
    ],
    starterCode: `class Solution {
    public int maxDepth(TreeNode root) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { root: '[3,9,20,null,null,15,7]' }, expected: '3' },
      { inputs: { root: '[1,null,2]' }, expected: '2' },
      { inputs: { root: '[]' }, expected: '0' },
    ],
    functionName: 'maxDepth',
    returnType: 'int',
    params: [{ name: 'root', type: 'TreeNode' }],
  },

  // ── DP ──
  'dp-1': {
    key: 'dp-1',
    description: `You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
    examples: [
      { input: 'n = 2', output: '2', explanation: '1. 1 step + 1 step\n2. 2 steps' },
      { input: 'n = 3', output: '3' },
    ],
    starterCode: `class Solution {
    public int climbStairs(int n) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { n: '2' }, expected: '2' },
      { inputs: { n: '3' }, expected: '3' },
      { inputs: { n: '5' }, expected: '8' },
      { inputs: { n: '10' }, expected: '89' },
    ],
    functionName: 'climbStairs',
    returnType: 'int',
    params: [{ name: 'n', type: 'int' }],
  },
  'dp-3': {
    key: 'dp-3',
    description: `You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. All houses are arranged in a straight line. Adjacent houses have security systems connected.\n\nGiven an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police (no two adjacent houses).`,
    examples: [
      { input: 'nums = [1,2,3,1]', output: '4', explanation: 'Rob house 1 (money = 1) and then rob house 3 (money = 3). Total = 1 + 3 = 4.' },
      { input: 'nums = [2,7,9,3,1]', output: '12' },
    ],
    starterCode: `class Solution {
    public int rob(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { nums: '[1,2,3,1]' }, expected: '4' },
      { inputs: { nums: '[2,7,9,3,1]' }, expected: '12' },
      { inputs: { nums: '[2,1,1,2]' }, expected: '4' },
    ],
    functionName: 'rob',
    returnType: 'int',
    params: [{ name: 'nums', type: 'int[]' }],
  },
  'dp-17': {
    key: 'dp-17',
    description: `You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the fewest number of coins needed to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.`,
    examples: [
      { input: 'coins = [1,5,11], amount = 11', output: '1' },
      { input: 'coins = [2], amount = 3', output: '-1' },
    ],
    starterCode: `class Solution {
    public int coinChange(int[] coins, int amount) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { coins: '[1,5,11]', amount: '11' }, expected: '1' },
      { inputs: { coins: '[2]', amount: '3' }, expected: '-1' },
      { inputs: { coins: '[1,2,5]', amount: '11' }, expected: '3' },
    ],
    functionName: 'coinChange',
    returnType: 'int',
    params: [{ name: 'coins', type: 'int[]' }, { name: 'amount', type: 'int' }],
  },

  // ── Greedy ──
  'gr-7': {
    key: 'gr-7',
    description: `You are given an integer array nums. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length at that position.\n\nReturn true if you can reach the last index, or false otherwise.`,
    examples: [
      { input: 'nums = [2,3,1,1,4]', output: 'true' },
      { input: 'nums = [3,2,1,0,4]', output: 'false' },
    ],
    starterCode: `class Solution {
    public boolean canJump(int[] nums) {
        // Write your solution here
        return false;
    }
}`,
    testCases: [
      { inputs: { nums: '[2,3,1,1,4]' }, expected: 'true' },
      { inputs: { nums: '[3,2,1,0,4]' }, expected: 'false' },
      { inputs: { nums: '[0]' }, expected: 'true' },
    ],
    functionName: 'canJump',
    returnType: 'boolean',
    params: [{ name: 'nums', type: 'int[]' }],
  },

  // ── Graphs ──
  'graph-4': {
    key: 'graph-4',
    description: `Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.`,
    examples: [
      { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: '1' },
      { input: 'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', output: '3' },
    ],
    starterCode: `class Solution {
    public int numIslands(char[][] grid) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { grid: '[["1","1","0"],["0","1","0"],["0","0","1"]]' }, expected: '2' },
      { inputs: { grid: '[["1","1","1"],["0","1","0"],["1","1","1"]]' }, expected: '1' },
    ],
    functionName: 'numIslands',
    returnType: 'int',
    params: [{ name: 'grid', type: 'char[][]' }],
  },

  // ── Sliding Window ──
  'sw-2': {
    key: 'sw-2',
    description: `Given a string s, find the length of the longest substring without repeating characters.`,
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: '1' },
      { input: 's = "pwwkew"', output: '3' },
    ],
    starterCode: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { s: '"abcabcbb"' }, expected: '3' },
      { inputs: { s: '"bbbbb"' }, expected: '1' },
      { inputs: { s: '"pwwkew"' }, expected: '3' },
      { inputs: { s: '""' }, expected: '0' },
    ],
    functionName: 'lengthOfLongestSubstring',
    returnType: 'int',
    params: [{ name: 's', type: 'String' }],
  },

  // ── Bit Manipulation ──
  'bit-8': {
    key: 'bit-8',
    description: `Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.\n\nYou must implement a solution with linear runtime complexity and use only constant extra space.`,
    examples: [
      { input: 'nums = [2,2,1]', output: '1' },
      { input: 'nums = [4,1,2,1,2]', output: '4' },
    ],
    starterCode: `class Solution {
    public int singleNumber(int[] nums) {
        // Write your solution here
        return 0;
    }
}`,
    testCases: [
      { inputs: { nums: '[2,2,1]' }, expected: '1' },
      { inputs: { nums: '[4,1,2,1,2]' }, expected: '4' },
      { inputs: { nums: '[1]' }, expected: '1' },
    ],
    functionName: 'singleNumber',
    returnType: 'int',
    params: [{ name: 'nums', type: 'int[]' }],
  },
};

/**
 * Get problem detail by key; returns a generic template if no detail is defined.
 */
export function getProblemDetail(key: string, title: string, difficulty: string): ProblemDetail {
  if (PROBLEM_DETAILS[key]) return PROBLEM_DETAILS[key];

  // Generate a generic template for problems without specific details
  return {
    key,
    description: `Solve the "${title}" problem.\n\nDifficulty: ${difficulty}\n\nImplement an efficient solution. Consider edge cases and optimize for both time and space complexity.`,
    examples: [
      { input: 'See problem description', output: 'Expected result' },
    ],
    starterCode: `class Solution {
    // Implement your solution here
    public void solve() {
        
    }
}`,
    testCases: [],
    functionName: 'solve',
    returnType: 'void',
    params: [],
  };
}
