
import React, { useState, useCallback, useRef } from 'react';
import { 
  FileUp, 
  Settings, 
  Download, 
  Printer, 
  FileText, 
  Layout, 
  ChevronRight, 
  Trash2, 
  Sparkles,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { PageSize, Orientation, PdfOptions, ProcessedPage, ImageMetadata } from './types';
import { generatePdfPages, createPdfBlob } from './services/pdfService';
import { analyzeDocument } from './services/geminiService';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [pages, setPages] = useState<ProcessedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [options, setOptions] = useState<PdfOptions>({
    pageSize: PageSize.A4,
    orientation: Orientation.Portrait,
    margin: 10,
    quality: 0.9
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const dataUrl = event.target?.result as string;
        setImage(dataUrl);
        setMetadata({
          name: file.name,
          width: img.width,
          height: img.height,
          type: file.type,
          size: file.size
        });
        
        // Auto process initially
        processImage(dataUrl, img.width, img.height, options);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processImage = useCallback(async (dataUrl: string, width: number, height: number, opts: PdfOptions) => {
    setIsProcessing(true);
    try {
      const processed = await generatePdfPages(dataUrl, width, height, opts);
      setPages(processed);
      
      // AI analysis - optional side feature
      analyzeDocument(dataUrl).then(setAiAnalysis).catch(console.error);
    } catch (err) {
      console.error("Processing failed", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleOptionChange = (newOptions: Partial<PdfOptions>) => {
    const updated = { ...options, ...newOptions };
    setOptions(updated);
    if (image && metadata) {
      processImage(image, metadata.width, metadata.height, updated);
    }
  };

  const handleDownload = async () => {
    if (pages.length === 0) return;
    setIsGenerating(true);
    try {
      const blob = await createPdfBlob(pages, options);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${metadata?.name.split('.')[0] || 'document'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setImage(null);
    setMetadata(null);
    setPages([]);
    setAiAnalysis('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Layout className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">长图转PDF</h1>
        </div>
        <div className="flex items-center gap-4">
          {image && (
            <button 
              onClick={reset}
              className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors"
              title="清除当前图片"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button 
            disabled={pages.length === 0 || isGenerating}
            onClick={handleDownload}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg active:scale-95 ${
              pages.length === 0 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isGenerating ? '生成中...' : '下载 PDF'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {!image ? (
          /* Empty State / Uploader */
          <div className="max-w-2xl mx-auto text-center mt-20">
            <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-slate-300 shadow-sm hover:border-blue-400 transition-colors group">
              <div className="bg-blue-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <FileUp className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">上传您的长图</h2>
              <p className="text-slate-500 mb-8">
                自动将长截图、网页截图或文档图片转换为可完美打印的多页 PDF 文件。
              </p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
              >
                选择图片
              </button>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6">
              {[
                { icon: Printer, title: '打印就绪', desc: '适配 A4/Letter 纸张' },
                { icon: FileText, title: '自动分页', desc: '智能切分长图内容' },
                { icon: Sparkles, title: 'AI 增强', desc: '智能内容结构分析' }
              ].map((item, idx) => (
                <div key={idx} className="p-4">
                  <item.icon className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-slate-700">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Editor State */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Settings */}
            <aside className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-sm uppercase tracking-wider text-slate-500">文档设置</span>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">页面尺寸</label>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.values(PageSize).map(size => (
                        <button
                          key={size}
                          onClick={() => handleOptionChange({ pageSize: size })}
                          className={`px-4 py-2 text-sm rounded-lg border transition-all text-left flex items-center justify-between ${
                            options.pageSize === size 
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold' 
                            : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {size}
                          {options.pageSize === size && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">页面方向</label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      {[
                        { key: Orientation.Portrait, label: '纵向' },
                        { key: Orientation.Landscape, label: '横向' }
                      ].map(orient => (
                        <button
                          key={orient.key}
                          onClick={() => handleOptionChange({ orientation: orient.key })}
                          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                            options.orientation === orient.key 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {orient.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">页边距 (mm)</label>
                      <span className="text-xs text-slate-400">{options.margin}mm</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="50" 
                      step="5"
                      value={options.margin}
                      onChange={(e) => handleOptionChange({ margin: parseInt(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">导出质量</label>
                      <span className="text-xs text-slate-400">{Math.round(options.quality * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="1" 
                      step="0.1"
                      value={options.quality}
                      onChange={(e) => handleOptionChange({ quality: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* AI Insights Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center gap-2 mb-3 text-blue-700">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold">AI 洞察</h3>
                </div>
                {aiAnalysis ? (
                  <p className="text-sm text-blue-800/80 leading-relaxed italic">
                    "{aiAnalysis}"
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在分析内容...
                  </div>
                )}
              </div>
            </aside>

            {/* Right: Preview */}
            <section className="lg:col-span-9 space-y-6">
              <div className="bg-slate-200 rounded-2xl p-8 min-h-[600px] flex flex-col items-center gap-12 shadow-inner overflow-y-auto max-h-[80vh]">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                    <p className="font-medium">正在分割文档页面...</p>
                  </div>
                ) : (
                  pages.map((page, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -top-6 left-0 flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <span>第 {idx + 1} 页</span>
                        <ChevronRight className="w-3 h-3" />
                        <span>{options.pageSize}</span>
                      </div>
                      <div className="bg-white shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]">
                        <img 
                          src={page.dataUrl} 
                          alt={`第 ${idx + 1} 页`}
                          className="max-w-full h-auto block"
                          style={{
                            width: options.orientation === Orientation.Portrait ? '595px' : '842px'
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex justify-center text-slate-500 text-sm italic">
                共 {pages.length} 页 • 源图尺寸 {metadata?.width}x{metadata?.height}px
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Floating Action for Mobile */}
      {image && !isProcessing && (
        <div className="fixed bottom-6 right-6 lg:hidden">
           <button 
            onClick={handleDownload}
            className="bg-blue-600 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-transform"
          >
            <Download className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
