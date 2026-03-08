import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Debounced autosave hook. Calls `onSave` after `delay` ms of inactivity.
 * Returns { isDirty, lastSaved, triggerSave }
 */
export function useAutosave(
  value: string,
  onSave: (value: string) => Promise<void>,
  options: { delay?: number; enabled?: boolean } = {}
) {
  const { delay = 2000, enabled = true } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savedValueRef = useRef(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const isDirty = value !== savedValueRef.current;

  const doSave = useCallback(async (val: string) => {
    if (val === savedValueRef.current) return;
    setIsSaving(true);
    try {
      await onSaveRef.current(val);
      savedValueRef.current = val;
      setLastSaved(new Date());
    } catch {
      // silently fail - will retry on next change
    }
    setIsSaving(false);
  }, []);

  // Reset saved ref when value is externally set (e.g. switching problems)
  const resetSavedValue = useCallback((val: string) => {
    savedValueRef.current = val;
  }, []);

  useEffect(() => {
    if (!enabled || !isDirty) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => doSave(value), delay);
    return () => clearTimeout(timeoutRef.current);
  }, [value, enabled, isDirty, delay, doSave]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      // Can't await in cleanup, fire and forget
      if (savedValueRef.current !== value) {
        onSaveRef.current(value).catch(() => {});
      }
    };
  }, [value]);

  const triggerSave = useCallback(() => {
    clearTimeout(timeoutRef.current);
    doSave(value);
  }, [value, doSave]);

  return { isDirty, isSaving, lastSaved, triggerSave, resetSavedValue };
}
