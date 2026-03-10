/**
 * Smart Java test runner that parses test case variables,
 * detects the user's method signature, generates a wrapper Main.java,
 * and executes each test case against the backend.
 */

import { API_BASE_URL } from './api';
import type { TestResult } from '@/components/TestCasePanel';
import type { ExecutionStatus } from './executor';

const BACKEND_URL = `${API_BASE_URL}/api/run-java`;

// Global abort controller for stopping test runs
let testAbortController: AbortController | null = null;

export function stopTestExecution() {
  if (testAbortController) {
    testAbortController.abort();
    testAbortController = null;
  }
}

// ─── Type inference from string values ───────────────────────────

function inferJavaType(value: string): string {
  const v = value.trim();
  if (/^\[\s*\[/.test(v)) return 'int[][]';
  if (/^\[.*"/.test(v)) return 'String[]';
  if (/^\[/.test(v)) return 'int[]';
  if (v === 'true' || v === 'false') return 'boolean';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return 'String';
  if (/^-?\d+\.\d+$/.test(v)) return 'double';
  if (/^-?\d+$/.test(v)) return 'int';
  if (v.length === 1) return 'char';
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
    case 'long':
      return v.endsWith('L') ? v : `${v}L`;
    case 'float':
      return v.endsWith('f') ? v : `${v}f`;
    case 'char':
      if (v.startsWith("'")) return v;
      return `'${v.replace(/^"|"$/g, '')}'`;
    case 'String':
      if (v.startsWith('"') && v.endsWith('"')) return v;
      if (v.startsWith("'") && v.endsWith("'")) return `"${v.slice(1, -1)}"`;
      return `"${v}"`;
    case 'int[]':
    case 'long[]':
    case 'double[]':
    case 'float[]': {
      const inner = v.replace(/^\[/, '{').replace(/\]$/, '}');
      return `new ${javaType}${inner}`;
    }
    case 'char[]': {
      try {
        const items = JSON.parse(v);
        if (Array.isArray(items)) {
          return `new char[]{${items.map((c: string) => `'${c}'`).join(', ')}}`;
        }
      } catch {}
      const inner = v.replace(/^\[/, '{').replace(/\]$/, '}');
      return `new char[]${inner}`;
    }
    case 'String[]': {
      return `new String[]${v.replace('[', '{').replace(/\]$/, '}')}`;
    }
    case 'int[][]':
    case 'long[][]':
    case 'double[][]': {
      let s = v.replace(/\[/g, '{').replace(/\]/g, '}');
      return `new ${javaType}${s}`;
    }
    case 'char[][]': {
      let s = v.replace(/\[/g, '{').replace(/\]/g, '}');
      return `new char[][]${s}`;
    }
    case 'List<Integer>':
    case 'List<String>':
    case 'List<Long>': {
      try {
        const items = JSON.parse(v);
        if (Array.isArray(items)) {
          const literals = items.map((item: any) => {
            if (javaType === 'List<String>') return `"${item}"`;
            return String(item);
          }).join(', ');
          return `java.util.Arrays.asList(${literals})`;
        }
      } catch {}
      return `java.util.Arrays.asList()`;
    }
    case 'List<List<Integer>>': {
      try {
        const outer = JSON.parse(v);
        if (Array.isArray(outer)) {
          const lists = outer.map((inner: any[]) =>
            `java.util.Arrays.asList(${inner.join(', ')})`
          ).join(', ');
          return `java.util.Arrays.asList(${lists})`;
        }
      } catch {}
      return `java.util.Arrays.asList()`;
    }
    default:
      if (v.startsWith('[')) {
        const inner = v.replace(/^\[/, '{').replace(/\]$/, '}');
        return `new ${javaType}${inner}`;
      }
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
    case 'long[]':
      return 'System.out.println(java.util.Arrays.toString(result));';
    case 'double[]':
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
  const patterns = [
    { regex: /public\s+static\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/g, isStatic: true },
    { regex: /public\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/g, isStatic: false },
    { regex: /static\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/g, isStatic: true },
  ];

  for (const { regex, isStatic } of patterns) {
    let match;
    while ((match = regex.exec(code)) !== null) {
      const returnType = match[1].trim();
      const name = match[2].trim();
      if (name === 'main' || name === 'void') continue;
      if (returnType === 'class') continue;
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

// ─── Default value for a Java type ──────────────────────────────

function getDefaultForType(javaType: string): string {
  if (javaType.includes('[]')) return 'new ' + javaType + '{}';
  switch (javaType) {
    case 'int': return '0';
    case 'long': return '0L';
    case 'double': return '0.0';
    case 'float': return '0.0f';
    case 'boolean': return 'false';
    case 'char': return "' '";
    case 'String': return '""';
    default: return 'null';
  }
}

// ─── Remove main method using brace-counting ────────────────────

function removeMainMethod(code: string): string {
  const mainPattern = /public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/;
  const match = mainPattern.exec(code);
  if (!match) return code;

  const startIdx = match.index;
  let braceCount = 0;
  let endIdx = match.index + match[0].length;
  braceCount = 1;

  for (let i = endIdx; i < code.length; i++) {
    if (code[i] === '{') braceCount++;
    else if (code[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }

  return (code.slice(0, startIdx) + code.slice(endIdx)).trim();
}

// ─── Build wrapped code for a single test case ───────────────────

export function buildTestWrapper(
  userCode: string,
  inputs: Record<string, string>,
  methodSig: MethodSignature | null
): string {
  const imports = `import java.util.*;\nimport java.io.*;\nimport java.math.*;\n`;
  
  // Ensure inputs is a valid object with string values
  const safeInputs: Record<string, string> = {};
  if (inputs && typeof inputs === 'object') {
    for (const [k, v] of Object.entries(inputs)) {
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        safeInputs[k] = String(v);
      }
    }
  }

  // Build variable declarations using method signature types when available
  const varDecls: string[] = [];
  const varNames: string[] = [];
  
  const paramTypeMap: Record<string, string> = {};
  if (methodSig) {
    for (const p of methodSig.params) {
      paramTypeMap[p.name] = p.type;
    }
  }

  const inputEntries = Object.entries(safeInputs);
  
  for (let i = 0; i < inputEntries.length; i++) {
    const [name, value] = inputEntries[i];
    let jType = paramTypeMap[name];
    if (!jType && methodSig && i < methodSig.params.length) {
      jType = methodSig.params[i].type;
    }
    if (!jType) {
      jType = inferJavaType(value);
    }
    const literal = toJavaLiteral(value, jType);
    // Use the method param name if positional match and names differ
    const varName = (methodSig && i < methodSig.params.length && !paramTypeMap[name]) 
      ? methodSig.params[i].name 
      : name;
    varDecls.push(`        ${jType} ${varName} = ${literal};`);
    varNames.push(varName);
  }

  // If we detected a method, call it with the variables
  let callCode: string;
  if (methodSig && varNames.length > 0) {
    const args = methodSig.params.map((param, idx) => {
      if (varNames.includes(param.name)) return param.name;
      if (idx < varNames.length) return varNames[idx];
      return getDefaultForType(param.type);
    }).join(', ');

    const resultType = methodSig.returnType;
    const printStmt = buildOutputPrint(resultType);
    const caller = methodSig.isStatic ? methodSig.name : `new Main().${methodSig.name}`;

    if (resultType === 'void') {
      callCode = `        ${caller}(${args});\n        System.out.println("void");`;
    } else {
      callCode = `        ${resultType} result = ${caller}(${args});\n        ${printStmt}`;
    }
  } else if (methodSig && varNames.length === 0) {
    callCode = '        System.out.println("ERROR: No test inputs provided");';
  } else {
    callCode = '        // Could not detect method signature - running code as-is';
  }

  // Strip any existing class wrapper or main method from user code
  let cleanCode = userCode.trim();
  
  const classMatch = cleanCode.match(/(?:public\s+)?class\s+\w+\s*\{([\s\S]*)\}\s*$/);
  if (classMatch) {
    cleanCode = classMatch[1].trim();
    cleanCode = removeMainMethod(cleanCode);
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

  // Create a new abort controller for this test run
  const controller = new AbortController();
  testAbortController = controller;

  onStatus?.('sending');
  const methodSig = parseMethodSignature(userCode);
  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    // Check if aborted
    if (controller.signal.aborted) {
      const result: TestResult = {
        test: i + 1,
        status: 'FAILED',
        expected: testCases[i].expected,
        actual: 'Stopped by user',
      };
      results.push(result);
      onTestResult?.(i, result);
      continue;
    }

    const tc = testCases[i];
    onStatus?.('running');

    // Validate inputs aren't empty
    const validInputs: Record<string, string> = {};
    if (tc.inputs && typeof tc.inputs === 'object') {
      for (const [k, v] of Object.entries(tc.inputs)) {
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          validInputs[k] = String(v);
        }
      }
    }

    if (Object.keys(validInputs).length === 0) {
      const result: TestResult = {
        test: i + 1,
        status: 'FAILED',
        expected: tc.expected,
        actual: 'ERROR: Empty or invalid test inputs',
      };
      results.push(result);
      onTestResult?.(i, result);
      continue;
    }

    const wrappedCode = buildTestWrapper(userCode, validInputs, methodSig);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: wrappedCode }),
        signal: controller.signal,
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
      
      // Normalize comparison
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
        actual: err.name === 'AbortError' ? 'Stopped by user' : (err.message || 'Error'),
      };
      results.push(result);
      onTestResult?.(i, result);
      
      // If aborted, stop processing remaining tests
      if (err.name === 'AbortError') break;
    }
  }

  testAbortController = null;
  onStatus?.('complete');
  return results;
}
