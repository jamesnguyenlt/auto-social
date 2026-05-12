import { useState, useCallback } from 'react';

export function useAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);

  const animate = useCallback((fn: () => void) => {
    setIsAnimating(true);
    fn();
    setTimeout(() => setIsAnimating(false), 300);
  }, []);

  return { isAnimating, animate };
}

export function useSpring(initialValue: number, config?: { stiffness?: number; damping?: number }) {
  const [value, setValue] = useState(initialValue);

  // Simple spring-like interpolation
  const springTo = useCallback((target: number) => {
    const stiffness = config?.stiffness || 120;
    const damping = config?.damping || 20;
    
    let current = value;
    const animate = () => {
      const diff = target - current;
      const step = diff * (stiffness / 100);
      current += step / (damping / 10);
      
      if (Math.abs(diff) > 0.01) {
        setValue(current);
        requestAnimationFrame(animate);
      } else {
        setValue(target);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, config]);

  return { value, setValue, springTo };
}