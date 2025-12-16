import {
  Resizable,
  ResizableProps,
  Pattern,
  util,
  Control
} from "@designcombo/timeline";
import { createResizeControls } from "../controls";

interface ImageProps extends ResizableProps {
  src: string;
}

class Image extends Resizable {
  static type = "Image";
  public src: string;
  public hasSrc = true;

  static createControls(): { controls: Record<string, Control> } {
    return { controls: createResizeControls() };
  }

  constructor(props: ImageProps) {
    super(props);
    this.id = props.id;
    this.src = props.src;
    this.display = props.display;
    this.tScale = props.tScale;
    this.loadImage();
  }

  public _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    this.drawGradientOverlay(ctx);
    this.updateSelected(ctx);
  }

  public drawGradientOverlay(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Create gradient overlay from coral/pink for premium feel
    const gradient = ctx.createLinearGradient(
      -this.width / 2,
      -this.height / 2,
      this.width / 2,
      this.height / 2
    );
    gradient.addColorStop(0, "rgba(251, 146, 60, 0.1)"); // Coral start
    gradient.addColorStop(0.5, "rgba(244, 114, 182, 0.08)"); // Pink middle
    gradient.addColorStop(1, "rgba(251, 146, 60, 0.1)"); // Coral end

    // Draw rounded rect with gradient
    ctx.beginPath();
    ctx.roundRect(
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height,
      4
    );
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }

  public loadImage() {
    util.loadImage(this.src).then((img) => {
      const imgHeight = img.height;
      const rectHeight = this.height;
      const scaleY = rectHeight / imgHeight;
      const pattern = new Pattern({
        source: img,
        repeat: "repeat-x",
        patternTransform: [scaleY, 0, 0, scaleY, 0, 0]
      });
      this.set("fill", pattern);
      this.canvas?.requestRenderAll();
    });
  }

  public setSrc(src: string) {
    this.src = src;
    this.loadImage();
    this.canvas?.requestRenderAll();
  }

  public updateSelected(ctx: CanvasRenderingContext2D) {
    const borderWidth = 2;
    const innerRadius = 4;

    ctx.save();

    // Add glow effect when selected
    if (this.isSelected) {
      ctx.shadowColor = "rgba(251, 146, 60, 0.6)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    const borderColor = this.isSelected
      ? "rgba(251, 146, 60, 1.0)"
      : "rgba(244, 114, 182, 0.3)";

    ctx.fillStyle = borderColor;

    // Create a path for the outer rectangle (no radius)
    ctx.beginPath();
    ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Create a path for the inner rectangle with rounded corners (the hole)
    ctx.roundRect(
      -this.width / 2 + borderWidth,
      -this.height / 2 + borderWidth,
      this.width - borderWidth * 2,
      this.height - borderWidth * 2,
      innerRadius
    );

    // Use even-odd fill rule to create the border effect
    ctx.fill("evenodd");
    ctx.restore();
  }
}

export default Image;
