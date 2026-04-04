/**
 * Smart Java test runner that parses test case variables,
 * detects the user's method signature, generates a wrapper Main.java,
 * and executes each test case against the backend.
 * 
 * KEY: Keeps user's class intact (e.g. Solution) and generates a separate
 * public class Main that instantiates and calls the user's class.
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
    case 'short':
      return `(short)${v}`;
    case 'byte':
      return `(byte)${v}`;
    case 'char':
      if (v.startsWith("'")) return v;
      return `'${v.replace(/^"|"$/g, '')}'`;
    case 'String':
      if (v.startsWith('"') && v.endsWith('"')) return v;
      if (v.startsWith("'") && v.endsWith("'")) return `"${v.slice(1, -1)}"`;
      return `"${v}"`;
    case 'Integer':
      return `Integer.valueOf(${v})`;
    case 'Long':
      return `Long.valueOf(${v}L)`;
    case 'Double':
      return `Double.valueOf(${v})`;
    case 'Float':
      return `Float.valueOf(${v}f)`;
    case 'Boolean':
      return `Boolean.valueOf(${v})`;
    case 'Character':
      if (v.startsWith("'")) return `Character.valueOf(${v})`;
      return `Character.valueOf('${v.replace(/^"|"$/g, '')}')`;
    case 'int[]':
    case 'long[]':
    case 'double[]':
    case 'float[]':
    case 'short[]':
    case 'byte[]': {
      // Parse JSON array and build Java array initializer
      try {
        const items = JSON.parse(v);
        if (Array.isArray(items)) {
          return `new ${javaType}{${items.join(', ')}}`;
        }
      } catch {}
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
      try {
        const items = JSON.parse(v);
        if (Array.isArray(items)) {
          return `new String[]{${items.map((s: string) => `"${s}"`).join(', ')}}`;
        }
      } catch {}
      return `new String[]${v.replace('[', '{').replace(/\]$/, '}')}`;
    }
    case 'Integer[]': {
      try {
        const items = JSON.parse(v);
        if (Array.isArray(items)) {
          return `new Integer[]{${items.join(', ')}}`;
        }
      } catch {}
      return `new Integer[]${v.replace('[', '{').replace(/\]$/, '}')}`;
    }
    case 'int[][]':
    case 'long[][]':
    case 'double[][]': {
      // Parse nested JSON array properly
      try {
        const outer = JSON.parse(v);
        if (Array.isArray(outer)) {
          const baseType = javaType.replace('[][]', '');
          const rows = outer.map((row: any[]) => `{${row.join(', ')}}`).join(', ');
          return `new ${baseType}[][]{${rows}}`;
        }
      } catch {}
      // Fallback: replace brackets
      let s = v.replace(/\[/g, '{').replace(/\]/g, '}');
      return `new ${javaType}${s}`;
    }
    case 'char[][]': {
      try {
        const outer = JSON.parse(v);
        if (Array.isArray(outer)) {
          const rows = outer.map((row: any[]) => `{${row.map((c: string) => `'${c}'`).join(', ')}}`).join(', ');
          return `new char[][]{${rows}}`;
        }
      } catch {}
      let s = v.replace(/\[/g, '{').replace(/\]/g, '}');
      return `new char[][]${s}`;
    }
    case 'String[][]': {
      try {
        const outer = JSON.parse(v);
        if (Array.isArray(outer)) {
          const rows = outer.map((row: any[]) => `{${row.map((s: string) => `"${s}"`).join(', ')}}`).join(', ');
          return `new String[][]{${rows}}`;
        }
      } catch {}
      let s = v.replace(/\[/g, '{').replace(/\]/g, '}');
      return `new String[][]${s}`;
    }
    case 'List<Integer>':
    case 'List<String>':
    case 'List<Long>':
    case 'List<Double>': {
      try {
        const items = JSON.parse(v);
        if (Array.isArray(items)) {
          const literals = items.map((item: any) => {
            if (javaType === 'List<String>') return `"${item}"`;
            return String(item);
          }).join(', ');
          return `new java.util.ArrayList<>(java.util.Arrays.asList(${literals}))`;
        }
      } catch {}
      return `new java.util.ArrayList<>()`;
    }
    case 'List<List<Integer>>': {
      try {
        const outer = JSON.parse(v);
        if (Array.isArray(outer)) {
          const lists = outer.map((inner: any[]) =>
            `java.util.Arrays.asList(${inner.join(', ')})`
          ).join(', ');
          return `new java.util.ArrayList<>(java.util.Arrays.asList(${lists}))`;
        }
      } catch {}
      return `new java.util.ArrayList<>()`;
    }
    case 'ArrayList<Integer>':
    case 'ArrayList<String>': {
      const innerType = javaType.includes('String') ? 'List<String>' : 'List<Integer>';
      return toJavaLiteral(v, innerType);
    }
    case 'LinkedList<Integer>':
    case 'LinkedList<String>': {
      try {
        const items = JSON.parse(v);
        if (Array.isArray(items)) {
          const literals = items.map((item: any) => {
            if (javaType.includes('String')) return `"${item}"`;
            return String(item);
          }).join(', ');
          return `new java.util.LinkedList<>(java.util.Arrays.asList(${literals}))`;
        }
      } catch {}
      return `new java.util.LinkedList<>()`;
    }
    case 'HashSet<Integer>':
    case 'HashSet<String>': {
      try {
        const items = JSON.parse(v);
        if (Array.isArray(items)) {
          const literals = items.map((item: any) => {
            if (javaType.includes('String')) return `"${item}"`;
            return String(item);
          }).join(', ');
          return `new java.util.HashSet<>(java.util.Arrays.asList(${literals}))`;
        }
      } catch {}
      return `new java.util.HashSet<>()`;
    }
    case 'StringBuilder': {
      const str = v.startsWith('"') ? v : `"${v}"`;
      return `new StringBuilder(${str})`;
    }
    case 'StringBuffer': {
      const str = v.startsWith('"') ? v : `"${v}"`;
      return `new StringBuffer(${str})`;
    }
    default:
      if (v.startsWith('[')) {
        try {
          const items = JSON.parse(v);
          if (Array.isArray(items)) {
            return `new ${javaType}{${items.join(', ')}}`;
          }
        } catch {}
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
    case 'boolean[]':
    case 'long[]':
    case 'double[]':
    case 'float[]':
    case 'short[]':
    case 'byte[]':
    case 'char[]':
    case 'String[]':
    case 'Integer[]':
      return 'System.out.println(java.util.Arrays.toString(result));';
    case 'int[][]':
    case 'long[][]':
    case 'double[][]':
    case 'String[][]':
    case 'char[][]':
      return 'System.out.println(java.util.Arrays.deepToString(result));';
    case 'List<Integer>':
    case 'List<String>':
    case 'List<List<Integer>>':
    case 'ArrayList<Integer>':
    case 'ArrayList<String>':
    case 'LinkedList<Integer>':
    case 'HashSet<Integer>':
    case 'HashSet<String>':
      return 'System.out.println(result);';
    case 'StringBuilder':
    case 'StringBuffer':
      return 'System.out.println(result.toString());';
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
  // Remove comments to avoid false matches
  const cleaned = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  const patterns = [
    { regex: /public\s+static\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/g, isStatic: true },
    { regex: /public\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/g, isStatic: false },
    { regex: /static\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/g, isStatic: true },
    { regex: /private\s+static\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/g, isStatic: true },
    { regex: /private\s+([\w\[\]<>,\s]+?)\s+(\w+)\s*\(([^)]*)\)/g, isStatic: false },
  ];

  for (const { regex, isStatic } of patterns) {
    let match;
    while ((match = regex.exec(cleaned)) !== null) {
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

// ─── Detect user's class name ───────────────────────────────────

function detectClassName(code: string): string | null {
  const match = code.match(/(?:public\s+)?class\s+(\w+)\s*\{/);
  return match ? match[1] : null;
}

// ─── Default value for a Java type ──────────────────────────────

function getDefaultForType(javaType: string): string {
  if (javaType.includes('[]')) return 'new ' + javaType + '{}';
  switch (javaType) {
    case 'int': return '0';
    case 'long': return '0L';
    case 'double': return '0.0';
    case 'float': return '0.0f';
    case 'short': return '(short)0';
    case 'byte': return '(byte)0';
    case 'boolean': return 'false';
    case 'char': return "' '";
    case 'String': return '""';
    case 'Integer': return '0';
    case 'Long': return '0L';
    case 'Double': return '0.0';
    case 'Float': return '0.0f';
    case 'Boolean': return 'false';
    case 'Character': return "' '";
    case 'StringBuilder': return 'new StringBuilder()';
    case 'StringBuffer': return 'new StringBuffer()';
    default:
      if (javaType.startsWith('List<') || javaType.startsWith('ArrayList<')) return 'new java.util.ArrayList<>()';
      if (javaType.startsWith('LinkedList<')) return 'new java.util.LinkedList<>()';
      if (javaType.startsWith('HashSet<')) return 'new java.util.HashSet<>()';
      if (javaType.startsWith('HashMap<')) return 'new java.util.HashMap<>()';
      return 'null';
  }
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

  // Detect the user's class name
  const className = detectClassName(userCode) || 'Solution';
  
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
    varDecls.push(`            ${jType} ${varName} = ${literal};`);
    varNames.push(varName);
  }

  // Build the method call code
  let callCode: string;
  if (methodSig && varNames.length > 0) {
    const args = methodSig.params.map((param, idx) => {
      if (varNames.includes(param.name)) return param.name;
      if (idx < varNames.length) return varNames[idx];
      return getDefaultForType(param.type);
    }).join(', ');

    const resultType = methodSig.returnType;
    const printStmt = buildOutputPrint(resultType);
    
    const caller = methodSig.isStatic 
      ? `${className}.${methodSig.name}` 
      : `new ${className}().${methodSig.name}`;

    if (resultType === 'void') {
      callCode = `            ${caller}(${args});\n            System.out.println("void");`;
    } else {
      callCode = `            ${resultType} result = ${caller}(${args});\n            ${printStmt}`;
    }
  } else if (methodSig && varNames.length === 0) {
    if (methodSig.params.length === 0) {
      const resultType = methodSig.returnType;
      const printStmt = buildOutputPrint(resultType);
      const caller = methodSig.isStatic 
        ? `${className}.${methodSig.name}` 
        : `new ${className}().${methodSig.name}`;
      if (resultType === 'void') {
        callCode = `            ${caller}();\n            System.out.println("void");`;
      } else {
        callCode = `            ${resultType} result = ${caller}();\n            ${printStmt}`;
      }
    } else {
      callCode = '            System.out.println("ERROR: No test inputs provided for method parameters");';
    }
  } else {
    callCode = '            // Could not detect method signature - running code as-is';
  }

  // Keep user's class intact, just remove `public` modifier so it doesn't
  // conflict with public class Main
  let userClass = userCode.trim();
  userClass = userClass.replace(/^public\s+class\s+/, 'class ');

  return `${imports}
${userClass}

public class Main {
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

  const controller = new AbortController();
  testAbortController = controller;

  onStatus?.('sending');
  const methodSig = parseMethodSignature(userCode);
  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
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

    const validInputs: Record<string, string> = {};
    if (tc.inputs && typeof tc.inputs === 'object') {
      for (const [k, v] of Object.entries(tc.inputs)) {
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          validInputs[k] = String(v);
        }
      }
    }

    if (Object.keys(validInputs).length === 0) {
      if (methodSig && methodSig.params.length === 0) {
        // proceed with empty inputs
      } else {
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
      const normalize = (s: string) => {
        const trimmed = s.trim();
        if (/^\[[\s\S]*\]$/.test(trimmed)) {
          const noOuterSpace = trimmed.replace(/\s*\[\s*/g, '[').replace(/\s*\]\s*/g, ']');
          const compactCommas = noOuterSpace.replace(/,\s+/g, ',');
          return compactCommas.toLowerCase();
        }
        return trimmed.replace(/\s+/g, ' ').toLowerCase();
      };

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
      
      if (err.name === 'AbortError') break;
    }
  }

  testAbortController = null;
  onStatus?.('complete');
  return results;
}

// ─── Execute code with stdin input ───────────────────────────────

export async function executeWithStdin(
  userCode: string,
  stdinInput: string,
  onStatus?: (status: ExecutionStatus) => void,
): Promise<{ success: boolean; output: string; error: string }> {
  onStatus?.('sending');

  // For stdin-based execution, we send the code as-is (user writes main method)
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: userCode, stdin: stdinInput }),
    });

    if (!response.ok) {
      onStatus?.('failed');
      return { success: false, output: '', error: `Server error: ${response.status}` };
    }

    const data = await response.json();
    onStatus?.('complete');
    return {
      success: data.success || false,
      output: data.output || '',
      error: data.error || '',
    };
  } catch (err: any) {
    onStatus?.('failed');
    return { success: false, output: '', error: err.message || 'Execution failed' };
  }
}
