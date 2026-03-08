/**
 * Smart Java test runner that parses test case variables,
 * detects the user's method signature, generates a wrapper Main.java,
 * and executes each test case against the backend.
 */

import { API_BASE_URL } from './api';
import type { TestResult } from '@/components/TestCasePanel';
import type { ExecutionStatus } from './executor';

const BACKEND_URL = `${API_BASE_URL}/api/run-java`;

// ─── Type inference from string values ───────────────────────────

function inferJavaType(value: string): string {
  const v = value.trim();
  // 2D array: [[1,2],[3,4]]
  if (/^\[\s*\[/.test(v)) return 'int[][]';
  // 1D array of strings: ["a","b"]
  if (/^\[.*"/.test(v)) return 'String[]';
  // 1D int array: [1,2,3]
  if (/^\[/.test(v)) return 'int[]';
  // boolean
  if (v === 'true' || v === 'false') return 'boolean';
  // string (quoted)
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return 'String';
  // double
  if (/^-?\d+\.\d+$/.test(v)) return 'double';
  // int
  if (/^-?\d+$/.test(v)) return 'int';
  // char
  if (v.length === 1) return 'char';
  // default to String
  return 'String';
}

// ─── Convert value string to Java literal ────────────────────────

function toJavaLiteral(value: string, javaType: string): string {
  const v = value.trim();
  switch (javaType) {
    case 'int':
    case 'double':
    case 'boolean':
      return v;
    case 'char':
      return `'${v}'`;
    case 'String':
      // Already quoted
      if ((v.startsWith('"') && v.endsWith('"'))) return v;
      if ((v.startsWith("'") && v.endsWith("'"))) return `"${v.slice(1, -1)}"`;
      return `"${v}"`;
    case 'int[]':
      // [1,2,3] → new int[]{1,2,3}
      return `new int[]${v.replace('[', '{').replace(']', '}')}`;
    case 'String[]': {
      // ["a","b"] → new String[]{"a","b"}
      return `new String[]${v.replace('[', '{').replace(/]$/, '}')}`;
    }
    case 'int[][]': {
      // [[1,2],[3,4]] → new int[][]{{1,2},{3,4}}
      let s = v.replace(/\[/g, '{').replace(/\]/g, '}');
      return `new int[][]${s}`;
    }
    default:
      return `"${v}"`;
  }
}

// ─── Convert output to Java print statement ──────────────────────

function buildOutputPrint(returnType: string): string {
  switch (returnType) {
    case 'int[]':
      return 'System.out.println(java.util.Arrays.toString(result));';
    case 'int[][]':
      return 'System.out.println(java.util.Arrays.deepToString(result));';
    case 'String[]':
      return 'System.out.println(java.util.Arrays.toString(result));';
    case 'boolean[]':
      return 'System.out.println(java.util.Arrays.toString(result));';
    case 'List<Integer>':
    case 'List<String>':
    case 'List<List<Integer>>':
      return 'System.out.println(result);';
    default:
      return 'System.out.println(result);';
  }
}

// ─── Parse method signature from user code ───────────────────────

interface MethodSignature {
  name: string;
  returnType: string;
  params: { type: string; name: string }[];
  isStatic: boolean;
}

function parseMethodSignature(code: string): MethodSignature | null {
  // Match: public static <return> <name>(<params>)
  // Also match without static, or just the method
  const patterns = [
    { regex: /public\s+static\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/, isStatic: true },
    { regex: /public\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/, isStatic: false },
    { regex: /static\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/, isStatic: true },
  ];

  for (const { regex, isStatic } of patterns) {
    const match = code.match(regex);
    if (match) {
      const returnType = match[1].trim();
      const name = match[2].trim();
      // Skip main method
      if (name === 'main') continue;
      const paramsStr = match[3].trim();
      const params: { type: string; name: string }[] = [];
      if (paramsStr) {
        for (const p of paramsStr.split(',')) {
          const parts = p.trim().split(/\s+/);
          if (parts.length >= 2) {
            params.push({ type: parts.slice(0, -1).join(' '), name: parts[parts.length - 1] });
          }
        }
      }
      return { name, returnType, params, isStatic };
    }
  }
  return null;
}

// ─── Check if code already has a class declaration ───────────────

function hasClassDeclaration(code: string): boolean {
  return /\bclass\s+\w+/.test(code);
}

// ─── Build wrapped code for a single test case ───────────────────

export function buildTestWrapper(
  userCode: string,
  inputs: Record<string, string>,
  methodSig: MethodSignature | null
): string {
  const imports = `import java.util.*;\nimport java.io.*;\nimport java.math.*;\n`;
  
  // Build variable declarations
  const varDecls: string[] = [];
  const varNames: string[] = [];
  
  for (const [name, value] of Object.entries(inputs)) {
    const jType = inferJavaType(value);
    const literal = toJavaLiteral(value, jType);
    varDecls.push(`        ${jType} ${name} = ${literal};`);
    varNames.push(name);
  }

  // If we detected a method, call it with the variables
  let callCode: string;
  if (methodSig) {
    // Map input variable names to method parameters by position
    const args = methodSig.params.map((param, idx) => {
      // First try exact name match
      if (inputs[param.name] !== undefined) return param.name;
      // Then try positional match
      if (idx < varNames.length) return varNames[idx];
      return 'null';
    }).join(', ');

    const resultType = methodSig.returnType;
    const printStmt = buildOutputPrint(resultType);

    if (resultType === 'void') {
      callCode = `        ${methodSig.name}(${args});\n        System.out.println("void");`;
    } else {
      callCode = `        ${resultType} result = ${methodSig.name}(${args});\n        ${printStmt}`;
    }
  } else {
    // No method detected - just run the code as-is with variables available
    callCode = '        // Could not detect method signature - running code as-is';
  }

  // Strip any existing class wrapper or main method from user code
  let cleanCode = userCode.trim();
  
  // If user code is wrapped in a class, extract just the methods
  const classMatch = cleanCode.match(/(?:public\s+)?class\s+\w+\s*\{([\s\S]*)\}\s*$/);
  if (classMatch) {
    cleanCode = classMatch[1].trim();
    // Remove any existing main method
    cleanCode = cleanCode.replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g, '').trim();
  }

  return `${imports}
public class Main {
    ${cleanCode}

    public static void main(String[] args) {
        try {
${varDecls.join('\n')}
${callCode}
        } catch (Exception e) {
            System.out.println("ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }
}`;
}

// ─── Run all test cases ──────────────────────────────────────────

export interface TestCaseInput {
  inputs: Record<string, string>;
  expected: string;
}

export async function runAllTests(
  userCode: string,
  testCases: TestCaseInput[],
  onStatus?: (status: ExecutionStatus) => void,
  onTestResult?: (index: number, result: TestResult) => void,
): Promise<TestResult[]> {
  if (testCases.length === 0) return [];

  onStatus?.('sending');
  const methodSig = parseMethodSignature(userCode);
  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    onStatus?.('running');

    const wrappedCode = buildTestWrapper(userCode, tc.inputs, methodSig);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: wrappedCode }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errText = await response.text();
        const result: TestResult = {
          test: i + 1,
          status: 'FAILED',
          expected: tc.expected,
          actual: `Server error: ${response.status}`,
        };
        results.push(result);
        onTestResult?.(i, result);
        continue;
      }

      const data = await response.json();
      const actual = (data.success ? (data.output || '') : (data.error || '')).trim();
      const expected = tc.expected.trim();
      
      // Normalize comparison: remove spaces around brackets/commas for arrays
      const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
      const passed = normalize(actual) === normalize(expected);

      const result: TestResult = {
        test: i + 1,
        status: passed ? 'PASSED' : 'FAILED',
        expected,
        actual: actual || '(no output)',
      };
      results.push(result);
      onTestResult?.(i, result);
    } catch (err: any) {
      const result: TestResult = {
        test: i + 1,
        status: 'FAILED',
        expected: tc.expected,
        actual: err.name === 'AbortError' ? 'Timeout (15s)' : (err.message || 'Error'),
      };
      results.push(result);
      onTestResult?.(i, result);
    }
  }

  onStatus?.('complete');
  return results;
}
