import { API_BASE_URL } from './api';
import type { TestResult } from '@/components/TestCasePanel';
import type { DbTestCase } from './supabase';
import type { ExecutionStatus } from './executor';

const BACKEND_URL = `${API_BASE_URL}/api/run-java`;

export async function runTestCases(
  code: string,
  testCases: DbTestCase[],
  onStatus?: (status: ExecutionStatus) => void
): Promise<TestResult[]> {
  if (testCases.length === 0) return [];

  onStatus?.('sending');
  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    onStatus?.('running');

    // Build a Main wrapper that calls the user function with the test input and prints result
    const wrappedCode = `import java.util.*;
import java.io.*;

public class Main {
    // User code
    ${code}

    public static void main(String[] args) {
        try {
            // Test input
            String inputStr = "${tc.input.replace(/"/g, '\\"').replace(/\n/g, '\\n')}";
            
            // Try to call the method with parsing
            // We'll use reflection or direct call based on the function signature
            System.out.println(runTest(inputStr));
        } catch (Exception e) {
            System.out.println("ERROR: " + e.getMessage());
        }
    }

    private static String runTest(String input) throws Exception {
        // Parse and call - this is a generic approach
        // The user function output will be captured
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        java.io.PrintStream oldOut = System.out;
        System.setOut(new java.io.PrintStream(baos));
        
        // Execute by evaluating - we need the user to have a main-compatible function
        // For now, create a simple test harness
        System.setOut(oldOut);
        
        // Direct execution approach: wrap in a class that calls the function
        return baos.toString().trim();
    }
}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: wrappedCode }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        results.push({ test: i + 1, status: 'FAILED', expected: tc.expected_output, actual: `Error: ${response.status}` });
        continue;
      }

      const data = await response.json();
      const actual = (data.output || data.error || '').trim();
      const expected = tc.expected_output.trim();
      const passed = actual === expected;

      results.push({
        test: i + 1,
        status: passed ? 'PASSED' : 'FAILED',
        expected,
        actual: actual || '(no output)',
      });
    } catch (err: any) {
      results.push({
        test: i + 1,
        status: 'FAILED',
        expected: tc.expected_output,
        actual: err.name === 'AbortError' ? 'Timeout' : (err.message || 'Error'),
      });
    }
  }

  onStatus?.('complete');
  return results;
}
