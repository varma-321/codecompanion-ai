/**
 * Smart Java test runner that supports TWO modes:
 * 1. LeetCode-style: User writes Solution class, test runner wraps with Main
 * 2. Main-class-style: User writes Main with Scanner, test cases passed as stdin
 */

import { API_BASE_URL } from './api';
import type { TestResult } from '@/components/TestCasePanel';
import type { ExecutionStatus } from './executor';

const BACKEND_URL = `${API_BASE_URL}/api/run-java`;

let testAbortController: AbortController | null = null;

export function stopTestExecution() {
  if (testAbortController) {
    testAbortController.abort();
    testAbortController = null;
  }
}

// ─── Type inference from string values ───────────────────────────

function stripJavaComments(code: string): string {
  return code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

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
      try {
        const outer = JSON.parse(v);
        if (Array.isArray(outer)) {
          const baseType = javaType.replace('[][]', '');
          const rows = outer.map((row: any[]) => `{${row.join(', ')}}`).join(', ');
          return `new ${baseType}[][]{${rows}}`;
        }
      } catch {}
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

function buildValuePrint(javaType: string, varName: string): string {
  if (isLinkedListType(javaType)) return `System.out.println(listToString(${varName}));`;
  if (/\[\]$/.test(javaType) && !/\[\]\[\]$/.test(javaType)) return `System.out.println(java.util.Arrays.toString(${varName}));`;
  if (/\[\]\[\]$/.test(javaType)) return `System.out.println(java.util.Arrays.deepToString(${varName}));`;
  return `System.out.println(${varName});`;
}

// ─── Parse method signature from user code ───────────────────────

interface MethodSignature {
  name: string;
  returnType: string;
  params: { type: string; name: string }[];
  isStatic: boolean;
}

export function parseMethodSignature(code: string): MethodSignature | null {
  const cleaned = stripJavaComments(code);
  
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
  const cleaned = stripJavaComments(code);
  const solutionMatch = cleaned.match(/(?:public\s+)?class\s+Solution\s*\{/);
  if (solutionMatch) return 'Solution';
  const match = cleaned.match(/(?:public\s+)?class\s+(\w+)\s*\{/);
  return match ? match[1] : null;
}

// ─── Detect if code is Main-class style (has main method + reads stdin) ──

export function isMainClassStyle(code: string): boolean {
  const cleaned = stripJavaComments(code);
  // Has a main() method
  const hasMain = /public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]/.test(cleaned);
  if (!hasMain) return false;
  // AND reads from stdin in any form
  const readsStdin =
    /new\s+Scanner\s*\(/.test(cleaned) ||
    /System\.in/.test(cleaned) ||
    /BufferedReader/.test(cleaned) ||
    /InputStreamReader/.test(cleaned);
  return readsStdin;
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

function isLinkedListType(javaType: string): boolean {
  return /(?:^|\.)ListNode$/.test(javaType.trim());
}

function isTreeType(javaType: string): boolean {
  return /(?:^|\.)TreeNode$/.test(javaType.trim());
}

function normalizeNodeType(javaType: string, userCode: string, className: string): string {
  const cleaned = stripJavaComments(userCode);
  const nestedList = new RegExp(`class\\s+${className}[\\s\\S]*?(?:static\\s+)?class\\s+ListNode`).test(cleaned);
  const nestedTree = new RegExp(`class\\s+${className}[\\s\\S]*?(?:static\\s+)?class\\s+TreeNode`).test(cleaned);
  if (javaType === 'ListNode' && nestedList) return `${className}.ListNode`;
  if (javaType === 'TreeNode' && nestedTree) return `${className}.TreeNode`;
  return javaType;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureEmptyMethodHasDefaultReturn(userClass: string, methodSig: MethodSignature | null): string {
  if (!methodSig || methodSig.returnType === 'void') return userClass;
  const returnType = methodSig.returnType.replace(/\s+/g, '\\s+');
  const methodPattern = new RegExp(`((?:public|private|protected)?\\s*(?:static\\s+)?${returnType}\\s+${escapeRegExp(methodSig.name)}\\s*\\([^)]*\\)\\s*\\{)([\\s\\S]*?)(\\n?\\s*\\})`);
  return userClass.replace(methodPattern, (full, start, body, end) => {
    if (stripJavaComments(body).trim() !== '') return full;
    return `${start}\n        return ${getDefaultForType(methodSig.returnType)};${end}`;
  });
}

function getListNodeBuilder(nodeType: string): string {
  return `
    private static ${nodeType} buildList(int[] values, int pos) {
        if (values == null || values.length == 0) return null;
        ${nodeType} head = new ${nodeType}(values[0]);
        ${nodeType} current = head;
        ${nodeType} cycle = pos == 0 ? head : null;
        for (int i = 1; i < values.length; i++) {
            current.next = new ${nodeType}(values[i]);
            current = current.next;
            if (i == pos) cycle = current;
        }
        if (pos >= 0) current.next = cycle;
        return head;
    }
    private static String listToString(${nodeType} node) {
        java.util.List<Integer> out = new java.util.ArrayList<>();
        java.util.Set<${nodeType}> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        while (node != null && !seen.contains(node) && out.size() < 10000) {
            seen.add(node);
            out.add(node.val);
            node = node.next;
        }
        return out.toString();
    }
    private static int nodeIndex(${nodeType} head, ${nodeType} target) {
        int idx = 0;
        java.util.Set<${nodeType}> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        while (head != null && !seen.contains(head) && idx < 10000) {
            if (head == target) return idx;
            seen.add(head);
            head = head.next;
            idx++;
        }
        return -1;
    }`;
}

function getTreeNodeBuilder(nodeType: string): string {
  return `
    private static ${nodeType} buildTree(Integer[] values) {
        if (values == null || values.length == 0 || values[0] == null) return null;
        ${nodeType} root = new ${nodeType}(values[0]);
        java.util.Queue<${nodeType}> q = new java.util.LinkedList<>();
        q.offer(root);
        int i = 1;
        while (!q.isEmpty() && i < values.length) {
            ${nodeType} node = q.poll();
            if (i < values.length && values[i] != null) { node.left = new ${nodeType}(values[i]); q.offer(node.left); }
            i++;
            if (i < values.length && values[i] != null) { node.right = new ${nodeType}(values[i]); q.offer(node.right); }
            i++;
        }
        return root;
    }`;
}

function toIntegerArrayLiteral(value: string): string {
  try {
    const items = JSON.parse(value.trim());
    if (Array.isArray(items)) {
      return `new Integer[]{${items.map((item) => item === null ? 'null' : String(item)).join(', ')}}`;
    }
  } catch {}
  return 'new Integer[]{}';
}

function getSupportTypes(userCode: string, needsListNode: boolean, needsTreeNode: boolean): string {
  const blocks: string[] = [];
  if (needsListNode && !/class\s+ListNode\b/.test(userCode)) {
    blocks.push(`class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}`);
  }
  if (needsTreeNode && !/class\s+TreeNode\b/.test(userCode)) {
    blocks.push(`class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}`);
  }
  return blocks.join('\n\n');
}

// ─── Build stdin string from test case inputs ────────────────────
// Converts test case input values to newline-separated stdin lines.
// Each input value becomes one line, which matches Scanner.nextLine(),
// nextInt(), nextLong(), next() etc.
//
// Strategy: emit the raw value stripped of surrounding quotes.
// Arrays like [1,2,3] are emitted as space-separated on one line
// so Scanner can read them with multiple next() calls.
// 2-D arrays emit size then each row as space-separated.

function buildStdinFromInputs(inputs: Record<string, string>): string {
  const lines: string[] = [];
  for (const [, value] of Object.entries(inputs)) {
    const v = value.trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      try {
        const arr = JSON.parse(v);
        if (Array.isArray(arr)) {
          if (arr.length > 0 && Array.isArray(arr[0])) {
            // 2-D array: emit row count then each row space-separated
            lines.push(String(arr.length));
            for (const row of arr) lines.push((row as any[]).join(' '));
          } else {
            // 1-D array: emit as space-separated on one line
            lines.push(arr.join(' '));
          }
          continue;
        }
      } catch {}
    }
    // Scalars: strip surrounding quotes
    lines.push(v.replace(/^["']|["']$/g, ''));
  }
  return lines.join('\n');
}

// ─── Build wrapped code for LeetCode-style (Solution class) ──────

export function buildTestWrapper(
  userCode: string,
  inputs: Record<string, string>,
  methodSig: MethodSignature | null
): string {
  const imports = `import java.util.*;\nimport java.io.*;\nimport java.math.*;\n`;
  
  const safeInputs: Record<string, string> = {};
  if (inputs && typeof inputs === 'object') {
    for (const [k, v] of Object.entries(inputs)) {
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        safeInputs[k] = String(v);
      }
    }
  }

  const className = detectClassName(userCode) || 'Solution';
  
  const varDecls: string[] = [];
  const varNames: string[] = [];
  const helperBlocks: string[] = [];
  let usesListNode = false;
  let usesTreeNode = false;
  
  const paramTypeMap: Record<string, string> = {};
  if (methodSig) {
    for (const p of methodSig.params) {
      paramTypeMap[p.name] = p.type;
    }
  }

  const inputEntries = Object.entries(safeInputs);
  
  for (let i = 0; i < inputEntries.length; i++) {
    const [name, value] = inputEntries[i];
    if (methodSig && name === 'pos' && !paramTypeMap[name]) continue;
    let jType = paramTypeMap[name];
    if (!jType && methodSig && i < methodSig.params.length) {
      jType = methodSig.params[i].type;
    }
    if (!jType) {
      jType = inferJavaType(value);
    }
    jType = normalizeNodeType(jType, userCode, className);
    const varName = (methodSig && i < methodSig.params.length && !paramTypeMap[name]) 
      ? methodSig.params[i].name 
      : name;

    if (isLinkedListType(jType)) {
      usesListNode = true;
      const valuesName = `${varName}Values`;
      const cyclePos = Number.isFinite(Number(safeInputs.pos)) ? Number(safeInputs.pos) : -1;
      varDecls.push(`            int[] ${valuesName} = ${toJavaLiteral(value, 'int[]')};`);
      varDecls.push(`            ${jType} ${varName} = buildList(${valuesName}, ${cyclePos});`);
    } else if (isTreeType(jType)) {
      usesTreeNode = true;
      varDecls.push(`            ${jType} ${varName} = buildTree(${toIntegerArrayLiteral(value)});`);
    } else {
      const literal = toJavaLiteral(value, jType);
      varDecls.push(`            ${jType} ${varName} = ${literal};`);
    }
    varNames.push(varName);
  }

  if (usesListNode || (methodSig && (methodSig.params.some(p => isLinkedListType(p.type)) || isLinkedListType(methodSig.returnType)))) {
    const nodeType = normalizeNodeType('ListNode', userCode, className);
    helperBlocks.push(getListNodeBuilder(nodeType));
  }
  if (usesTreeNode || (methodSig && methodSig.params.some(p => isTreeType(p.type)))) {
    const nodeType = normalizeNodeType('TreeNode', userCode, className);
    helperBlocks.push(getTreeNodeBuilder(nodeType));
  }

  let callCode: string;
  if (methodSig && varNames.length > 0) {
    const args = methodSig.params.map((param, idx) => {
      if (varNames.includes(param.name)) return param.name;
      if (idx < varNames.length) return varNames[idx];
      return getDefaultForType(param.type);
    }).join(', ');

    const resultType = normalizeNodeType(methodSig.returnType, userCode, className);
    const printStmt = isLinkedListType(resultType)
      ? (methodSig.name.toLowerCase().includes('cycle') && methodSig.params[0]?.name
        ? `System.out.println(nodeIndex(${methodSig.params[0].name}, result));`
        : 'System.out.println(listToString(result));')
      : buildOutputPrint(resultType);
    
    const caller = methodSig.isStatic 
      ? `${className}.${methodSig.name}` 
      : `new ${className}().${methodSig.name}`;

    if (resultType === 'void') {
      const firstParam = methodSig.params[0];
      const mutatedPrint = firstParam ? buildValuePrint(normalizeNodeType(firstParam.type, userCode, className), firstParam.name) : 'System.out.println("void");';
      callCode = `            ${caller}(${args});\n            ${mutatedPrint}`;
    } else {
      callCode = `            ${resultType} result = ${caller}(${args});\n            ${printStmt}`;
    }
  } else if (methodSig && varNames.length === 0) {
    if (methodSig.params.length === 0) {
      const resultType = normalizeNodeType(methodSig.returnType, userCode, className);
      const printStmt = isLinkedListType(resultType) ? 'System.out.println(listToString(result));' : buildOutputPrint(resultType);
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

  let userClass = userCode.trim();
  const userImports = (userClass.match(/^\s*import\s+[^;]+;\s*$/gm) || []).join('\n');
  userClass = userClass.replace(/^\s*import\s+[^;]+;\s*$/gm, '').trim();
  userClass = userClass.replace(/(^|\n)(\s*)public\s+class\s+/g, '$1$2class ');
  userClass = ensureEmptyMethodHasDefaultReturn(userClass, methodSig);
  if (className) {
    const classStart = new RegExp(`class\\s+${className}\\s*\\{`);
    if (classStart.test(userClass)) {
      userClass = userClass
        .replace(/(^|\n)(\s*)(class\s+ListNode\s*\{)/g, '$1$2static $3')
        .replace(/(^|\n)(\s*)(class\s+TreeNode\s*\{)/g, '$1$2static $3');
    }
  }
  const supportTypes = getSupportTypes(stripJavaComments(userClass), !!methodSig && (methodSig.params.some(p => isLinkedListType(p.type)) || isLinkedListType(methodSig.returnType)), !!methodSig && methodSig.params.some(p => isTreeType(p.type)));

  const allImports = `${imports}${userImports ? `${userImports}\n` : ''}`;

  return `${allImports}
public class Main {
${helperBlocks.join('\n')}
    public static void main(String[] args) {
        try {
${varDecls.join('\n')}
${callCode}
        } catch (Exception e) {
            System.out.println("ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }
}

${supportTypes}

${userClass}`;
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
  
  // Detect execution mode
  const mainStyle = isMainClassStyle(userCode);
  const methodSig = mainStyle ? null : parseMethodSignature(userCode);
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

    try {
      let response: Response;

      if (mainStyle) {
        // Main-class mode: pass test case values as stdin
        const stdinData = buildStdinFromInputs(validInputs);
        response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: userCode, stdin: stdinData }),
          signal: controller.signal,
        });
      } else {
        // LeetCode mode: wrap with Main class
        if (Object.keys(validInputs).length === 0 && methodSig && methodSig.params.length > 0) {
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
        response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: wrappedCode }),
          signal: controller.signal,
        });
      }

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

      // Deep-equality JSON comparison handles array/object formatting differences
      const tryParse = (s: string): any => {
        const t = s.trim();
        if (t === 'true' || t === 'false' || t === 'null') return JSON.parse(t);
        if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
        try { return JSON.parse(t); } catch {}
        try { return JSON.parse(t.replace(/'/g, '"')); } catch {}
        return undefined;
      };
      const deepEq = (a: any, b: any): boolean => {
        if (a === b) return true;
        if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length) return false;
          return a.every((v, i) => deepEq(v, b[i]));
        }
        if (a && b && typeof a === 'object' && typeof b === 'object') {
          const ak = Object.keys(a), bk = Object.keys(b);
          if (ak.length !== bk.length) return false;
          return ak.every((k) => deepEq(a[k], b[k]));
        }
        return String(a) === String(b);
      };
      const aJson = tryParse(actual);
      const eJson = tryParse(expected);
      let passed: boolean;
      let isCompileError = false;

      if (!data.success && (actual.includes('error:') || actual.includes('compilation') || actual.includes('Exception in thread'))) {
        passed = false;
        isCompileError = true;
      } else if (aJson !== undefined && eJson !== undefined) {
        passed = deepEq(aJson, eJson);
      } else {
        const norm = (s: string) => s.trim().replace(/\s+/g, '').toLowerCase();
        passed = norm(actual) === norm(expected);
      }

      const result: TestResult = {
        test: i + 1,
        status: passed ? 'PASSED' : 'FAILED',
        expected,
        actual: actual || '(no output)',
      };
      results.push(result);
      onTestResult?.(i, result);
      
      if (isCompileError) {
        // Abort remaining tests if the code couldn't even compile
        break;
      }
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
