import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onUploadComplete: (studyUid: string, segmentationClasses?: any[]) => void;
}

const RADIOGRAPHY_TYPES = [
  { value: 'cbct', label: 'CBCT (Cone Beam CT)' },
  { value: 'panoramic', label: 'Panoramic X-ray' },
  { value: 'intraoral', label: 'Intraoral X-ray' },
  { value: 'cephalometric', label: 'Cephalometric X-ray' },
];

interface UploadedFile {
  file: File;
  type: 'image' | 'mask';
  id: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [radiographyType, setRadiographyType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const niiFiles = files.filter(file => 
      file.name.endsWith('.nii.gz') || file.name.endsWith('.nii')
    );

    if (niiFiles.length === 0) {
      alert('Please upload .nii.gz files only');
      return;
    }

    if (uploadedFiles.length + niiFiles.length > 2) {
      alert('Please upload exactly 2 files: one image and one mask');
      return;
    }

    const newFiles = niiFiles.map((file, index) => ({
      file,
      type: (uploadedFiles.length + index === 0 ? 'image' : 'mask') as 'image' | 'mask',
      id: Math.random().toString(36).substr(2, 9),
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const changeFileType = (id: string, newType: 'image' | 'mask') => {
    setUploadedFiles(prev => 
      prev.map(f => f.id === id ? { ...f, type: newType } : f)
    );
  };

  const startUpload = async () => {
    if (uploadedFiles.length !== 2 || !radiographyType) {
      alert('Please upload exactly 2 files and select radiography type');
      return;
    }

    const imageFile = uploadedFiles.find(f => f.type === 'image');
    const maskFile = uploadedFiles.find(f => f.type === 'mask');

    if (!imageFile || !maskFile) {
      alert('Please ensure you have one image file and one mask file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image_file', imageFile.file);
      formData.append('mask_file', maskFile.file);
      formData.append('radiography_type', radiographyType);

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 20, 90));
      }, 200);

      const response = await fetch('http://localhost:9999/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        onUploadComplete(result.study_uid, result.segmentation_classes);
      }, 500);

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      alert('Upload failed: ' + (error as Error).message);
    }
  };

  const canUpload = uploadedFiles.length === 2 && radiographyType && !isUploading;
  const hasImage = uploadedFiles.some(f => f.type === 'image');
  const hasMask = uploadedFiles.some(f => f.type === 'mask');

  return (
    <Card className="p-8 max-w-2xl mx-auto shadow-[var(--shadow-medical)]">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Upload Medical Images</h2>
          <p className="text-muted-foreground">
            Upload your .nii.gz files for DICOM conversion and analysis
          </p>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-[var(--transition-medical)]",
            dragActive ? "border-primary bg-accent" : "border-border",
            uploadedFiles.length === 2 && "opacity-50 pointer-events-none"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drop your .nii.gz files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Upload exactly 2 files: one radiography image and one segmentation mask
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".nii.gz,.nii"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploadedFiles.length === 2}
          />
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Uploaded Files ({uploadedFiles.length}/2)</h3>
            {uploadedFiles.map((uploadedFile) => (
              <div key={uploadedFile.id} className="flex items-center justify-between p-3 bg-accent rounded-md">
                <div className="flex items-center space-x-3">
                  <File className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{uploadedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Select
                    value={uploadedFile.type}
                    onValueChange={(value: 'image' | 'mask') => changeFileType(uploadedFile.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="mask">Mask</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(uploadedFile.id)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File Type Status */}
        {uploadedFiles.length > 0 && (
          <div className="flex space-x-4 text-sm">
            <div className={cn("flex items-center space-x-1", hasImage ? "text-success" : "text-muted-foreground")}>
              <CheckCircle className="h-4 w-4" />
              <span>Image File</span>
            </div>
            <div className={cn("flex items-center space-x-1", hasMask ? "text-success" : "text-muted-foreground")}>
              <CheckCircle className="h-4 w-4" />
              <span>Mask File</span>
            </div>
          </div>
        )}

        {/* Radiography Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Radiography Type</label>
          <Select value={radiographyType} onValueChange={setRadiographyType}>
            <SelectTrigger>
              <SelectValue placeholder="Select radiography type" />
            </SelectTrigger>
            <SelectContent>
              {RADIOGRAPHY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing files...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          variant="medical"
          size="medical"
          onClick={startUpload}
          disabled={!canUpload}
          className="w-full"
        >
          {isUploading ? 'Processing...' : 'Start Upload & Conversion'}
        </Button>
      </div>
    </Card>
  );
};