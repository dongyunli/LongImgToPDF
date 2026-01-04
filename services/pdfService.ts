
import { jsPDF } from 'jspdf';
import { PageSize, Orientation, PdfOptions, ProcessedPage } from '../types';

// Standard A4 dimensions in pixels at 72 DPI (jsPDF default)
// but for high quality, we calculate relative to user image
const PAGE_DIMENSIONS = {
  [PageSize.A4]: { width: 210, height: 297 }, // mm
  [PageSize.Letter]: { width: 215.9, height: 279.4 },
  [PageSize.Legal]: { width: 215.9, height: 355.6 },
};

/**
 * Splits a long image into parts that fit perfectly onto PDF pages
 */
export async function generatePdfPages(
  dataUrl: string, 
  originalWidth: number, 
  originalHeight: number, 
  options: PdfOptions
): Promise<ProcessedPage[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { pageSize, orientation, margin } = options;
      const baseDim = PAGE_DIMENSIONS[pageSize];
      
      const pageWidthMm = orientation === Orientation.Portrait ? baseDim.width : baseDim.height;
      const pageHeightMm = orientation === Orientation.Portrait ? baseDim.height : baseDim.width;
      
      const printableWidthMm = pageWidthMm - (margin * 2);
      const printableHeightMm = pageHeightMm - (margin * 2);
      
      // Calculate scaling to fit image width to printable width
      // We want to preserve aspect ratio. 
      // 1mm = 3.7795 px approximately at 96 DPI, but jsPDF uses points.
      // Let's stick to consistent aspect ratio logic.
      const scale = originalWidth / printableWidthMm;
      const segmentHeightPx = printableHeightMm * scale;
      
      const totalPages = Math.ceil(originalHeight / segmentHeightPx);
      const pages: ProcessedPage[] = [];
      
      for (let i = 0; i < totalPages; i++) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        
        const currentY = i * segmentHeightPx;
        const remainingHeight = originalHeight - currentY;
        const captureHeight = Math.min(segmentHeightPx, remainingHeight);
        
        // Output dimensions for this specific canvas
        canvas.width = originalWidth;
        canvas.height = segmentHeightPx; // Keep canvas fixed to page height for uniform display
        
        // Fill white background for the last page if it's shorter
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the sliced part
        ctx.drawImage(
          img,
          0, currentY, originalWidth, captureHeight, // Source
          0, 0, originalWidth, captureHeight // Destination
        );
        
        pages.push({
          dataUrl: canvas.toDataURL('image/jpeg', options.quality),
          width: canvas.width,
          height: canvas.height
        });
      }
      
      resolve(pages);
    };
    img.src = dataUrl;
  });
}

/**
 * Compiles processed pages into a single PDF blob
 */
export async function createPdfBlob(pages: ProcessedPage[], options: PdfOptions): Promise<Blob> {
  const { pageSize, orientation, margin } = options;
  const pdf = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: pageSize.toLowerCase()
  });

  const baseDim = PAGE_DIMENSIONS[pageSize];
  const pageWidth = orientation === Orientation.Portrait ? baseDim.width : baseDim.height;
  const pageHeight = orientation === Orientation.Portrait ? baseDim.height : baseDim.width;
  
  const drawWidth = pageWidth - (margin * 2);
  const drawHeight = pageHeight - (margin * 2);

  pages.forEach((page, idx) => {
    if (idx > 0) {
      pdf.addPage(pageSize.toLowerCase(), orientation);
    }
    
    // Add image to page
    pdf.addImage(
      page.dataUrl, 
      'JPEG', 
      margin, 
      margin, 
      drawWidth, 
      drawHeight,
      undefined,
      'FAST'
    );
  });

  return pdf.output('blob');
}
