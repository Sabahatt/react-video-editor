import { IAudio } from "@designcombo/types";

export const AUDIOS = [
  // === Background Music (Good for ads) ===
  {
    id: "xx1",
    details: {
      src: "https://cdn.designcombo.dev/audio/Dawn%20of%20change.mp3"
    },
    name: "Dawn of Change",
    type: "audio",
    metadata: {
      author: "Roman Senyk",
      mood: "Uplifting"
    }
  },
  {
    id: "xx2",
    details: {
      src: "https://cdn.designcombo.dev/audio/Hope.mp3"
    },
    name: "Hope",
    type: "audio",
    metadata: {
      author: "Hugo Dujardin",
      mood: "Inspiring"
    }
  },
  {
    id: "xx3",
    details: {
      src: "https://cdn.designcombo.dev/audio/Tenderness.mp3"
    },
    name: "Tenderness",
    type: "audio",
    metadata: {
      author: "Benjamin Tissot",
      mood: "Soft"
    }
  },
  {
    id: "xx4",
    details: {
      src: "https://cdn.designcombo.dev/audio/Piano%20Moment.mp3"
    },
    name: "Piano Moment",
    type: "audio",
    metadata: {
      author: "Benjamin Tissot",
      mood: "Elegant"
    }
  },
] as Partial<IAudio>[];
