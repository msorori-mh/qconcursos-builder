import { useState, useEffect, useRef, ReactNode } from "react";

interface LazyMediaProps {
  children: ReactNode;
  placeholder?: ReactNode;
  rootMargin?: string;
  className?: string;
}

const LazyMedia = ({ children, placeholder, rootMargin = "200px", className }: LazyMediaProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : (placeholder || (
        <div className="flex items-center justify-center bg-muted rounded-2xl w-full h-full min-h-[200px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ))}
    </div>
  );
};

export default LazyMedia;
