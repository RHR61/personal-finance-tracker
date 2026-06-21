import React, { useEffect, useState } from "react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function AnimatedCurrency({ value }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const difference = value - startValue;

    if (Math.abs(difference) < 0.01) {
      setDisplayValue(value);
      return undefined;
    }

    const duration = 500;
    const startedAt = performance.now();
    let animationFrame = 0;

    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;

      setDisplayValue(startValue + difference * easedProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    }

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  return currency.format(displayValue);
}
