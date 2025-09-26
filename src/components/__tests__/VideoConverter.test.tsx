import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoConverter } from '../VideoConverter';

// Mock the FFmpeg hook
jest.mock('../../hooks/useFFmpeg', () => ({
  useFFmpeg: () => ({
    isLoaded: true,
    isProcessing: false,
    progress: null,
    error: null,
    result: null,
    loadFFmpeg: jest.fn(),
    convertVideo: jest.fn(),
    extractThumbnail: jest.fn(),
    getVideoInfo: jest.fn(),
    reset: jest.fn(),
    terminate: jest.fn(),
  }),
}));

// Mock the FFmpeg utilities
jest.mock('../../utils/ffmpeg', () => ({
  getQualityPresets: () => ({
    low: { label: 'Low Quality', crf: 28, description: 'Small file size, lower quality' },
    medium: { label: 'Medium Quality', crf: 23, description: 'Balanced quality and size' },
    high: { label: 'High Quality', crf: 18, description: 'High quality, larger file' },
    ultra: { label: 'Ultra Quality', crf: 15, description: 'Maximum quality, largest file' },
  }),
  formatFileSize: (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },
  formatDuration: (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },
}));

describe('VideoConverter', () => {
  it('renders the video converter component', () => {
    render(<VideoConverter />);
    
    expect(screen.getByText('Video Converter')).toBeInTheDocument();
    expect(screen.getByText('FFmpeg Ready')).toBeInTheDocument();
    expect(screen.getByText('Select Video File')).toBeInTheDocument();
  });

  it('shows file input for video selection', () => {
    render(<VideoConverter />);
    
    const fileInput = screen.getByLabelText('Select Video File');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', 'video/*');
  });

  it('displays conversion options when file is selected', async () => {
    render(<VideoConverter />);
    
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText('Select Video File');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('File: test.mp4')).toBeInTheDocument();
    });
  });

  it('shows quality preset options', async () => {
    render(<VideoConverter />);
    
    // First select a file to show conversion options
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText('Select Video File');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      const qualitySelect = screen.getByDisplayValue('Medium Quality');
      expect(qualitySelect).toBeInTheDocument();
    });
  });

  it('shows output format options', async () => {
    render(<VideoConverter />);
    
    // First select a file to show conversion options
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText('Select Video File');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      const formatSelect = screen.getByDisplayValue('MP4');
      expect(formatSelect).toBeInTheDocument();
    });
  });

  it('toggles advanced options', async () => {
    render(<VideoConverter />);
    
    // First select a file to show conversion options
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText('Select Video File');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      const toggleButton = screen.getByText('Show Advanced Options');
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('Hide Advanced Options')).toBeInTheDocument();
      expect(screen.getByText('Resolution Width')).toBeInTheDocument();
      expect(screen.getByText('Resolution Height')).toBeInTheDocument();
      expect(screen.getByText('Bitrate (kbps)')).toBeInTheDocument();
    });
  });

  it('shows thumbnail extraction section', async () => {
    render(<VideoConverter />);
    
    // First select a file to show conversion options
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText('Select Video File');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Extract Thumbnail' })).toBeInTheDocument();
      expect(screen.getByText('seconds')).toBeInTheDocument();
    });
  });

  it('has convert and reset buttons', () => {
    render(<VideoConverter />);
    
    expect(screen.getByText('Convert Video')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('handles file selection correctly', async () => {
    render(<VideoConverter />);
    
    const file = new File(['test video content'], 'test.webm', { type: 'video/webm' });
    const fileInput = screen.getByLabelText('Select Video File');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('File: test.webm')).toBeInTheDocument();
    });
  });

  it('updates conversion options when changed', async () => {
    render(<VideoConverter />);
    
    // First select a file to show conversion options
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText('Select Video File');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      const qualitySelect = screen.getByDisplayValue('Medium Quality');
      fireEvent.change(qualitySelect, { target: { value: 'high' } });
      
      expect(qualitySelect).toHaveValue('high');
    });
  });

  it('shows FFmpeg status correctly', () => {
    render(<VideoConverter />);
    
    // Should show FFmpeg Ready when loaded
    expect(screen.getByText('FFmpeg Ready')).toBeInTheDocument();
  });
});


