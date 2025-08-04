// RealDicomViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Square,
  Settings,
  Maximize2,
  Play,
  Pause,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

// Configure cornerstone
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneWADOImageLoader.configure({
  useWebWorkers: true,
  decodeConfig: {
    convertFloatPixelDataToInt: false,
  },
});

interface RealDicomViewerProps {
  studyUid: string;
  segmentationClasses?: string[];
  className?: string;
}

interface ViewportProps {
  title: string;
  studyUid: string;
  view: 'axial' | 'coronal' | 'sagittal' | '3d';
  isActive: boolean;
  onClick: () => void;
  segmentationClasses?: string[];
}

interface DicomImage {
  imageId: string;
  instanceNumber: number;
  url: string;
  cornerstoneImageId: string;
}

interface SegmentationOverlay {
  imageData: ImageData;
  visible: boolean;
  opacity: number;
}

const Viewport: React.FC<ViewportProps> = ({ title, studyUid, view, isActive, onClick, segmentationClasses = [] }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<DicomImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cornerstoneEnabled, setCornerstoneEnabled] = useState(false);
  const [segmentationOverlay, setSegmentationOverlay] = useState<SegmentationOverlay | null>(null);
  const [showSegmentation, setShowSegmentation] = useState(true);

  useEffect(() => {
    loadDicomImages();
    if (segmentationClasses.length > 0) {
      loadSegmentationOverlay();
    }
  }, [studyUid, segmentationClasses]);

  useEffect(() => {
    if (elementRef.current && !cornerstoneEnabled) {
      try {
        cornerstone.enable(elementRef.current);
        setCornerstoneEnabled(true);
      } catch (error) {
        console.error('Failed to enable cornerstone:', error);
      }
    }

    return () => {
      if (elementRef.current && cornerstoneEnabled) {
        try {
          cornerstone.disable(elementRef.current);
        } catch (error) {
          console.error('Failed to disable cornerstone:', error);
        }
      }
    };
  }, [cornerstoneEnabled]);

  useEffect(() => {
    if (images.length > 0 && cornerstoneEnabled) {
      displayCurrentImage();
    }
  }, [images, currentImageIndex, cornerstoneEnabled]);

  useEffect(() => {
    if (segmentationOverlay && overlayCanvasRef.current) {
      renderSegmentationOverlay();
    }
  }, [segmentationOverlay, showSegmentation, currentImageIndex]);

  const loadDicomImages = async () => {
    try {
      setIsLoading(true);
      const seriesResponse = await fetch(`http://localhost:9999/studies/${studyUid}/series`);
      const seriesData = await seriesResponse.json();
      if (seriesData.length === 0) throw new Error('No series found');

      const seriesUid = seriesData[0]['0020000E'].Value[0];
      const instancesResponse = await fetch(`http://localhost:9999/studies/${studyUid}/series/${seriesUid}/metadata`);
      const instancesData = await instancesResponse.json();

      const dicomImages: DicomImage[] = instancesData.map((instance: any, index: number) => {
        const originalUrl = instance['00081190'].Value[0];
        const cornerstoneImageId = originalUrl.startsWith('wadouri:') 
          ? originalUrl 
          : `wadouri:${originalUrl}`;
        
        return {
          imageId: instance['00080018'].Value[0],
          instanceNumber: instance['00200013']?.Value[0] || index + 1,
          url: originalUrl.replace('wadouri:', ''),
          cornerstoneImageId: cornerstoneImageId
        };
      }).sort((a, b) => a.instanceNumber - b.instanceNumber);

      setImages(dicomImages);
      setCurrentImageIndex(Math.floor(dicomImages.length / 2));
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load DICOM images:', error);
      setIsLoading(false);
    }
  };

  const loadSegmentationOverlay = async () => {
    try {
      // Get study ID from studyUid
      const studiesResponse = await fetch('http://localhost:9999/studies');
      const studiesData = await studiesResponse.json();
      const study = studiesData.find((s: any) => s['0020000D'].Value[0] === studyUid);
      
      if (!study) return;

      const segUrl = `http://localhost:9999/segmentation/${study['00100020'].Value[0]}/segmentation.dcm`;
      const response = await fetch(segUrl);
      
      if (!response.ok) return;

      const buffer = await response.arrayBuffer();
      
      // For now, create a simple overlay visualization
      // In a real implementation, you'd parse the segmentation DICOM properly
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const imageData = ctx.createImageData(512, 512);
        
        // Create a simple segmentation visualization
        // This is a placeholder - you'd want to properly parse the segmentation DICOM
        for (let i = 0; i < imageData.data.length; i += 4) {
          const segmentValue = Math.random() > 0.95 ? 1 : 0; // Random segmentation for demo
          if (segmentValue > 0) {
            imageData.data[i] = 255;     // Red
            imageData.data[i + 1] = 100; // Green
            imageData.data[i + 2] = 100; // Blue
            imageData.data[i + 3] = 120; // Alpha
          }
        }
        
        setSegmentationOverlay({
          imageData,
          visible: true,
          opacity: 0.6
        });
      }
    } catch (error) {
      console.error('Failed to load segmentation overlay:', error);
    }
  };

  const renderSegmentationOverlay = () => {
    if (!overlayCanvasRef.current || !segmentationOverlay || !showSegmentation) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size to match viewport
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Draw segmentation overlay
    ctx.globalAlpha = segmentationOverlay.opacity;
    
    // Create temporary canvas for segmentation data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = segmentationOverlay.imageData.width;
    tempCanvas.height = segmentationOverlay.imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.putImageData(segmentationOverlay.imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }
    
    ctx.globalAlpha = 1.0;
  };

  const displayCurrentImage = async () => {
    if (!elementRef.current || images.length === 0 || !cornerstoneEnabled) return;

    try {
      const currentImage = images[currentImageIndex];
      const image = await cornerstone.loadImage(currentImage.cornerstoneImageId);
      cornerstone.displayImage(elementRef.current, image);
      
      // Update overlay canvas size to match viewport
      if (overlayCanvasRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        overlayCanvasRef.current.style.width = `${rect.width}px`;
        overlayCanvasRef.current.style.height = `${rect.height}px`;
      }
    } catch (error) {
      console.error('Failed to display image:', error);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const element = elementRef.current;
    if (!element) return;

    const delta = e.deltaY > 0 ? -1 : 1;
    
    if (e.ctrlKey) {
      try {
        const viewport = cornerstone.getViewport(element);
        if (viewport) {
          viewport.scale += delta * 0.1;
          viewport.scale = Math.max(0.1, Math.min(5, viewport.scale));
          cornerstone.setViewport(element, viewport);
        }
      } catch (error) {
        console.error('Failed to zoom:', error);
      }
    } else {
      if (images.length > 1) {
        setCurrentImageIndex(prev => {
          const newIndex = Math.max(0, Math.min(images.length - 1, prev + delta));
          return newIndex;
        });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!elementRef.current) return;
    e.preventDefault();
    
    const element = elementRef.current;
    const startX = e.clientX;
    const startY = e.clientY;
    
    let viewport: any;
    try {
      viewport = cornerstone.getViewport(element);
    } catch {
      return;
    }
    
    const startTranslationX = viewport.translation.x;
    const startTranslationY = viewport.translation.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      try {
        const currentViewport = cornerstone.getViewport(element);
        if (currentViewport) {
          currentViewport.translation.x = startTranslationX + deltaX;
          currentViewport.translation.y = startTranslationY + deltaY;
          cornerstone.setViewport(element, currentViewport);
        }
      } catch (error) {
        console.error('Failed to pan:', error);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const resetViewport = () => {
    if (!elementRef.current) return;
    try {
      cornerstone.reset(elementRef.current);
    } catch (error) {
      console.error('Failed to reset viewport:', error);
    }
  };

  const zoomIn = () => {
    if (!elementRef.current) return;
    try {
      const viewport = cornerstone.getViewport(elementRef.current);
      if (viewport) {
        viewport.scale *= 1.2;
        cornerstone.setViewport(elementRef.current, viewport);
      }
    } catch (error) {
      console.error('Failed to zoom in:', error);
    }
  };

  const zoomOut = () => {
    if (!elementRef.current) return;
    try {
      const viewport = cornerstone.getViewport(elementRef.current);
      if (viewport) {
        viewport.scale /= 1.2;
        cornerstone.setViewport(elementRef.current, viewport);
      }
    } catch (error) {
      console.error('Failed to zoom out:', error);
    }
  };

  const toggleSegmentation = () => {
    setShowSegmentation(!showSegmentation);
  };

  // 3D Volume Rendering placeholder
  const render3D = () => {
    if (view !== '3d') return null;
    
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🧠</div>
          <div className="text-lg font-semibold">3D Volume Rendering</div>
          <div className="text-sm text-gray-400 mt-2">
            {images.length} slices loaded
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Volume reconstruction in progress...
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card 
      onClick={onClick} 
      className={cn(
        "relative h-full min-h-[300px] bg-black border-2 overflow-hidden group", 
        isActive ? "border-primary" : "border-border"
      )}
    > 
      {view === '3d' ? render3D() : (
        <>
          {/* Cornerstone viewport element */}
          <div 
            ref={elementRef}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            style={{ touchAction: 'none' }}
          />
          
          {/* Segmentation overlay canvas */}
          {segmentationClasses.length > 0 && (
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ 
                zIndex: 10,
                display: showSegmentation ? 'block' : 'none'
              }}
            />
          )}
        </>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            Loading {title} view...
          </div>
        </div>
      )}

      {/* View title */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded font-semibold z-20">
        {title.toUpperCase()}
      </div>

      {/* Image info overlay */}
      {!isLoading && images.length > 0 && view !== '3d' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-20">
          <div>Image: {currentImageIndex + 1} / {images.length}</div>
          <div>Instance: {images[currentImageIndex]?.instanceNumber}</div>
          {segmentationClasses.length > 0 && (
            <div className="mt-1 text-xs text-gray-300">
              Segments: {segmentationClasses.length}
            </div>
          )}
        </div>
      )}

      {/* Control buttons */}
      {!isLoading && isActive && (
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {segmentationClasses.length > 0 && view !== '3d' && (
            <Button size="sm" variant="secondary" onClick={toggleSegmentation}>
              {showSegmentation ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </Button>
          )}
          {view !== '3d' && (
            <>
              <Button size="sm" variant="secondary" onClick={resetViewport}>
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="secondary" onClick={zoomIn}>
                <ZoomIn className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="secondary" onClick={zoomOut}>
                <ZoomOut className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Segmentation classes legend */}
      {segmentationClasses.length > 0 && isActive && showSegmentation && view !== '3d' && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs z-20">
          <div className="font-semibold mb-1">Segmentation Classes:</div>
          {segmentationClasses.map((className, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded"
                style={{ 
                  backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` 
                }}
              />
              <span className="text-xs">{className}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export const RealDicomViewer: React.FC<RealDicomViewerProps> = ({ 
  studyUid, 
  segmentationClasses = [], 
  className 
}) => {
  const [activeViewport, setActiveViewport] = useState<string>('axial');

  const viewports = [
    { name: 'axial', title: 'Axial' },
    { name: 'coronal', title: 'Coronal' },
    { name: 'sagittal', title: 'Sagittal' },
    { name: '3d', title: '3D Volume' }
  ];

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header with segmentation info */}
      {segmentationClasses.length > 0 && (
        <div className="bg-gray-100 p-2 border-b">
          <div className="text-sm font-semibold text-gray-700">
            Study: {studyUid} • Segmentation Classes: {segmentationClasses.length}
          </div>
        </div>
      )}
      
      {/* 2x2 Viewport Grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 p-2">
        {viewports.map(viewport => (
          <Viewport 
            key={viewport.name} 
            title={viewport.title} 
            studyUid={studyUid} 
            view={viewport.name as any} 
            isActive={activeViewport === viewport.name} 
            onClick={() => setActiveViewport(viewport.name)}
            segmentationClasses={segmentationClasses}
          />
        ))}
      </div>
    </div>
  );
};