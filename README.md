
<div align="center">

  <img src="./public/assets/icons/app-icon.png" alt="NeonRed Logo" width="140" />

  # ⚡ NeonRed Soundpad
  
  **The Ultimate High-Performance Audio Command Center for Windows**
  
  <p>
    <a href="https://github.com/RADINMNX2/neonred-soundpad/releases/latest">
      <img src="https://img.shields.io/github/v/release/RADINMNX2/neonred-soundpad?style=for-the-badge&color=ef4444&label=LATEST%20VERSION" alt="Version" />
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/platform-Windows_10_%2F_11-0078D6?style=for-the-badge&logo=windows" alt="Platform" />
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
    </a>
  </p>

  <p align="center">
    <a href="#-features">Features</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-setup-guide">Setup Guide</a> •
    <a href="#-development">Development</a>
  </p>
</div>

---

## 🌪️ What is NeonRed?

**NeonRed Soundpad** is not just a soundboard; it's a complete audio engine designed for **Streamers, Gamers, and content creators**. 

It allows you to inject high-quality music and sound effects directly into your microphone stream (Discord, Teamspeak, Games) without replacing your microphone driver. Built with a stunning **Neon Glassmorphism UI**, it features real-time audio processing, smart resource management, and zero-latency playback.

---

## 💎 Features

### 🎧 Professional Audio Engine
*   **Mic Injection:** Play sounds directly into voice chat using VB-Cable technology.
*   **Dual Output:** Hear the music yourself (Monitor) while sending it to others (Injector).
*   **Real-Time DSP:** Built-in **Compressor**, **Noise Gate**, **Echo Cancellation**, and **10-Band EQ** to make your voice sound studio-quality.
*   **Format Support:** Plays MP3, WAV, FLAC, OGG, and extracts audio from MP4/WebM videos instantly.

### 🚀 Smart Core AI & Performance
*   **Zero-Resource Tray Mode:** When minimized to tray, the UI rendering engine suspends completely (0% GPU usage) while audio keeps playing.
*   **Smart Context Awareness:** Automatically optimizes memory usage based on the active page.
*   **Low Power Mode:** Dynamically simplifies animations if your system is under heavy load (FPS < 30).

### 🎨 Visualizer Studio & UI
*   **Synced Visualizer:** Mini Player visualizer now syncs perfectly with the main engine in real-time.
*   **Neon Aesthetics:** A beautiful dark-mode interface with red neon glows and glass-morphism effects.
*   **Color Adaptation:** The UI automatically extracts colors from album art to match the vibe.

### 🎹 Advanced Control
*   **Music Library:** Full-featured music player with playlist support and shuffle/repeat.
*   **Mini Player:** Redesigned compact mode with large artwork and synchronized visualizer.
*   **Global Hotkeys:** Trigger sounds instantly from any game or application.
*   **Audio Trimming:** Built-in editor to set start/end points for any sound.

### 🌍 Localization
*   **Multi-Language:** Fully translated into **English** and **Persian (Farsi)** with RTL support.

---

## 📥 Installation

1.  Go to the [**Releases Page**](https://github.com/RADINMNX2/neonred-soundpad/releases/latest).
2.  Download the latest `.exe` installer (e.g., `NeonRed.SoundPad.Setup.1.3.4.exe`).
3.  Run the installer.
4.  The app will launch automatically.

---

## 🛠️ Setup Guide (Crucial!)

To let others hear your sounds, you need to configure the audio routing. The app includes a built-in **Help Guide**, but here is the summary:

### 1. Install Driver
Inside the app, go to **Help/Guide** and click **"Install Driver"** to install the **VB-CABLE** virtual driver.
> **Note:** Restart your computer after installing the driver.

### 2. Configure NeonRed (Settings Page)
*   **Microphone Input:** Select your *Real Microphone* (e.g., Blue Yeti, Headset Mic).
*   **Injector Output:** Select **CABLE Input (VB-Audio Virtual Cable)**.
*   **Monitor Output:** Select your *Headphones/Speakers* (so you can hear the sounds too).

### 3. Configure Discord / Games
Go to your target app (Discord, OBS, Valorant, etc.) and change the **Input Device**:
*   ❌ **Old:** Your Real Microphone.
*   ✅ **New:** **CABLE Output (VB-Audio Virtual Cable)**.

*Now, when you speak, NeonRed processes your voice and sends it to the Cable. When you play a sound, it mixes it into the Cable. Everyone hears both!*

---

## 💻 Development

Want to contribute or build it yourself?

```bash
# 1. Clone the repository
git clone https://github.com/RADINMNX2/neonred-soundpad.git

# 2. Enter the directory
cd neonred-soundpad

# 3. Install dependencies
npm install

# 4. Start in Development Mode (Hot Reloading)
npm run electron:dev
```

### Building the Executable
To create the `.exe` installer for distribution:

```bash
npm run dist
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 👤 Author

**RADINMNX**

*   Github: [@RADINMNX2](https://github.com/RADINMNX2)
*   Email: radinmnx@gmail.com

---

<div align="center">
  <sub>Built with ❤️ using React, Electron, and TailwindCSS.</sub>
</div>
