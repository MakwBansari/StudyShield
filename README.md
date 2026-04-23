# GATE Study Tracker & Extension

A complete study tracking dashboard for GATE CS preparation, paired with a Chrome/Brave extension to block distractions during study sessions.

## Features

- **Dashboard**: Dark cockpit theme tracking 12 GATE CS subjects and their weightage.
- **Study Timer**: Pomodoro intervals, custom activity tagging, and distraction counts.
- **Distraction Blocking**: Uses `declarativeNetRequest` to redirect non-whitelisted sites to a "Focus Mode" screen.
- **Stats**: Track weekly progress, daily focus scores, and upcoming spaced repetition topics.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Load the extension in Chrome/Brave:
   - Go to `chrome://extensions` or `brave://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist-ext` folder in this project.
