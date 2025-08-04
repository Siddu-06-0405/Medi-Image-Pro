import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Layers } from 'lucide-react';

interface SegmentationSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSegmentationChange: (classId: string, visible: boolean, opacity: number) => void;
  studyUid: string;
  segmentationClasses: string[];
}

interface ClassState {
  visible: boolean;
  opacity: number;
}

export const SegmentationSidebar: React.FC<SegmentationSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onSegmentationChange,
  studyUid,
  segmentationClasses,
}) => {
  const [classStates, setClassStates] = useState<Record<string, ClassState>>({});

  const getClassState = (classId: string): ClassState => {
    return classStates[classId] || { visible: false, opacity: 50 };
  };

  const updateClassState = (classId: string, updates: Partial<ClassState>) => {
    const currentState = getClassState(classId);
    const newState = { ...currentState, ...updates };
    
    setClassStates(prev => ({
      ...prev,
      [classId]: newState
    }));

    onSegmentationChange(classId, newState.visible, newState.opacity);
  };

  const toggleVisibility = (classId: string) => {
    const currentState = getClassState(classId);
    updateClassState(classId, { visible: !currentState.visible });
  };

  const updateOpacity = (classId: string, opacity: number) => {
    updateClassState(classId, { opacity });
  };

  const toggleAllVisibility = () => {
    const hasAnyVisible = segmentationClasses.some(cls => getClassState(cls).visible);
    
    segmentationClasses.forEach(cls => {
      updateClassState(cls, { visible: !hasAnyVisible });
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-card flex flex-col items-center py-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-2 h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col space-y-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          {segmentationClasses.length > 0 && (
            <div className="text-xs text-muted-foreground font-medium">
              {segmentationClasses.length}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Segmentation</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-2 h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {segmentationClasses.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {segmentationClasses.length} classes
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllVisibility}
              className="h-7 px-2 text-xs"
            >
              Toggle All
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {segmentationClasses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No segmentation classes available</p>
            <p className="text-xs mt-1">Upload a file with segmentation data</p>
          </div>
        ) : (
          segmentationClasses.map((segClass) => {
            const state = getClassState(segClass);
            
            return (
              <div key={segClass} className="border rounded-lg p-3 space-y-3">
                {/* Class Header */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`class-${segClass}`}
                    checked={state.visible}
                    onCheckedChange={() => toggleVisibility(segClass)}
                  />
                  
                  <Label
                    htmlFor={`class-${segClass}`}
                    className="flex-1 text-sm font-medium cursor-pointer"
                  >
                    {segClass}
                  </Label>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVisibility(segClass)}
                    className="p-1 h-6 w-6"
                  >
                    {state.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 opacity-50" />
                    )}
                  </Button>
                </div>

                {/* Opacity Slider */}
                {state.visible && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Opacity
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {state.opacity}%
                      </span>
                    </div>
                    <Slider
                      value={[state.opacity]}
                      onValueChange={([value]) => updateOpacity(segClass, value)}
                      max={100}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/20">
        <div className="text-xs text-muted-foreground">
          Study: {studyUid.slice(0, 20)}...
        </div>
      </div>
    </div>
  );
};