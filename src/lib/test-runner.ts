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
      // Parse ["a","b"] or [a,b] into new char[]{'a','b'}
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
      // Convert [1,2,3] to Arrays.asList(1,2,3) or List.of(1,2,3)
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
      // For unknown types, try to infer from value
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
  braceCount = 1; // We've seen the opening brace

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
      if (v !== null && v !== undefined) {
        safeInputs[k] = String(v);
      }
    }
  }

  // Build variable declarations using method signature types when available
  const varDecls: string[] = [];
  const varNames: string[] = [];
  
  // Build a map from param name -> param type from the method signature
  const paramTypeMap: Record<string, string> = {};
  if (methodSig) {
    for (const p of methodSig.params) {
      paramTypeMap[p.name] = p.type;
    }
  }

  // Also build positional mapping: input entries in order -> method params in order
  const inputEntries = Object.entries(safeInputs);
  
  for (let i = 0; i < inputEntries.length; i++) {
    const [name, value] = inputEntries[i];
    // Use method signature type if available (by name match or positional match)
    let jType = paramTypeMap[name];
    if (!jType && methodSig && i < methodSig.params.length) {
      jType = methodSig.params[i].type;
    }
    if (!jType) {
      jType = inferJavaType(value);
    }
    const literal = toJavaLiteral(value, jType);
    varDecls.push(`        ${jType} ${name} = ${literal};`);
    varNames.push(name);
  }

  // If we detected a method, call it with the variables
  let callCode: string;
  if (methodSig && varNames.length > 0) {
    // Map method params to input variables by name first, then position
    const args = methodSig.params.map((param, idx) => {
      // Exact name match
      if (safeInputs[param.name] !== undefined) return param.name;
      // Try positional match
      if (idx < varNames.length) return varNames[idx];
      // Last resort: use a default value based on type
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
    // No inputs provided - can't call method
    callCode = '        System.out.println("ERROR: No test inputs provided");';
  } else {
    callCode = '        // Could not detect method signature - running code as-is';
  }

  // Strip any existing class wrapper or main method from user code
  let cleanCode = userCode.trim();
  
  // If user code is wrapped in a class, extract just the methods
  const classMatch = cleanCode.match(/(?:public\s+)?class\s+\w+\s*\{([\s\S]*)\}\s*$/);
  if (classMatch) {
    cleanCode = classMatch[1].trim();
    // Remove any existing main method using brace-counting
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
