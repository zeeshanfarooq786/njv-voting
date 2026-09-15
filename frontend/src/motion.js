export const curtain = {
  initial: { clipPath: 'inset(0 0 100% 0)' },
  animate: { clipPath: 'inset(0 0 0% 0)', transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } },
  exit: { clipPath: 'inset(100% 0 0 0)', transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } },
}

export const iris = {
  initial: { clipPath: 'circle(0% at 50% 50%)' },
  animate: { clipPath: 'circle(140% at 50% 50%)', transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
  exit: { clipPath: 'circle(0% at 50% 50%)', transition: { duration: 0.5 } },
}

export const wipe = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } },
  exit: { x: '-100%', transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } },
}

export const letter = {
  hidden: { y: 40, opacity: 0, rotateX: 70 },
  show: (i) => ({
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: { delay: 0.9 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
}

export const cardIn = {
  hidden: { y: 80, opacity: 0, rotateX: 18, scale: 0.92 },
  show: (i) => ({
    y: 0,
    opacity: 1,
    rotateX: 0,
    scale: 1,
    transition: { delay: 0.05 * i, type: 'spring', stiffness: 280, damping: 18, mass: 0.7 },
  }),
}

export const fadeUp = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}
