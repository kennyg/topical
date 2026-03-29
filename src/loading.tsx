import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface LoadingContextType {
  isNavigating: boolean;
  startNavigating: () => void;
  stopNavigating: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isNavigating: false,
  startNavigating: () => {},
  stopNavigating: () => {},
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const startNavigating = useCallback(() => setIsNavigating(true), []);
  const stopNavigating = useCallback(() => setIsNavigating(false), []);

  return (
    <LoadingContext.Provider value={{ isNavigating, startNavigating, stopNavigating }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  return useContext(LoadingContext);
}

export function NavigationProgress() {
  const { isNavigating } = useContext(LoadingContext);
  if (!isNavigating) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
      <div className="h-full bg-primary animate-progress-bar" />
    </div>
  );
}
