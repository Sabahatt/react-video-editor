import { memo, useCallback } from "react";
import useLayoutStore from "./store/use-layout-store";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from "@/components/ui/drawer";
import { MenuItem } from "./menu-item/menu-item";
import { useIsLargeScreen } from "@/hooks/use-media-query";

// Define menu items configuration for better maintainability
const MENU_ITEMS = [
  {
    id: "media",
    icon: Icons.upload,
    label: "Media",
    ariaLabel: "Add and manage media"
  },
  {
    id: "ai-video",
    icon: Icons.smart,
    label: "AI Video",
    ariaLabel: "Generate video from image using AI"
  },
  {
    id: "ai-voice",
    icon: Icons.volume,
    label: "AI Voice",
    ariaLabel: "Generate AI voice from text"
  },
  {
    id: "stock-video",
    icon: Icons.video,
    label: "Stock Video",
    ariaLabel: "Add stock videos"
  },
  {
    id: "stock-image",
    icon: Icons.image,
    label: "Stock Image",
    ariaLabel: "Add stock images"
  },
  {
    id: "stock-audio",
    icon: Icons.audio,
    label: "Stock Audio",
    ariaLabel: "Add stock audio"
  },
  {
    id: "texts",
    icon: Icons.type,
    label: "Texts",
    ariaLabel: "Add and edit text elements"
  },
  {
    id: "transitions",
    icon: Icons.transition,
    label: "Transitions",
    ariaLabel: "Add transition effects"
  }
] as const;

// Memoized menu button component for better performance
const MenuButton = memo<{
  item: (typeof MENU_ITEMS)[number];
  isActive: boolean;
  onClick: (menuItem: string) => void;
}>(({ item, isActive, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(item.id);
  }, [item.id, onClick]);

  const IconComponent = item.icon;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all duration-200 w-12",
        isActive
          ? "bg-gradient-to-b from-[#fb923c]/20 to-[#fb923c]/5 text-[#fb923c] shadow-[0_0_12px_rgba(251,146,60,0.15)]"
          : "text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/5"
      )}
      aria-label={item.ariaLabel}
      aria-pressed={isActive}
    >
      {IconComponent ? <IconComponent width={18} height={18} /> : null}
      <span className="text-[9px] font-medium">{item.label}</span>
    </button>
  );
});

MenuButton.displayName = "MenuButton";

// Main MenuList component
function MenuList() {
  const {
    setActiveMenuItem,
    setShowMenuItem,
    activeMenuItem,
    showMenuItem,
    drawerOpen,
    setDrawerOpen
  } = useLayoutStore();

  const isLargeScreen = useIsLargeScreen();

  const handleMenuItemClick = useCallback(
    (menuItem: string) => {
      setActiveMenuItem(menuItem as any);
      // Use drawer on mobile, sidebar on desktop
      if (!isLargeScreen) {
        setDrawerOpen(true);
      } else {
        setShowMenuItem(true);
      }
    },
    [isLargeScreen, setActiveMenuItem, setDrawerOpen, setShowMenuItem]
  );

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      setDrawerOpen(open);
    },
    [setDrawerOpen]
  );

  return (
    <>
      <nav
        className="flex w-[60px] flex-col items-center gap-0.5 py-2 border-r border-white/[0.04] bg-gradient-to-b from-[#f472b6]/[0.02] via-transparent to-[#fb923c]/[0.02] relative"
        role="toolbar"
        aria-label="Editor tools"
      >
        {/* Subtle gradient accent on right border */}
        <div
          className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(244,114,182,0.25) 0%, rgba(251,146,60,0.15) 50%, rgba(244,114,182,0.25) 100%)"
          }}
        />
        {MENU_ITEMS.map((item) => {
          const isActive =
            (drawerOpen && activeMenuItem === item.id) ||
            (showMenuItem && activeMenuItem === item.id);

          return (
            <MenuButton
              key={item.id}
              item={item}
              isActive={isActive}
              onClick={handleMenuItemClick}
            />
          );
        })}
      </nav>

      {/* Drawer only on mobile/tablet - conditionally mounted */}
      {!isLargeScreen && (
        <Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
          <DrawerContent className="max-h-[80vh] glass-panel-glow">
            <DrawerHeader>
              <DrawerTitle className="capitalize text-zinc-200">{activeMenuItem}</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-auto">
              <MenuItem />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}

export default memo(MenuList);
