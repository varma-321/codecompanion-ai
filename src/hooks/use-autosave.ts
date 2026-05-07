import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Debounced autosave hook. Calls `onSave` after `delay` ms of inactivity.
 * Returns { isDirty, isSaving, lastSaved, triggerSave, resetSavedValue }
 */
export function useAutosave(
  value: string,
  onSave: (value: string, key?: string) => Promise<void>,
  options: { delay?: number; maxDelay?: number; enabled?: boolean; key?: string } = {}
) {
  const { delay = 500, maxDelay, enabled = true, key } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const savedValueRef = useRef(value);
  const keyRef = useRef(key);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onSaveRef = useRef(onSave);
  
  onSaveRef.current = onSave;

  // Sync savedValueRef and clear timeouts IMMEDIATELY when key changes
  if (key !== keyRef.current) {
    clearTimeout(timeoutRef.current);
    clearTimeout(maxTimeoutRef.current);
    savedValueRef.current = value;
    keyRef.current = key;
  }

  const isDirty = value !== savedValueRef.current;

  const doSave = useCallback(async (val: string, saveKey?: string) => {
    if (val === savedValueRef.current || saveKey !== keyRef.current) return;
    
    setIsSaving(true);
    try {
      await onSaveRef.current(val, saveKey);
      if (saveKey === keyRef.current) {
        savedValueRef.current = val;
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error('Autosave failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const resetSavedValue = useCallback((val: string) => {
    savedValueRef.current = val;
    clearTimeout(timeoutRef.current);
    clearTimeout(maxTimeoutRef.current);
    maxTimeoutRef.current = undefined;
  }, []);

  useEffect(() => {
    if (!enabled || !isDirty) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
      return;
    }
    
    const currentKey = key;

    // Debounce timer
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = undefined;
      doSave(value, currentKey);
    }, delay);

    // Max delay timer (throttle)
    if (maxDelay && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        doSave(value, currentKey);
        // doSave will update savedValueRef, so the next render will clear the timeout
      }, maxDelay);
    }
    
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [value, enabled, isDirty, delay, maxDelay, doSave, key]);

  // Handle unmount
  useEffect(() => {
    const unmountKey = key;
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(maxTimeoutRef.current);
      if (savedValueRef.current !== value && keyRef.current === unmountKey) {
        onSaveRef.current(value, unmountKey).catch(() => {});
      }
    };
  }, [value, key]);

  const triggerSave = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(maxTimeoutRef.current);
    doSave(value, key);
  }, [value, doSave, key]);

  return { isDirty, isSaving, lastSaved, triggerSave, resetSavedValue };
}
