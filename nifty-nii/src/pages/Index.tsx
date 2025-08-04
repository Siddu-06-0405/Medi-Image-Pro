import React, { useState } from "react";
import { FileUploader } from "@/components/FileUploader";
import { RealDicomViewer } from "@/components/RealDicomViewer";
import { SegmentationSidebar } from "@/components/SegmentationSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity } from "lucide-react";

const Index = () => {
  const [currentStep, setCurrentStep] = useState<"upload" | "viewer">("upload");
  const [studyId, setStudyId] = useState<string>("");
  const [segmentationClasses, setSegmentationClasses] = useState<any[]>([]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleUploadComplete = (
    studyUid: string,
    segmentationClasses?: any[]
  ) => {
    setStudyId(studyUid);
    console.log(segmentationClasses);
    
    setSegmentationClasses(segmentationClasses || []);
    setCurrentStep("viewer");
  };

  const handleSegmentationChange = (
    classId: string,
    visible: boolean,
    opacity: number
  ) => {
    console.log("Segmentation change:", { classId, visible, opacity });
    // Here you would integrate with the DICOM viewer to show/hide overlays
  };

  const resetToUpload = () => {
    setCurrentStep("upload");
    setStudyId("");
  };

  if (currentStep === "upload") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex items-center justify-center p-4">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                MedImage Pro
              </h1>
              <p className="text-sm text-muted-foreground">
                Medical Image Analysis Platform
              </p>
            </div>
          </div>
        </div>

        {/* Upload Interface */}
        <div className="w-full max-w-4xl mt-20">
          <FileUploader onUploadComplete={handleUploadComplete} />
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-6 right-6 text-center text-sm text-muted-foreground">
          Secure DICOM conversion and analysis • HIPAA compliant processing
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation */}
      <header className="flex items-center justify-between p-4 border-b bg-card shadow-[var(--shadow-panel)]">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToUpload}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Upload</span>
          </Button>
          <div className="h-6 w-px bg-border"></div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">MedImage Pro</h1>
              <p className="text-xs text-muted-foreground">Study: {studyId}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-sm text-muted-foreground">
            DICOM Viewer • Segmentation Analysis
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* DICOM Viewer */}
        <div className="flex-1 flex flex-col">
          <RealDicomViewer
            studyUid={studyId}
            segmentationClasses={segmentationClasses}
          />
        </div>

        {/* Segmentation Sidebar */}
        <SegmentationSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSegmentationChange={handleSegmentationChange}
          studyUid={studyId}
          segmentationClasses={segmentationClasses}
        />
      </div>
    </div>
  );
};

export default Index;
