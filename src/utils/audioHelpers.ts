
// Maps DOM KeyboardEvent.code to Electron Accelerator format
export const mapKeyToElectronAccelerator = (e: KeyboardEvent): string | null => {
  const code = e.code;
  const key = e.key;

  // 1. Handle Modifiers (Return null so they are handled by the main logic as combinations)
  if (['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'ContextMenu'].includes(key)) {
    return null;
  }

  // 2. Function Keys (F1 - F24)
  if (/^F[0-9]{1,2}$/.test(code)) {
    return code;
  }

  // 3. Digits (0-9)
  if (code.startsWith('Digit')) {
    return code.replace('Digit', '');
  }

  // 4. Letters (A-Z)
  if (code.startsWith('Key')) {
    return code.replace('Key', '');
  }

  // 5. Numpad Logic
  if (code.startsWith('Numpad')) {
    const numKey = code.replace('Numpad', '');
    // Electron expects "Num0", "NumAdd", "NumDec", etc.
    // Special handling for Numpad operators
    const numpadMap: Record<string, string> = {
      'Add': 'NumAdd',
      'Subtract': 'NumSub',
      'Multiply': 'NumMult',
      'Divide': 'NumDiv',
      'Decimal': 'NumDec',
    };
    if (numpadMap[numKey]) return numpadMap[numKey];
    // Numpad Enter is not distinguishable from Enter in globalShortcut — skip it
    if (/^[0-9]$/.test(numKey)) return `Num${numKey}`;
    return null;
  }

  // 6. Special & Navigation Keys
  const specialMap: Record<string, string> = {
    'Space': 'Space',
    'Enter': 'Return', // Electron prefers 'Return' usually, but 'Enter' works on some OS
    'Escape': 'Escape',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Insert': 'Insert',
    'Tab': 'Tab',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'PrintScreen': 'PrintScreen',
    'ScrollLock': 'ScrollLock',
    'Pause': 'Pause',
    'CapsLock': 'CapsLock',
  };

  if (specialMap[code]) {
    return specialMap[code];
  }

  // 7. Punctuation & Symbols (Mapping code to standardized Electron strings)
  const symbolMap: Record<string, string> = {
    'Backquote': '`',
    'Minus': '-',
    'Equal': '=',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Backslash': '\\',
    'Semicolon': ';',
    'Quote': '\'',
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'IntlBackslash': '\\' 
  };

  if (symbolMap[code]) {
    return symbolMap[code];
  }

  // 8. Media Keys
  const mediaMap: Record<string, string> = {
    'MediaTrackNext': 'MediaNextTrack',
    'MediaTrackPrevious': 'MediaPreviousTrack',
    'MediaStop': 'MediaStop',
    'MediaPlayPause': 'MediaPlayPause',
    'AudioVolumeUp': 'VolumeUp',
    'AudioVolumeDown': 'VolumeDown',
    'AudioVolumeMute': 'VolumeMute',
  };

  if (mediaMap[code]) {
    return mediaMap[code];
  }

  return null;
};

// Convert File to Base64 for persistence if path is not available
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const parseAudioMetadata = (file: Blob): Promise<{ title?: string, artist?: string, album?: string, cover?: string, lyrics?: string }> => {
  return new Promise((resolve) => {
    if (!window.jsmediatags) {
        resolve({});
        return;
    }

    window.jsmediatags.read(file, {
        onSuccess: (tag: any) => {
            const { title, artist, album, picture, lyrics } = tag.tags;
            let cover = undefined;
            
            if (picture) {
                try {
                    let base64String = "";
                    for (let i = 0; i < picture.data.length; i++) {
                        base64String += String.fromCharCode(picture.data[i]);
                    }
                    cover = "data:" + picture.format + ";base64," + window.btoa(base64String);
                } catch (e) {
                    console.error("Error parsing cover", e);
                }
            }
            resolve({ title, artist, album, cover, lyrics: lyrics && typeof lyrics === 'string' ? lyrics : undefined });
        },
        onError: () => {
            resolve({});
        }
    });
  });
};

// Extract Album Art (Audio) or Video Frame (MP4)
export const extractAlbumArt = (file: File): Promise<string | undefined> => {
  return new Promise((resolve) => {
    
    // 1. Handle Video Files (MP4/WebM)
    if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.muted = true;
        video.currentTime = 1; // Capture frame at 1 second

        video.onloadeddata = () => {
            // Wait slightly for seek to complete if needed
            setTimeout(() => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        URL.revokeObjectURL(video.src);
                        resolve(dataUrl);
                    } else {
                        URL.revokeObjectURL(video.src);
                        resolve(undefined);
                    }
                } catch (e) {
                    console.error("Video thumbnail error", e);
                    resolve(undefined);
                }
            }, 300);
        };

        video.onerror = () => {
             resolve(undefined);
        };

        return;
    }

    // 2. Handle Audio Files via jsmediatags
    parseAudioMetadata(file).then(meta => resolve(meta.cover));
  });
};

export const getDominantColor = (imageSrc: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#ef4444');
        return;
      }

      canvas.width = 50;
      canvas.height = 50;
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0, 50, 50);

      // Get pixel data
      try {
        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;

        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }

        r = Math.floor(r / (data.length / 4));
        g = Math.floor(g / (data.length / 4));
        b = Math.floor(b / (data.length / 4));

        // Boost saturation slightly to make it look "neon"
        const max = Math.max(r, g, b);
        if (max < 100) { // If too dark, brighten it
            const factor = 150 / Math.max(1, max);
            r = Math.min(255, r * factor);
            g = Math.min(255, g * factor);
            b = Math.min(255, b * factor);
        }

        resolve(`rgb(${r}, ${g}, ${b})`);
      } catch (e) {
        resolve('#ef4444');
      }
    };

    img.onerror = () => {
      resolve('#ef4444');
    };
  });
};