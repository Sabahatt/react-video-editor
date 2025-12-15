import { useRef, useState } from "react";
import useDataState from "../../store/use-data-state";
import { SearchIcon, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Draggable from "react-draggable";
import useLayoutStore from "../../store/use-layout-store";
import useClickOutside from "../../hooks/useClickOutside";
import { ICompactFont, IFont } from "../../interfaces/editor";
import { loadFonts } from "../../utils/fonts";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";

export const onChangeFontFamily = async (
  font: ICompactFont,
  trackItem: ITrackItem
) => {
  const fontName = font.default.postScriptName;
  const fontUrl = font.default.url;

  await loadFonts([
    {
      name: fontName,
      url: fontUrl
    }
  ]);

  dispatch(EDIT_OBJECT, {
    payload: {
      [trackItem?.id as string]: {
        details: {
          fontFamily: fontName,
          fontUrl: fontUrl
        }
      }
    }
  });
};
export default function FontFamilyPicker() {
  const { compactFonts } = useDataState();
  const [search, setSearch] = useState("");
  const { setFloatingControl, trackItem } = useLayoutStore();

  const filteredFonts = compactFonts.filter((font) =>
    font.family.toLowerCase().includes(search.toLowerCase())
  );

  const floatingRef = useRef<HTMLDivElement>(null);
  useClickOutside(floatingRef as React.RefObject<HTMLElement>, () =>
    setFloatingControl("")
  );

  return (
    <div
      ref={floatingRef}
      className="absolute right-2 top-2 z-[200] w-56 glass-panel-glow rounded-xl p-0 glow-mixed"
    >
      <div className="handle flex cursor-grab justify-between px-3 py-4 border-b border-white/[0.04]">
        <p className="text-sm font-bold text-gradient">Fonts</p>
        <div className="h-4 w-4" onClick={() => setFloatingControl("")}>
          <X className="h-4 w-4 cursor-pointer font-extrabold text-muted-foreground hover:text-[#00d8d6] transition-colors" />
        </div>
      </div>
      <div className="flex items-center px-3 py-2 border-b border-white/[0.04]">
        <SearchIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search font..."
          className="w-full rounded-md bg-transparent p-1 text-sm text-muted-foreground outline-none placeholder:text-white/30 focus:text-zinc-200"
        />
      </div>
      <ScrollArea className="h-[400px] w-full py-2">
        {filteredFonts.length > 0 ? (
          filteredFonts.map((font, index) => (
            <div
              key={index}
              onClick={() => {
                if (trackItem) {
                  onChangeFontFamily(font, trackItem);
                }
              }}
              className="cursor-pointer px-2 py-1 hover:bg-[#00d8d6]/10 transition-colors"
            >
              <img
                style={{ filter: "invert(100%)" }}
                src={font.default.preview}
                alt={font.family}
              />
            </div>
          ))
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No font found
          </p>
        )}
      </ScrollArea>
    </div>
  );
}
