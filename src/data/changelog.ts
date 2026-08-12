
export interface ChangelogEntry {
  version: string;
  date: string;
  features: {
    added?: string[];
    fixed?: string[];
    removed?: string[];
  };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.2",
    date: "2024-03-26",
    features: {
      added: [
        "Mini Player Overhaul: Completely redesigned with a large, square artwork style and soft corners to match the main player aesthetic.",
        "Synced Visualizer: The Mini Player visualizer now reacts to real-time audio data from the main engine instead of a simulation.",
        "Adaptive Colors: Mini Player UI and visualizer now glow dynamically based on the album art color.",
        "Smart Positioning: Mini Player now intelligently snaps to the bottom-right of your screen."
      ],
      fixed: [
        "Fixed synchronization issues where the Mini Player would sometimes show 'No Track'.",
        "Resolved an issue where the visualizer data stream would pause when switching windows."
      ]
    }
  },
  {
    version: "1.1.1",
    date: "2024-03-25",
    features: {
      added: [
        "Music Details Editor: Right-click any song in the Music Player to view full metadata.",
        "Album Support: Added Album field to track info and metadata parser.",
        "Copy to Clipboard: Quickly copy Artist or Album names from the details modal.",
        "Visual Enhancements: New glass-morphism modal for track details with blurry backdrops."
      ],
      fixed: [
        "Improved metadata extraction reliability for MP3 files.",
        "Fixed text truncation issues in the playlist view."
      ]
    }
  },
  {
    version: "1.1.0",
    date: "2024-03-24",
    features: {
      added: [
        "Smart Core AI: New intelligent resource manager that monitors FPS and system load.",
        "Zero-Resource Tray Mode: Completely suspends GPU rendering when minimized to Tray, focusing all CPU power on the audio engine.",
        "Context Awareness: Automatically optimizes memory by garbage collecting unused visualizers based on the active page.",
        "Low Power Mode: Automatically simplifies UI animations if the system struggles (FPS < 30)."
      ],
      fixed: [
        "Fixed High CPU Usage: Optimized the performance monitoring loop to run efficiently.",
        "Equalizer UI Overhaul: Fixed label overlapping and positioning issues for better readability.",
        "Visualizer Simulation Fix: Preview now works correctly in Settings regardless of background state."
      ]
    }
  },
  {
    version: "1.0.9",
    date: "2024-03-21",
    features: {
      added: [
        "Auto Update System: Automatically checks GitHub for new releases.",
        "Source Code Export: Get the full source code directly from Settings.",
        "Green Neon Update UI: A fresh look for update notifications.",
        "Delete from Disk: Deleting a sound now removes the file to save space.",
        "What's New Modal: See exactly what changed after every update."
      ],
      fixed: [
        "Fixed an issue where shortcuts wouldn't register on first launch.",
        "Improved mic injection latency.",
        "Minor UI glitches in dark mode."
      ]
    }
  }
];
