
<div align="center">

  <img src="./public/assets/icons/app-icon.png" alt="NeonRed Logo" width="120" />

  # ⚡ NeonRed Soundpad
  
  **The High-Performance, Low-Latency Soundboard for Windows**
  
  <p>
    <a href="https://github.com/RADINMNX2/neonred-soundpad/releases">
      <img src="https://img.shields.io/badge/version-1.0.4-ef4444?style=for-the-badge&logo=appveyor" alt="Version" />
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/platform-Windows-0078D6?style=for-the-badge&logo=windows" alt="Platform" />
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/built%20with-Electron%20%2B%20React-61DAFB?style=for-the-badge&logo=react" alt="Built With" />
    </a>
  </p>

  <p align="center">
    <a href="#key-features">Key Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#development">Development</a> •
    <a href="#download">Download</a>
  </p>
</div>

---

## 🚀 Overview

**NeonRed Soundpad** is a modern soundboard application designed for gamers, streamers, and content creators. Unlike traditional soundboards, NeonRed focuses on **audio routing architecture**, allowing you to inject sounds directly into your microphone input (via VB-Cable) while maintaining crystal clear voice quality with real-time DSP effects.

It features a sleek **Black & Neon Red** aesthetic, inspired by modern gaming interfaces.

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🎙️ Mic Injection** | Route audio directly to voice chats (Discord, Games) without replacing your mic. |
| **🎛️ Real-Time DSP** | Built-in **Compressor**, **Noise Gate**, **Echo Cancellation**, and **EQ** for your voice. |
| **⚡ Global Hotkeys** | Trigger sounds instantly from any application or game. |
| **🎧 Dual Output** | Hear the sounds yourself (Monitor) while injecting them for others (Injector). |
| **🎨 Modern UI** | A beautiful React-based interface with smooth animations and a neon dark mode. |
| **✂️ Audio Trimming** | Built-in editor to trim start/end points of your audio files. |
| **📂 Format Support** | Supports MP3, WAV, OGG, and even MP4 video audio extraction. |

## 🛠️ Tech Stack

*   **Core:** Electron (Main Process), Node.js
*   **Frontend:** React 18, TypeScript
*   **Styling:** Tailwind CSS (Custom Neon Config)
*   **Audio Engine:** Web Audio API + HTML5 Audio Sink ID
*   **Build System:** Electron Builder

## 📦 Installation

### For Users (Download)
Go to the [Releases Page](https://github.com/RADINMNX2/neonred-soundpad/releases) and download the latest `.exe` installer.

1.  Run the installer.
2.  Follow the in-app **Setup Guide** to install the **VB-Cable** driver (Required for audio injection).
3.  Enjoy!

### For Developers

Clone the repository and install dependencies:

```bash
# Clone the repo
git clone https://github.com/RADINMNX2/neonred-soundpad.git

# Enter directory
cd neonred-soundpad

# Install dependencies
npm install

# Start Development Mode
npm run electron:dev
```

To build the executable:

```bash
npm run dist
```

## 🔧 Audio Routing Guide

NeonRed requires a virtual audio cable to function optimally as an injector.

1.  **Input Device:** Select your *Real Microphone*.
2.  **Injector Output:** Select *CABLE Input (VB-Audio Virtual Cable)*.
3.  **Monitor Output:** Select your *Headphones*.
4.  **In Discord/Games:** Set your Input Device to *CABLE Output*.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 👤 Author

**RADINMNX**

*   Github: [@RADINMNX2](https://github.com/RADINMNX2)
*   Email: radinmnx@gmail.com

---

<div align="center">
  <sub>Built with ❤️ by RADINMNX using React & Electron.</sub>
</div>
