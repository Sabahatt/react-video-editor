import { useEffect, useRef, useState, useCallback } from "react";
import { TextAnimated } from "./animated/text-animated";
import { ITextDetails } from "@designcombo/types";
import { dispatch } from "@designcombo/events";
import { ENTER_EDIT_MODE } from "@designcombo/state";

const TextLayer: React.FC<{
  id: string;
  content: string;
  onChange?: (id: string, content: string) => void;
  onBlur?: (id: string, content: string) => void;
  style?: React.CSSProperties;
  editable?: boolean;
  fps: number;
  textAnimationNameIn: string;
  textAnimationNameOut: string;
  textAnimationNameLoop: string;
  details: ITextDetails;
  animationTextInFrames: number;
  animationTextOutFrames: number;
  animationTextLoopFrames: number;
  durationInFrames: number;
  animationFonts: { fontFamily: string; url: string }[];
}> = ({
  id,
  content,
  editable,
  style = {},
  onChange,
  onBlur,
  fps,
  textAnimationNameIn,
  textAnimationNameOut,
  textAnimationNameLoop,
  details,
  animationTextInFrames,
  animationTextOutFrames,
  animationTextLoopFrames,
  durationInFrames,
  animationFonts
}) => {
  const [data, setData] = useState(content);
  const divRef = useRef<HTMLDivElement>(null);

  const exitEditMode = useCallback(() => {
    dispatch(ENTER_EDIT_MODE, {
      payload: { id: null }
    });
  }, []);

  useEffect(() => {
    if (editable && divRef.current) {
      const element = divRef.current;
      element.focus();
      // Place cursor at end instead of selecting all (industry standard)
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false); // Collapse to END
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      const selection = window.getSelection();
      selection?.removeAllRanges();
    }
  }, [editable]);

  useEffect(() => {
    if (data !== content) {
      setData(content);
    }
  }, [content]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      exitEditMode();
    }
  }, [exitEditMode]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    if (divRef.current) {
      onChange?.(id, divRef.current.innerText);
    }
  }, [id, onChange]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);
  return (
    <div
      data-text-id={id}
      ref={divRef}
      contentEditable={editable}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onInput={(ev) => onChange?.(id, (ev.target as any).innerText)}
      onBlur={(ev) => onBlur?.(id, (ev.target as any).innerText)}
      style={{
        minHeight: "1em",
        boxShadow: editable ? "0 0 0 2px rgba(251, 146, 60, 0.5)" : "none",
        outline: "none",
        borderRadius: editable ? "2px" : undefined,
        ...style,
        pointerEvents: editable ? "auto" : "none",
        whiteSpace: "pre-line",
        width: "100%"
      }}
      suppressContentEditableWarning
      className="designcombo_textLayer"
    >
      {!editable ? (
        <TextAnimated
          textAnimationNameIn={textAnimationNameIn}
          textAnimationNameOut={textAnimationNameOut}
          textAnimationNameLoop={textAnimationNameLoop}
          text={content}
          fps={fps}
          details={details}
          animationTextInFrames={animationTextInFrames}
          animationTextOutFrames={animationTextOutFrames}
          animationTextLoopFrames={animationTextLoopFrames}
          durationInFrames={durationInFrames}
          animationFonts={animationFonts}
        />
      ) : (
        content
      )}
    </div>
  );
};

export default TextLayer;
