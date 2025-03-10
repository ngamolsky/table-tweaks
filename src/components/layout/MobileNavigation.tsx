import { Link, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { navigation } from "@/lib/navigation";

export function MobileNavigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    // For home route ("/"), only return true if it's an exact match
    if (path === "/") {
      return location.pathname === path;
    }
    // For other routes, keep the existing behavior
    return location.pathname.startsWith(path);
  };

  // iOS-like spring config for tab animations
  const springConfig = {
    type: "spring",
    mass: 0.4,
    stiffness: 350,
    damping: 25,
  };

  return (
    <nav className="border-t h-[83px] fixed bottom-0 left-0 right-0 bg-background">
      <div className="flex h-full">
        {navigation.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.name}
              to={item.to}
              className={`relative flex flex-col items-center justify-center flex-1`}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: active ? 1.1 : 1,
                  y: active ? -1 : 0,
                }}
                transition={springConfig}
                className="relative"
              >
                {/* Icon background glow effect */}
                {active && (
                  <motion.div
                    layoutId={`${item.name}-glow`}
                    className="absolute inset-0 bg-current opacity-10 blur-sm rounded-full scale-150"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
                <item.icon className="h-6 w-6" />
              </motion.div>
              <motion.span
                initial={false}
                animate={{
                  scale: active ? 1.05 : 1,
                  y: active ? -1 : 0,
                }}
                transition={springConfig}
                className="text-[11px] font-medium mt-1"
              >
                {item.name}
              </motion.span>
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-current"
                    initial={{ opacity: 0, scaleX: 0.5 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.5 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
