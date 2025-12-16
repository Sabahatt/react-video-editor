import TimelineBase from "@designcombo/timeline";
import Video from "./video";
import { throttle } from "lodash";
import Audio from "./audio";
import { TimelineOptions } from "@designcombo/timeline";
import { ITimelineScaleState, ITrack } from "@designcombo/types";

// Track type priority - lower number = higher position (top of timeline)
const TRACK_TYPE_PRIORITY: Record<string, number> = {
  text: 1,
  caption: 2,
  image: 3,
  video: 4,
  main: 5,
  template: 6,
  composition: 7,
  helper: 8,
  illustration: 9,
  shape: 10,
  rect: 11,
  progressBar: 12,
  progressSquare: 13,
  progressFrame: 14,
  audio: 100, // Audio at the bottom
  radialAudioBars: 101,
  linealAudioBars: 102,
  waveAudioBars: 103,
  hillAudioBars: 104,
};

class Timeline extends TimelineBase {
  public isShiftKey: boolean = false;
  public isCtrlKey: boolean = false;
  constructor(
    canvasEl: HTMLCanvasElement,
    options: Partial<TimelineOptions> & {
      scale: ITimelineScaleState;
      duration: number;
      guideLineColor?: string;
    }
  ) {
    super(canvasEl, options); // Call the parent class constructor

    // Add shift/ctrl keyboard listener
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
      this.isShiftKey = true;
    }
    if (event.key === "Control") {
      this.isCtrlKey = true;
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Shift") {
      this.isShiftKey = false;
    }
    if (event.key === "Control") {
      this.isCtrlKey = false;
    }
  };

  public purge(): void {
    super.purge();

    // Cleanup event listener for Shift key
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  public setViewportPos(posX: number, posY: number) {
    const limitedPos = this.getViewportPos(posX, posY);
    const vt = this.viewportTransform;
    vt[4] = limitedPos.x;
    vt[5] = limitedPos.y;
    this.requestRenderAll();
    this.setActiveTrackItemCoords();
    this.onScrollChange();

    this.onScroll?.({
      scrollTop: limitedPos.y,
      scrollLeft: limitedPos.x - this.spacing.left
    });
  }

  public onScrollChange = throttle(async () => {
    const objects = this.getObjects();
    const viewportTransform = this.viewportTransform;
    const scrollLeft = viewportTransform[4];
    for (const object of objects) {
      if (object instanceof Video || object instanceof Audio) {
        object.onScrollChange({ scrollLeft });
      }
    }
  }, 250);

  public scrollTo({
    scrollLeft,
    scrollTop
  }: {
    scrollLeft?: number;
    scrollTop?: number;
  }): void {
    const vt = this.viewportTransform; // Create a shallow copy
    let hasChanged = false;

    if (typeof scrollLeft === "number") {
      vt[4] = -scrollLeft + this.spacing.left;
      hasChanged = true;
    }
    if (typeof scrollTop === "number") {
      vt[5] = -scrollTop;
      hasChanged = true;
    }

    if (hasChanged) {
      this.viewportTransform = vt;
      this.getActiveObject()?.setCoords();
      this.onScrollChange();
      this.requestRenderAll();
    }
  }

  // Sort tracks so video/image appear above audio
  public sortTracksByType(): void {
    this.tracks.sort((a: ITrack, b: ITrack) => {
      const priorityA = TRACK_TYPE_PRIORITY[a.type] ?? 50;
      const priorityB = TRACK_TYPE_PRIORITY[b.type] ?? 50;
      return priorityA - priorityB;
    });
    this.renderTracks();
    this.refreshTrackLayout();
    this.alignItemsToTrack();
  }
}

export default Timeline;
