# Web TV Player

A Netflix-style streaming video player built with Next.js, React, and TypeScript. This application demonstrates the skills and technologies mentioned in the Netflix Software Engineer 4 - Web & TV Player job description.

## 🚀 Features

### Core Video Player
- **HTML5 Video Support** with MSE (Media Source Extensions)
- **HLS.js Integration** for adaptive streaming
- **DASH Support** (via dashjs)
- **Multiple Video Formats** (HLS, MP4, Live streams)
- **Responsive Design** with modern UI controls

### Adaptive Streaming
- **Quality Selection** with automatic bitrate switching
- **Buffer Management** with configurable buffer sizes
- **Network Adaptation** based on connection quality
- **Multiple Quality Levels** (240p to 4K)

### A/B Testing Framework
- **Feature Flags** for controlled rollouts
- **Variant Management** with weighted distribution
- **Local Storage** for persistent user assignments
- **Event Tracking** for experiment analysis
- **Configurable Tests** for different player features

### Analytics & Monitoring
- **Real-time Event Tracking** for playback metrics
- **Quality Metrics** collection (bitrate, buffer health)
- **Error Tracking** with detailed error reporting
- **User Interaction** analytics
- **Batch Processing** for efficient data transmission

### State Management
- **Player State Machine** (idle, loading, ready, playing, paused, buffering, error, ended)
- **Metadata Management** for video information
- **Event-driven Architecture** with React hooks
- **Persistent State** across component re-renders

### Modern UI Components
- **Custom Controls** (play/pause, volume, progress bar)
- **Quality Selector** with bitrate information
- **Playback Rate Control** (0.25x to 2x)
- **Fullscreen Support** with keyboard shortcuts
- **Loading States** and error handling
- **Hover Effects** and smooth transitions

## 🛠️ Technologies Used

- **Next.js 15** - React framework with App Router
- **React 19** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **HLS.js** - HTTP Live Streaming client
- **DASH.js** - MPEG-DASH client
- **Jest** - Testing framework
- **Testing Library** - React component testing

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd web-tv-player
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🎯 Key Features Demonstrated

### 1. Streaming Media Playback
- HLS and MP4 video support
- Adaptive bitrate streaming
- Buffer management and optimization
- Quality selection and switching

### 2. A/B Testing & Experimentation
- Feature flag system
- Variant management
- Event tracking for experiments
- Data-driven decision making

### 3. Analytics & Data Collection
- Real-time metrics collection
- Quality of Experience (QoE) tracking
- Error monitoring and reporting
- User behavior analytics

### 4. Modern Web Technologies
- TypeScript for type safety
- React hooks for state management
- Modern CSS with Tailwind
- Responsive design principles

### 5. Testing & Quality Assurance
- Unit tests for components
- Hook testing with React Testing Library
- Mock implementations for external dependencies
- Coverage reporting

## 🎮 Usage

### Basic Video Player
```tsx
import { VideoPlayer } from '@/components/VideoPlayer';

<VideoPlayer
  src="https://example.com/video.m3u8"
  isHLS={true}
  config={{
    enableAdaptiveBitrate: true,
    maxBitrate: 5000000,
    minBitrate: 500000,
    bufferSize: 30,
    analyticsEnabled: true,
  }}
/>
```

### A/B Testing
```tsx
import { useABTesting } from '@/hooks/useABTesting';

const { variant, getFeatureFlag, trackEvent } = useABTesting('player_ui_v2');

// Check feature flags
const modernControls = getFeatureFlag('modern_controls');

// Track events
trackEvent('video_played', { videoId: 'sample-1' });
```

### Analytics
```tsx
import { useAnalytics } from '@/hooks/useAnalytics';

const { trackPlaybackEvent, trackQualityMetrics } = useAnalytics();

// Track playback events
trackPlaybackEvent('play', 'video-1', 0, quality);

// Track quality metrics
trackQualityMetrics('video-1', quality, bufferHealth, currentTime, playbackRate);
```

## 🎨 UI Features

- **Dark Theme** with Netflix-inspired design
- **Responsive Layout** that works on all screen sizes
- **Keyboard Shortcuts** (spacebar, arrow keys, 'm', 'f')
- **Smooth Animations** and hover effects
- **Loading States** with spinners and progress indicators
- **Error Handling** with retry functionality

## 📊 Sample Videos

The application includes sample videos for testing:
- HLS streaming content
- MP4 video files
- Live streaming examples

## 🔧 Configuration

### Streaming Config
```typescript
interface StreamingConfig {
  enableAdaptiveBitrate: boolean;
  maxBitrate: number;
  minBitrate: number;
  bufferSize: number;
  qualityLevels: VideoQuality[];
  abTestEnabled: boolean;
  analyticsEnabled: boolean;
}
```

### A/B Test Config
```typescript
interface ABTestConfig {
  testId: string;
  variant: string;
  enabled: boolean;
  features: Record<string, boolean>;
}
```

## 🚀 Deployment

Build the application for production:
```bash
npm run build
npm start
```

## 📈 Performance Optimizations

- **Lazy Loading** of video components
- **Efficient State Management** with React hooks
- **Batch Analytics** processing
- **Memory Management** for video cleanup
- **Optimized Re-renders** with proper dependency arrays

## 🎯 Netflix Job Requirements Met

This project demonstrates all the key requirements from the Netflix job description:

✅ **3+ years of software development experience** - Complex React/TypeScript architecture  
✅ **Proficient in TypeScript and Node.js** - Full TypeScript implementation  
✅ **Streaming media playback experience** - HLS.js, DASH, adaptive streaming  
✅ **A/B testing and experimentation** - Complete A/B testing framework  
✅ **Analytics and data analysis** - Comprehensive analytics system  
✅ **Adaptive streaming technologies** - MPEG DASH, HTML5 MSE, HLS  
✅ **Cross-functional communication** - Well-documented, clean code  
✅ **Shipping software at scale** - Production-ready architecture  

## 📝 License

This project is for demonstration purposes and showcases skills relevant to the Netflix Software Engineer 4 - Web & TV Player position.