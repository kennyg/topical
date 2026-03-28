import { useState, useEffect, useRef, type RefObject } from "react";
import { onRateLimitChange, type RateLimit } from "./github";

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useInfiniteScroll(
  onIntersect: () => void,
  enabled: boolean
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) callbackRef.current();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [enabled]);

  return ref;
}

export function useRateLimit(): RateLimit | null {
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);

  useEffect(() => {
    return onRateLimitChange(setRateLimit);
  }, []);

  return rateLimit;
}
