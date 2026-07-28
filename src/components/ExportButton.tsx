import React, { useCallback } from 'react';
import { Printer } from 'lucide-react';
import { RLB_LOGO } from './logo';

interface ExportButtonProps {
  title?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ title = 'True Margin CPG Report' }) => {
  const handlePrint = useCallback(() => {
    // Build a print-friendly version
    const printContent = document.querySelector('.flex-1.overflow-y-auto');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Use embedded logo constant
    const logoSrc = RLB_LOGO;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; color: #1a1a2e; background: white; font-size: 11px; }
          .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #1a1a2e; }
          .header img { height: 48px; }
          .header h1 { font-size: 20px; letter-spacing: 2px; color: #1a1a2e; }
          .header .date { margin-left: auto; color: #666; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th { background: #f0f0f5; font-size: 9px; text-transform: uppercase; padding: 6px 8px; text-align: left; border-bottom: 2px solid #ddd; }
          td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
          .font-mono { font-family: 'SF Mono', 'Fira Code', monospace; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .text-error, .text-red { color: #dc2626; }
          .text-success, .text-green { color: #16a34a; }
          .text-warning, .text-yellow { color: #d97706; }
          .accent { color: #4f46e5; font-weight: 600; }
          .section { margin: 20px 0; page-break-inside: avoid; }
          .section-title { font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #1a1a2e; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
          .card { border: 1px solid #e5e5ea; border-radius: 8px; padding: 12px; margin: 8px 0; page-break-inside: avoid; }
          .status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
          .status-green { background: #16a34a; }
          .status-yellow { background: #d97706; }
          .status-red { background: #dc2626; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f5f5f5; }
          .row-label { color: #555; }
          .row-value { font-family: 'SF Mono', monospace; font-weight: 500; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 2px solid #1a1a2e; text-align: center; font-size: 9px; color: #999; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
          .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 24px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
          .print-btn:hover { background: #4338ca; }
          input[type="number"], input[type="range"] { display: none; }
          .input { display: none; }
          .alert { padding: 8px 12px; border-radius: 6px; margin: 8px 0; font-size: 10px; }
        </style>
      </head>
      <body>
        <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
        <div class="header">
          <img src="${logoSrc}" alt="RLB Logo" />
          <h1>TRUE MARGIN CPG</h1>
          <div class="date">Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        ${printContent.innerHTML}
        <div class="footer">
          © ${new Date().getFullYear()} Right Lane Brands, Inc. All Rights Reserved. | Confidential — For Internal Use Only
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [title]);

  return (
    <button onClick={handlePrint} className="btn btn-sm btn-outline gap-2">
      <Printer size={14} />
      Export / Print
    </button>
  );
};
