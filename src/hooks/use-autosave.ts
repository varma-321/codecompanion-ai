import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Debounced autosave hook. Calls `onSave` after `delay` ms of inactivity.
 * Returns { isDirty, isSaving, lastSaved, triggerSave, resetSavedValue }
 */
export function useAutosave(
  value: string,
  onSave: (value: string, key?: string) => Promise<void>,
  options: { delay?: number; enabled?: boolean; key?: string } = {}
) {
  const { delay = 500, enabled = true, key } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const savedValueRef = useRef(value);
  const keyRef = useRef(key);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onSaveRef = useRef(onSave);
  
  onSaveRef.current = onSave;

  // Sync savedValueRef and clear timeout IMMEDIATELY when key changes (during render)
  if (key !== keyRef.current) {
    clearTimeout(timeoutRef.current);
    savedValueRef.current = value;
    keyRef.current = key;
  }

  const isDirty = value !== savedValueRef.current;

  const doSave = useCallback(async (val: string, saveKey?: string) => {
    // Only save if it's still the same key and value is actually different
    if (val === savedValueRef.current || saveKey !== keyRef.current) return;
    
    setIsSaving(true);
    try {
      await onSaveRef.current(val, saveKey);
      // Double check key hasn't changed during the async call
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
  }, []);

  useEffect(() => {
    if (!enabled || !isDirty) return;
    
    clearTimeout(timeoutRef.current);
    const currentKey = key;
    
    timeoutRef.current = setTimeout(() => {
      doSave(value, currentKey);
    }, delay);
    
    return () => clearTimeout(timeoutRef.current);
  }, [value, enabled, isDirty, delay, doSave, key]);

  // Handle unmount - only save if still on the same key
  useEffect(() => {
    const unmountKey = key;
    return () => {
      clearTimeout(timeoutRef.current);
      if (savedValueRef.current !== value && keyRef.current === unmountKey) {
        // Use a background call as we can't await in cleanup
        onSaveRef.current(value, unmountKey).catch(() => {});
      }
    };
  }, [value, key]);

  const triggerSave = useCallback(() => {
    clearTimeout(timeoutRef.current);
    doSave(value, key);
  }, [value, doSave, key]);

  return { isDirty, isSaving, lastSaved, triggerSave, resetSavedValue };
}
