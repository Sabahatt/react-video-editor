import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import { DESIGN_RESIZE } from "@designcombo/state";
import { Icons } from "@/components/shared/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  ChevronDown,
  Download,
  ProportionsIcon,
  ShareIcon,
  CloudIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

import type StateManager from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import type { IDesign } from "@designcombo/types";
import { useDownloadState } from "./store/use-download-state";
import DownloadProgressModal from "./download-progress-modal";
import AutosizeInput from "@/components/ui/autosize-input";
import { debounce } from "lodash";
import {
  useIsLargeScreen,
  useIsMediumScreen,
  useIsSmallScreen
} from "@/hooks/use-media-query";

import { LogoIcons } from "@/components/shared/logos";
import Link from "next/link";

interface AutoSaveStatus {
  lastSaved: Date | null;
  saving: boolean;
  error: string | null;
}

export default function Navbar({
  user,
  stateManager,
  setProjectName,
  projectName,
  autoSaveStatus,
  onManualSave
}: {
  user: any | null;
  stateManager: StateManager;
  setProjectName: (name: string) => void;
  projectName: string;
  autoSaveStatus?: AutoSaveStatus;
  onManualSave?: () => void;
}) {
  const [title, setTitle] = useState(projectName);
  const isLargeScreen = useIsLargeScreen();
  const isMediumScreen = useIsMediumScreen();
  const isSmallScreen = useIsSmallScreen();

  // Create a debounced function for setting the project name
  const debouncedSetProjectName = useCallback(
    debounce((name: string) => {
      console.log("Debounced setProjectName:", name);
      setProjectName(name);
    }, 2000), // 2 seconds delay
    []
  );

  // Update the debounced function whenever the title changes
  useEffect(() => {
    debouncedSetProjectName(title);
  }, [title, debouncedSetProjectName]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isLargeScreen ? "320px 1fr 320px" : "1fr 1fr 1fr"
      }}
      className="glass-panel-darker pointer-events-none flex h-11 items-center px-2 relative bg-gradient-to-r from-[#f472b6]/[0.03] via-transparent to-[#fb923c]/[0.03]"
    >
      {/* Subtle gradient line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(244,114,182,0.3) 30%, rgba(251,146,60,0.3) 70%, transparent 100%)"
        }}
      />
      <DownloadProgressModal />

      <div className="flex items-center gap-2 pointer-events-auto">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold tracking-tight uppercase bg-gradient-to-r from-[#fb923c] to-[#f472b6] bg-clip-text text-transparent hover:opacity-80 transition-opacity">
            Adify
          </span>
        </Link>
      </div>

      <div className="flex h-11 items-center justify-center gap-2">
        {!isSmallScreen && (
          <div className=" pointer-events-auto flex h-10 items-center gap-2 rounded-md px-2.5 text-muted-foreground">
            <AutosizeInput
              name="title"
              value={title}
              onChange={handleTitleChange}
              width={200}
              inputClassName="border-none outline-none px-1 bg-background text-sm font-medium text-zinc-200"
            />
            {autoSaveStatus && (
              <AutoSaveIndicator status={autoSaveStatus} onManualSave={onManualSave} />
            )}
          </div>
        )}
      </div>

      <div className="flex h-11 items-center justify-end gap-2">
        <div className=" pointer-events-auto flex h-10 items-center gap-2 rounded-md px-2.5">
          {/* <Link href="https://discord.gg/Jmxsd5f2jp" target="_blank">
            <Button className="h-7 rounded-lg border-white/[0.08] hover:border-[#fb923c]/30 hover:bg-[#fb923c]/10 hover:text-[#fb923c]" variant={"outline"}>
              <LogoIcons.discord className="w-6 h-6" />
              <span className="hidden md:block">Join Us</span>
            </Button>
          </Link> */}
          {/* <Button
            className="flex h-7 gap-1 border-white/[0.08] hover:border-[#fb923c]/30 hover:bg-[#fb923c]/10 hover:text-[#fb923c]"
            variant="outline"
            size={isMediumScreen ? "sm" : "icon"}
          >
            <ShareIcon width={18} />{" "}
            <span className="hidden md:block">Share</span>
          </Button> */}

          <DownloadPopover stateManager={stateManager} />
        </div>
      </div>
    </div>
  );
}

