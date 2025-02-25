import { useLocation, useNavigate } from "@tanstack/react-router";
import { motion, PanInfo } from "framer-motion";
import { useRef, useEffect } from "react";
import { navigation } from "@/lib/navigation";
interface PageTransitionProps {
  children: React.ReactNode;
}

// Get all possible paths from navigation
const hierarchy: string[] = [
  "/",
  ...navigation.map((item) => item.to),
  // Add any nested paths patterns here if needed
  // e.g. "/plans/:id", "/progress/:date", etc.
];

// Helper function to get parent path
const getParentPath = (path: string) => {
  const parentPath = navigation.find((item) => path.startsWith(item.to));
  return parentPath ? parentPath.to : path;
};

const getDirection = (
  pathname: string,
  previousPathname: string
): "forward" | "backward" => {
  const currentIndex = hierarchy.indexOf(pathname);
  const previousIndex = hierarchy.indexOf(previousPathname);

  // If path is not in hierarchy (likely a nested route),
  // compare against its parent route
  const effectiveCurrentIndex =
    currentIndex === -1
      ? hierarchy.indexOf(getParentPath(pathname))
      : currentIndex;

  const effectivePreviousIndex =
    previousIndex === -1
      ? hierarchy.indexOf(getParentPath(previousPathname))
      : previousIndex;

  return effectiveCurrentIndex >= effectivePreviousIndex
    ? "forward"
    : "backward";
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const previousPathname = useRef(location.pathname);
  const direction = getDirection(location.pathname, previousPathname.current);

  useEffect(() => {
    previousPathname.current = location.pathname;
  }, [location.pathname]);

  // iOS-like spring animation configuration - faster and snappier
  const springConfig = {
    type: "spring",
    mass: 0.8,
    stiffness: 250,
    damping: 25,
    restDelta: 0.001,
    restSpeed: 0.001,
  };

  const variants = {
    enter: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? "100%" : "-100%",
      opacity: 1,
      scale: 1,
      zIndex: direction === "forward" ? 1 : 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: 2,
    },
    exit: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? "-25%" : "25%",
      opacity: 0.85,
      scale: 0.95,
      zIndex: 0,
    }),
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const swipeThreshold = 100; // Minimum distance to trigger navigation
    const paths: string[] = [...navigation.map((item) => item.to)];
    const currentIndex = paths.indexOf(location.pathname);

    // If path is not in hierarchy, find its parent
    const effectiveCurrentIndex =
      currentIndex === -1
        ? paths.indexOf(getParentPath(location.pathname))
        : currentIndex;

    if (Math.abs(info.offset.x) > swipeThreshold) {
      // Swipe right to go back
      if (info.offset.x > 0 && effectiveCurrentIndex > 0) {
        navigate({ to: paths[effectiveCurrentIndex - 1] });
      }
      // Swipe left to go forward
      else if (info.offset.x < 0 && effectiveCurrentIndex < paths.length - 1) {
        navigate({ to: paths[effectiveCurrentIndex + 1] });
      }
    }
  };

  return (
    <motion.div
      key={location.pathname}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={springConfig}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.4}
      onDragEnd={handleDragEnd}
      className="h-full w-full touch-pan-y"
    >
      {children}
    </motion.div>
  );
}
