import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IPFSService, IPFSUploadProgress } from '../../services/ipfs.service';

export interface UploadConfig {
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  compressionQuality?: number;
}

@Component({
  selector: 'app-ipfs-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="ipfs-upload-container">
      <div class="upload-area" 
           [class.drag-over]="isDragOver"
           [class.uploading]="isUploading"
           (drop)="onDrop($event)"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (click)="triggerFileInput()">
        
        <input #fileInput 
               type="file" 
               [multiple]="config.multiple" 
               [accept]="config.accept"
               (change)="onFileSelected($event)"
               style="display: none">

        <div class="upload-content">
          <div class="upload-icon">
            <mat-icon *ngIf="!isUploading">cloud_upload</mat-icon>
            <mat-progress-spinner *ngIf="isUploading" [diameter]="60" color="primary"></mat-progress-spinner>
          </div>
          
          <div class="upload-text" *ngIf="!isUploading">
            <h3>{{ uploadTitle }}</h3>
            <p>{{ uploadDescription }}</p>
            <div class="upload-specs">
              <mat-chip-listbox>
                <mat-chip-option disabled="true">
                  Max {{ config.maxFiles }} files
                </mat-chip-option>
                <mat-chip-option disabled="true">
                  {{ formatFileSize(config.maxFileSize!) }} max
                </mat-chip-option>
                <mat-chip-option disabled="true" *ngIf="config.accept === 'image/*'">
                  Images only
                </mat-chip-option>
              </mat-chip-listbox>
            </div>
          </div>

          <div class="upload-text" *ngIf="isUploading">
            <h3>Uploading to IPFS...</h3>
            <p>{{ uploadingFiles.length }} file(s) processing</p>
            <div class="overall-progress">
              <mat-progress-bar 
                mode="determinate" 
                [value]="overallProgress"
                color="primary">
              </mat-progress-bar>
              <span class="progress-text">{{ overallProgress.toFixed(0) }}%</span>
            </div>
          </div>

          <button mat-raised-button color="primary" class="browse-button" *ngIf="!isUploading">
            <mat-icon>folder_open</mat-icon>
            Browse Files
          </button>
        </div>
      </div>

      <!-- File Preview Section -->
      <div class="file-preview-section" *ngIf="selectedFiles.length > 0 && !isUploading">
        <h4>Selected Files ({{ selectedFiles.length }})</h4>
        <div class="file-preview-list">
          <div *ngFor="let file of selectedFiles; let i = index" class="file-preview-item">
            <div class="file-info">
              <div class="file-thumbnail" *ngIf="isImage(file)">
                <img [src]="getFilePreview(file)" [alt]="file.name">
              </div>
              <div class="file-thumbnail file-icon" *ngIf="!isImage(file)">
                <mat-icon>{{ getFileIcon(file) }}</mat-icon>
              </div>
              <div class="file-details">
                <div class="file-name" [matTooltip]="file.name">{{ file.name }}</div>
                <div class="file-size">{{ formatFileSize(file.size) }}</div>
                <div class="file-type">{{ file.type || 'Unknown type' }}</div>
              </div>
            </div>
            <div class="file-actions">
              <button mat-icon-button 
                      (click)="removeFile(i)"
                      matTooltip="Remove file"
                      color="warn">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </div>
        
        <div class="upload-actions">
          <button mat-stroked-button 
                  (click)="clearFiles()"
                  [disabled]="isUploading">
            <mat-icon>clear_all</mat-icon>
            Clear All
          </button>
          <button mat-raised-button 
                  color="primary"
                  (click)="startUpload()"
                  [disabled]="selectedFiles.length === 0 || isUploading">
            <mat-icon>cloud_upload</mat-icon>
            Upload {{ selectedFiles.length }} File(s)
          </button>
        </div>
      </div>

      <!-- Upload Progress Details -->
      <div class="upload-progress-section" *ngIf="uploadingFiles.length > 0 && isUploading">
        <h4>Upload Progress</h4>
        <div class="progress-list">
          <div *ngFor="let progress of uploadingFiles" class="progress-item">
            <div class="progress-header">
              <div class="progress-file-info">
                <mat-icon class="progress-status-icon" [class]="progress.status">
                  {{ getProgressIcon(progress.status) }}
                </mat-icon>
                <span class="progress-file-name">{{ progress.file.name }}</span>
              </div>
              <div class="progress-percentage">
                {{ progress.progress.toFixed(0) }}%
              </div>
            </div>
            <mat-progress-bar 
              mode="determinate" 
              [value]="progress.progress"
              [color]="getProgressColor(progress.status)">
            </mat-progress-bar>
            <div class="progress-details" *ngIf="progress.status === 'completed' && progress.hash">
              <span class="ipfs-hash">{{ progress.hash.substring(0, 20) }}...</span>
              <button mat-icon-button 
                      (click)="copyToClipboard(progress.hash!)"
                      matTooltip="Copy IPFS hash"
                      class="copy-button">
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>
            <div class="progress-error" *ngIf="progress.status === 'error'">
              <mat-icon color="warn">error</mat-icon>
              <span>{{ progress.error }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Completed Uploads -->
      <div class="completed-uploads" *ngIf="completedHashes.length > 0 && !isUploading">
        <h4>Recently Uploaded ({{ completedHashes.length }})</h4>
        <div class="completed-list">
          <div *ngFor="let hash of completedHashes" class="completed-item">
            <div class="completed-preview" *ngIf="config.accept === 'image/*'">
              <img [src]="getIPFSUrl(hash)" [alt]="'IPFS content'">
            </div>
            <div class="completed-info">
              <div class="completed-hash">{{ hash.substring(0, 20) }}...</div>
              <div class="completed-actions">
                <button mat-icon-button 
                        (click)="copyToClipboard(hash)"
                        matTooltip="Copy IPFS hash">
                  <mat-icon>content_copy</mat-icon>
                </button>
                <button mat-icon-button 
                        (click)="openIPFS(hash)"
                        matTooltip="View on IPFS">
                  <mat-icon>open_in_new</mat-icon>
                </button>
                <button mat-icon-button 
                        (click)="removeCompleted(hash)"
                        matTooltip="Remove from list"
                        color="warn">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./ipfs-upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IPFSUploadComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Input() config: UploadConfig = {
    multiple: true,
    accept: 'image/*',
    maxFiles: 10,
    maxFileSize: 10485760, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    compressionQuality: 0.85
  };

  @Input() uploadTitle = 'Upload Files to IPFS';
  @Input() uploadDescription = 'Drag and drop files here, or click to browse';

  @Output() filesUploaded = new EventEmitter<string[]>();
  @Output() uploadProgress = new EventEmitter<IPFSUploadProgress[]>();
  @Output() uploadError = new EventEmitter<string>();

  private destroy$ = new Subject<void>();

  selectedFiles: File[] = [];
  uploadingFiles: IPFSUploadProgress[] = [];
  completedHashes: string[] = [];
  isDragOver = false;
  isUploading = false;
  overallProgress = 0;

  constructor(
    private ipfsService: IPFSService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscribeToUploadProgress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToUploadProgress(): void {
    this.ipfsService.uploadProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.uploadingFiles = progress;
        this.updateOverallProgress();
        this.uploadProgress.emit(progress);
        this.cdr.markForCheck();
      });
  }

  private updateOverallProgress(): void {
    if (this.uploadingFiles.length === 0) {
      this.overallProgress = 0;
      return;
    }

    const totalProgress = this.uploadingFiles.reduce((sum, file) => sum + file.progress, 0);
    this.overallProgress = totalProgress / this.uploadingFiles.length;

    // Check if all uploads are complete
    const allCompleted = this.uploadingFiles.every(file => 
      file.status === 'completed' || file.status === 'error'
    );

    if (allCompleted && this.isUploading) {
      this.handleUploadComplete();
    }
  }

  private handleUploadComplete(): void {
    this.isUploading = false;
    
    const successfulUploads = this.uploadingFiles
      .filter(file => file.status === 'completed' && file.hash)
      .map(file => file.hash!);

    const failedUploads = this.uploadingFiles
      .filter(file => file.status === 'error');

    if (successfulUploads.length > 0) {
      this.completedHashes = [...this.completedHashes, ...successfulUploads];
      this.filesUploaded.emit(successfulUploads);
      
      this.snackBar.open(
        `${successfulUploads.length} file(s) uploaded successfully!`,
        'Close',
        { duration: 3000 }
      );
    }

    if (failedUploads.length > 0) {
      this.snackBar.open(
        `${failedUploads.length} file(s) failed to upload`,
        'Close',
        { duration: 5000 }
      );
    }

    // Clear selected files after upload
    this.selectedFiles = [];
    this.cdr.markForCheck();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = Array.from(event.dataTransfer?.files || []);
    this.handleFileSelection(files);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.handleFileSelection(files);
    
    // Reset input
    input.value = '';
  }

  private handleFileSelection(files: File[]): void {
    const validFiles = this.validateFiles(files);
    
    if (validFiles.length === 0) {
      return;
    }

    // Add to selected files (respecting max files limit)
    const availableSlots = this.config.maxFiles! - this.selectedFiles.length;
    const filesToAdd = validFiles.slice(0, availableSlots);
    
    if (filesToAdd.length < validFiles.length) {
      this.snackBar.open(
        `Only ${filesToAdd.length} files added due to ${this.config.maxFiles} file limit`,
        'Close',
        { duration: 3000 }
      );
    }

    this.selectedFiles = [...this.selectedFiles, ...filesToAdd];
    this.cdr.markForCheck();
  }

  private validateFiles(files: File[]): File[] {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > this.config.maxFileSize!) {
        errors.push(`${file.name}: File too large (max ${this.formatFileSize(this.config.maxFileSize!)})`);
        continue;
      }

      // Check file type
      if (this.config.allowedTypes && !this.config.allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed`);
        continue;
      }

      // Check for duplicates
      if (this.selectedFiles.some(selected => selected.name === file.name && selected.size === file.size)) {
        errors.push(`${file.name}: File already selected`);
        continue;
      }

      validFiles.push(file);
    }

    // Show errors if any
    if (errors.length > 0) {
      this.snackBar.open(
        `Some files were rejected: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`,
        'Close',
        { duration: 5000 }
      );
    }

    return validFiles;
  }

  triggerFileInput(): void {
    if (!this.isUploading) {
      this.fileInput.nativeElement.click();
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.cdr.markForCheck();
  }

  clearFiles(): void {
    this.selectedFiles = [];
    this.cdr.markForCheck();
  }

  async startUpload(): Promise<void> {
    if (this.selectedFiles.length === 0 || this.isUploading) {
      return;
    }

    this.isUploading = true;
    this.uploadingFiles = [];
    this.ipfsService.clearUploadHistory();
    this.cdr.markForCheck();

    // Start uploading files
    const uploadPromises = this.selectedFiles.map(file => 
      this.ipfsService.uploadFile(file).catch(error => {
        console.error(`Upload failed for ${file.name}:`, error);
        return null;
      })
    );

    try {
      await Promise.allSettled(uploadPromises);
    } catch (error) {
      console.error('Upload batch error:', error);
      this.uploadError.emit('Upload failed');
    }
  }

  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  getFilePreview(file: File): string {
    return URL.createObjectURL(file);
  }

  getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video_file';
    if (file.type.startsWith('audio/')) return 'audio_file';
    if (file.type.includes('pdf')) return 'picture_as_pdf';
    if (file.type.includes('text/')) return 'description';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
  }

  getProgressIcon(status: string): string {
    switch (status) {
      case 'pending': return 'schedule';
      case 'uploading': return 'cloud_upload';
      case 'completed': return 'check_circle';
      case 'error': return 'error';
      default: return 'help';
    }
  }

  getProgressColor(status: string): string {
    switch (status) {
      case 'completed': return 'primary';
      case 'error': return 'warn';
      case 'uploading': return 'accent';
      default: return 'primary';
    }
  }

  getIPFSUrl(hash: string): string {
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open('IPFS hash copied to clipboard', 'Close', {
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  openIPFS(hash: string): void {
    window.open(this.getIPFSUrl(hash), '_blank');
  }

  removeCompleted(hash: string): void {
    const index = this.completedHashes.indexOf(hash);
    if (index > -1) {
      this.completedHashes.splice(index, 1);
      this.cdr.markForCheck();
    }
  }
}