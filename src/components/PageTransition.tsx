import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useRef, useEffect } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

const getDirection = (
  pathname: string,
  previousPathname: string
): "forward" | "backward" => {
  const normalizePath = (path: string) => {
    const parts = path.split("/");
    if (parts[1] === "games" && parts[2] && parts[2] !== "add") {
      return "/games/:id";
    }
    return path;
  };

  const hierarchy = ["/", "/games/:id", "/games/add", "/profile"];
  const normalizedCurrent = normalizePath(pathname);
  const normalizedPrevious = normalizePath(previousPathname);

  const currentIndex = hierarchy.indexOf(normalizedCurrent);
  const previousIndex = hierarchy.indexOf(normalizedPrevious);

  return currentIndex >= previousIndex ? "forward" : "backward";
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const previousPathname = useRef(location.pathname);
  const direction = getDirection(location.pathname, previousPathname.current);

  useEffect(() => {
    previousPathname.current = location.pathname;
  }, [location.pathname]);

  const variants = {
    enter: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: "forward" | "backward") => ({
      x: direction === "forward" ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <motion.div
      key={location.pathname}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
      }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}