const DownloadPopover = ({ stateManager }: { stateManager: StateManager }) => {
  const isMediumScreen = useIsMediumScreen();
  const { actions, exportType } = useDownloadState();
  const [isExportTypeOpen, setIsExportTypeOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const handleExport = () => {
    const data: IDesign = {
      id: generateId(),
      ...stateManager.toJSON()
    };

    console.log({ data });

    // Handle JSON export - direct download
    if (exportType === "json") {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ad-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOpen(false);
      return;
    }

    // MP4 export - use render pipeline
    actions.setState({ payload: data });
    actions.startExport();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="flex h-7 gap-1 bg-gradient-to-r from-[#fb923c] to-[#f472b6] text-white hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] transition-all duration-300"
          size={isMediumScreen ? "sm" : "icon"}
        >
          <Download width={18} />{" "}
          <span className="hidden md:block">Export</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[250] flex w-56 flex-col gap-3 p-3"
      >
        <Label className="text-zinc-200 text-sm">Export settings</Label>

        <Popover open={isExportTypeOpen} onOpenChange={setIsExportTypeOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm bg-white/[0.03] border border-white/[0.08] hover:border-[#fb923c]/30 hover:bg-[#fb923c]/5 transition-colors">
              <span>{exportType.toUpperCase()}</span>
              <ChevronDown width={14} className="text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            className="z-[251] w-[var(--radix-popover-trigger-width)] min-w-full p-1 bg-[#271e19]/95 backdrop-blur-xl border border-[#fb923c]/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(251,146,60,0.1)]"
          >
            <div
              className={`flex h-8 items-center rounded-lg px-3 text-sm cursor-pointer transition-all duration-150 ${exportType === "mp4" ? "bg-[#fb923c]/15 text-[#fb923c]" : "text-white/60 hover:bg-[#fb923c]/10 hover:text-[#fb923c]"}`}
              onClick={() => {
                actions.setExportType("mp4");
                setIsExportTypeOpen(false);
              }}
            >
              MP4
            </div>
            <div
              className={`flex h-8 items-center rounded-lg px-3 text-sm cursor-pointer transition-all duration-150 ${exportType === "json" ? "bg-[#fb923c]/15 text-[#fb923c]" : "text-white/60 hover:bg-[#fb923c]/10 hover:text-[#fb923c]"}`}
              onClick={() => {
                actions.setExportType("json");
                setIsExportTypeOpen(false);
              }}
            >
              JSON
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={handleExport} className="w-full bg-gradient-to-r from-[#fb923c] to-[#f472b6] text-white hover:shadow-[0_0_15px_rgba(251,146,60,0.3)] h-9">
          Export
        </Button>
      </PopoverContent>
    </Popover>
  );
};

interface ResizeOptionProps {
  label: string;
  icon: string;
  value: ResizeValue;
  description: string;
}

interface ResizeValue {
  width: number;
  height: number;
  name: string;
}

const RESIZE_OPTIONS: ResizeOptionProps[] = [
  {
    label: "16:9",
    icon: "landscape",
    description: "YouTube ads",
    value: {
      width: 1920,
      height: 1080,
      name: "16:9"
    }
  },
  {
    label: "9:16",
    icon: "portrait",
    description: "TikTok, YouTube Shorts",
    value: {
      width: 1080,
      height: 1920,
      name: "9:16"
    }
  },
  {
    label: "1:1",
    icon: "square",
    description: "Instagram, Facebook posts",
    value: {
      width: 1080,
      height: 1080,
      name: "1:1"
    }
  }
];

const ResizeVideo = () => {
  const handleResize = (options: ResizeValue) => {
    dispatch(DESIGN_RESIZE, {
      payload: {
        ...options
      }
    });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="z-10 h-7 gap-2" variant="outline" size={"sm"}>
          <ProportionsIcon className="h-4 w-4" />
          <div>Resize</div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[250] w-60 px-2.5 py-3 bg-[#0a0a0a]/95 backdrop-blur-xl border-white/[0.08]">
        <div className="text-sm">
          {RESIZE_OPTIONS.map((option, index) => (
            <ResizeOption
              key={index}
              label={option.label}
              icon={option.icon}
              value={option.value}
              handleResize={handleResize}
              description={option.description}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ResizeOption = ({
  label,
  icon,
  value,
  description,
  handleResize
}: ResizeOptionProps & { handleResize: (payload: ResizeValue) => void }) => {
  const Icon = Icons[icon as "text"];
  return (
    <div
      onClick={() => handleResize(value)}
      className="flex cursor-pointer items-center rounded-md p-2 hover:bg-[#fb923c]/10 hover:text-[#fb923c] transition-colors"
    >
      <div className="w-8 text-muted-foreground">
        <Icon size={20} />
      </div>
      <div>
        <div className="text-zinc-200">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
};

const AutoSaveIndicator = ({
  status,
  onManualSave
}: {
  status: AutoSaveStatus;
  onManualSave?: () => void;
}) => {
  const formatTime = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10"
            onClick={onManualSave}
          >
            {status.saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : status.error ? (
              <>
                <AlertCircle className="h-3 w-3 text-red-400" />
                <span className="hidden sm:inline text-red-400">Error</span>
              </>
            ) : status.lastSaved ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-[#fb923c]" />
                <span className="hidden sm:inline">{formatTime(status.lastSaved)}</span>
              </>
            ) : (
              <>
                <CloudIcon className="h-3 w-3" />
                <span className="hidden sm:inline">Auto-save</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[#0a0a0a]/95 backdrop-blur-xl border-white/[0.08]">
          <div className="text-xs">
            {status.saving ? (
              "Saving to disk..."
            ) : status.error ? (
              <span className="text-red-400">Save failed: {status.error}</span>
            ) : status.lastSaved ? (
              <>
                <div>Last saved: {status.lastSaved.toLocaleTimeString()}</div>
                <div className="text-muted-foreground">Click to save now</div>
              </>
            ) : (
              "Auto-save enabled (every 30s)"
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
