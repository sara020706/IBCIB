import { useState, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

interface Top5Item {
  breed: string;
  confidence: number;
}

interface PredictionResult {
  breed: string;
  confidence: number;
  top5: Top5Item[];
}

function formatBreedName(name: string) {
  return name.replace(/_/g, ' ');
}

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-32 shrink-0">{formatBreedName(label)}</span>
      <div className="flex-1 bg-[#e5eeff] rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#006c49] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-[#006c49] w-12 text-right">{pct}%</span>
    </div>
  );
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const clearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const classify = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const res = await fetch(`${API_URL}/predict`, { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Server error (${res.status})`);
      }
      const data: PredictionResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        setError('Cannot connect to the API. Make sure the backend server is running on port 8000.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#f8f9ff] font-['Inter'] text-[#121c28] scroll-smooth">

      {/* ── TOP NAVIGATION BAR ── */}
      <header className="sticky top-0 w-full z-50 bg-[#f8f9ff]/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(18,28,40,0.06)]">
        <nav className="flex justify-between items-center w-full px-8 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-black text-[#004532] tracking-tighter font-['Plus_Jakarta_Sans']">IBCIB</div>
          <div className="hidden md:flex items-center space-x-8 font-['Plus_Jakarta_Sans'] font-bold tracking-tight">
            <a className="text-[#065F46] border-b-2 border-[#065F46] pb-1" href="#home">Home</a>
            <a className="text-slate-600 hover:text-[#065F46] transition-colors" href="#explore">Breeds</a>
            <a className="text-slate-600 hover:text-[#065F46] transition-colors" href="#classify">Classify</a>
            <a className="text-slate-600 hover:text-[#065F46] transition-colors" href="#about">About</a>
          </div>
          <a
            href="#classify"
            className="bg-[#004532] text-white px-6 py-2.5 rounded-full font-bold hover:opacity-80 transition-all duration-300 active:scale-95"
          >
            Try the Classifier
          </a>
        </nav>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-[921px] flex items-center overflow-hidden bg-[#f8f9ff] pt-20" id="home">
          <div className="max-w-7xl mx-auto px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#6ffbbe] text-[#002113] rounded-full text-xs font-bold tracking-widest uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#004532] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#004532]"></span>
                </span>
                AI-Powered Conservation
              </div>
              <h1 className="text-5xl lg:text-7xl font-black font-['Plus_Jakarta_Sans'] text-[#004532] leading-[1.1] tracking-tighter">
                Preserving India's <span className="text-[#006c49]">Bovine Legacy</span>
              </h1>
              <p className="text-lg text-[#3f4944] leading-relaxed max-w-xl">
                Identify and document 28+ indigenous Indian cattle breeds using our state-of-the-art AI classifier. Join the digital conservatory of agricultural heritage.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  className="bg-[#004532] text-white px-8 py-4 rounded-[1rem] font-bold text-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
                  href="#classify"
                >
                  Try the Classifier
                  <span className="material-symbols-outlined">rocket_launch</span>
                </a>
                <a
                  className="bg-[#d9e3f4] text-[#121c28] px-8 py-4 rounded-[1rem] font-bold text-lg hover:bg-[#dfe9fa] transition-all flex items-center gap-2"
                  href="#explore"
                >
                  Explore Breeds
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-[1rem] overflow-hidden aspect-square shadow-2xl">
                <img
                  alt="Indigenous Indian Cattle"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4amV_N_myvICtEU4PB_3Q0MIiZ8DV8E8zfoQea_QFTbrnBZ8qkCE_bBRENBs2j7ox9dl3BBZqg7VeJ0Q6eRA5NMH61-x2Yab6V5SwEptzfMdusq4_Y1o5nlIiVK6aVE_sPOgReNfJKQeh1-GIqK9NueoW0zjMlTo3_vmVjMoRGdXE8a5Wqsr_mxAFesZi40awPWnKJFEUel1XONvn6pok1uwD-IHK08FIZ0vvpTsmzprnaP98VHJCcFyUnfQRYVvoYbLSUD1Wvg4"
                />
              </div>
              {/* Overlapping Glass Card */}
              <div className="absolute -bottom-6 -left-6 lg:-left-12 glass-card p-6 rounded-[1rem] shadow-xl border border-[#bec9c2]/15 max-w-xs">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-[#6ffbbe] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#004532]">analytics</span>
                  </div>
                  <div>
                    <div className="text-xs text-[#3f4944] font-bold uppercase tracking-wider">Classification Accuracy</div>
                    <div className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#004532]">98.4%</div>
                  </div>
                </div>
                <p className="text-sm text-[#3f4944]">Validated against expert veterinary morphological data.</p>
              </div>
            </div>
          </div>
          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#a6f2d1]/20 to-transparent -z-10 pointer-events-none"></div>
        </section>

        {/* ── METRICS TICKER ── */}
        <section className="bg-[#eef4ff] py-12">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#004532]">28+</div>
                <div className="text-sm text-[#3f4944] font-medium">Indigenous Breeds</div>
              </div>
              <div>
                <div className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#004532]">15k+</div>
                <div className="text-sm text-[#3f4944] font-medium">Dataset Images</div>
              </div>
              <div>
                <div className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#004532]">10+</div>
                <div className="text-sm text-[#3f4944] font-medium">State Classifications</div>
              </div>
              <div>
                <div className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#004532]">99%</div>
                <div className="text-sm text-[#3f4944] font-medium">Uptime Reliable</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BREED EXPLORER ── */}
        <section className="py-24 bg-[#f8f9ff]" id="explore">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="space-y-4">
                <h2 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#004532] tracking-tight">Breed Explorer</h2>
                <p className="text-[#3f4944] max-w-lg">Discover the distinct characteristics and geographical origins of India's most iconic indigenous cattle.</p>
              </div>
              <div className="flex gap-2">
                <button className="p-3 rounded-full bg-[#e5eeff] hover:bg-[#dfe9fa] transition-colors">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="p-3 rounded-full bg-[#004532] text-white hover:opacity-90 transition-all">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Breed Card 1: Gir */}
              <div className="group relative overflow-hidden rounded-[1rem] aspect-[3/4]">
                <img
                  alt="Gir Cattle"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGR3cK9o4J9eyI5hYff7wsRcPHyWIVTuxfjRcN3yobr5fXtMR-1hjns05dzmtQnGsv1mDhpZHTdGSLYH5Wv1PifLwijvBQr0kdYwhezOfQAkx2RkX4uKKnsGntjoeXL3GQr7cXXKpwdHeVOvS1zFSer1PNR_x6SKGIlJLhEWApWqoLR9U9Uqh_ogcDN3sRfXVPxA26kjyqe5H3-BGDWhmGWJYTiuKDxHmSRuZ1hWrdPVqAeNtwMO4nPBd4oDGkSiQv9UJaqbmNLzU"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#004532]/90 via-[#004532]/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <span className="inline-block px-3 py-1 bg-[#6ffbbe] text-[#002113] text-[10px] font-bold rounded-full mb-3 tracking-widest uppercase">Gujarat</span>
                  <h3 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-2">Gir</h3>
                  <p className="text-white/80 text-sm mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Famous for milk production and tolerance to stress.</p>
                  <button className="w-full py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-[0.75rem] hover:bg-white/20 transition-all">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Breed Card 2: Tharparkar */}
              <div className="group relative overflow-hidden rounded-[1rem] aspect-[3/4]">
                <img
                  alt="Tharparkar Cattle"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiCbJSxmzpLpkvJms9S5D2_NWUWUZqx1RPl7IrGpHoFv_0CRuGbZ5NarwHRSlQ8qBjWhPfkikM1Xy5m5erNzcm2VQk51M-b6Ak65vhf3myT6I8F1wT2ijXVCtL7neE_IUsGFqXyfH2zB7oufoxmu8gUOOfCNVHJMaaRuMc1pzXozlFB6creswSXJYUPFWzFJS0n_mhJVZwssoNqpYl4e24HVOmDJcdNQNVusf392u2kEtRWXAaPfiyL3ornp3oKmW2o5WtdFrYKEw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#004532]/90 via-[#004532]/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <span className="inline-block px-3 py-1 bg-[#6ffbbe] text-[#002113] text-[10px] font-bold rounded-full mb-3 tracking-widest uppercase">Rajasthan</span>
                  <h3 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-2">Tharparkar</h3>
                  <p className="text-white/80 text-sm mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">A dual-purpose breed known for disease resistance.</p>
                  <button className="w-full py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-[0.75rem] hover:bg-white/20 transition-all">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Breed Card 3: Hallikar */}
              <div className="group relative overflow-hidden rounded-[1rem] aspect-[3/4]">
                <img
                  alt="Hallikar Cattle"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzI_CP-7BQj6prADDO9X5aD4BJ4inXLHjf1baCHsRIiC6AaT-ISrh1Pb7sDDOrxiySHJZLU8S-BuHEMwQJspe5DGxVI8ubhh8uqbLyRI2mFM5jg_p1DtdmSvNFYUDMiTOPZ8xlnEl-uiK--q147YEDnwUbseZuFispYMLVZadhN01M3Jt6hc8ia1nVYcaOP1_KYv5E8WonXS6SMXlGiUUEWymh5vUSw9K4hFUUYb9js7HU18RFq-g4glSmhXMEJuE39aSW-ivZmUo"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#004532]/90 via-[#004532]/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <span className="inline-block px-3 py-1 bg-[#6ffbbe] text-[#002113] text-[10px] font-bold rounded-full mb-3 tracking-widest uppercase">Karnataka</span>
                  <h3 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-2">Hallikar</h3>
                  <p className="text-white/80 text-sm mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Premium draught breed with unique long horns.</p>
                  <button className="w-full py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-[0.75rem] hover:bg-white/20 transition-all">
                    Learn More
                  </button>
                </div>
              </div>

              {/* Breed Card 4: Ongole */}
              <div className="group relative overflow-hidden rounded-[1rem] aspect-[3/4]">
                <img
                  alt="Ongole Cattle"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAGYMVppLZ4yBQbkbAPWPSF0HsIPViIsI6y5rkwdj3-2Aolwv2ouy6hsLymLjT_jq3pWEm8o0xOQqVZk0-5GleD_xWxXYqTKmUd0oet7LeRfkg7XsTwR6Faq0ZybHO6a9kb26Jc5URb3m1JLCxwF3_7OgSeo-UesnX41ycySH-Wsy7diUhMSwnjsmfdWriblklIU8Cydhpdd_R4RKb-2U0VQd05diGnM3iJ7XVrMMfRv_Pn6rm8HXtg2svikUoLBiFpJHojSc_F0ss"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#004532]/90 via-[#004532]/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <span className="inline-block px-3 py-1 bg-[#6ffbbe] text-[#002113] text-[10px] font-bold rounded-full mb-3 tracking-widest uppercase">Andhra Pradesh</span>
                  <h3 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-2">Ongole</h3>
                  <p className="text-white/80 text-sm mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Renowned globally for meat and draught capacity.</p>
                  <button className="w-full py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-[0.75rem] hover:bg-white/20 transition-all">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── AI CATTLE CLASSIFIER ── */}
        <section className="py-24 bg-[#eef4ff]" id="classify">
          <div className="max-w-4xl mx-auto px-8">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#004532] tracking-tight">AI Breed Classifier</h2>
              <p className="text-[#3f4944]">Upload a clear photo of the cattle to identify its breed instantly.</p>
            </div>

            <div className="glass-card rounded-[1rem] p-8 shadow-2xl border border-white">
              {/* Dropzone or Preview */}
              {!previewUrl ? (
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[1rem] p-12 text-center flex flex-col items-center gap-6 cursor-pointer group transition-colors ${isDragging ? 'border-[#006c49] bg-[#6ffbbe]/20' : 'border-[#bec9c2]/50 hover:border-[#004532]'
                    }`}
                >
                  <div className={`w-20 h-20 rounded-full bg-[#e5eeff] flex items-center justify-center text-[#004532] group-hover:scale-110 transition-transform ${isDragging ? 'scale-110' : ''}`}>
                    <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-[#004532]">{isDragging ? 'Drop it here!' : 'Drag and drop breed photo'}</p>
                    <p className="text-[#3f4944]">Supported formats: JPG, PNG (Max 5MB)</p>
                  </div>
                  <button
                    type="button"
                    className="px-6 py-3 bg-[#004532] text-white rounded-[1rem] font-bold pointer-events-none"
                  >
                    Select File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={onFileChange}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative rounded-[1rem] overflow-hidden border border-[#bec9c2]/30 shadow-md">
                    <img src={previewUrl} alt="Selected cattle" className="w-full max-h-72 object-contain bg-[#e5eeff]" />
                    <button
                      onClick={clearImage}
                      className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-white rounded-full shadow transition-colors"
                      title="Remove image"
                    >
                      <X className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                  <button
                    onClick={classify}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-[#004532] text-white rounded-[1rem] font-bold text-lg hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">biotech</span>
                        Classify Breed
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-6 p-4 bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-[0.75rem] flex gap-3 items-start">
                  <span className="material-symbols-outlined text-[#ba1a1a] mt-0.5 shrink-0">error</span>
                  <div>
                    <p className="font-semibold text-[#93000a]">Classification Failed</p>
                    <p className="text-sm text-[#93000a]/80 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Result Preview */}
              {result && (
                <div className="mt-12 p-6 bg-[#e5eeff] rounded-[1rem] animate-fadeIn">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-32 h-32 bg-slate-200 rounded-[1rem] overflow-hidden shrink-0">
                      {previewUrl && (
                        <img alt="Uploaded image" className="w-full h-full object-cover" src={previewUrl} />
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs font-bold text-[#006c49] uppercase tracking-widest">Prediction Result</div>
                          <div className="text-2xl font-black text-[#004532] font-['Plus_Jakarta_Sans']">{formatBreedName(result.breed)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-[#3f4944]">Confidence</div>
                          <div className="text-xl font-bold text-[#004532]">{Math.round(result.confidence * 100)}%</div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-[#f8f9ff] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#006c49] transition-all duration-700"
                          style={{ width: `${Math.round(result.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Top-5 */}
                  <div className="p-4 bg-white/60 rounded-[0.75rem]">
                    <h4 className="font-semibold text-[#121c28] mb-4 flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[#006c49] text-base">leaderboard</span>
                      Top 5 Predictions
                    </h4>
                    <div className="space-y-3">
                      {result.top5.map((item, i) => (
                        <ConfidenceBar key={i} label={item.breed} value={item.confidence} />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={clearImage}
                    className="mt-4 w-full py-3 border-2 border-[#bec9c2] text-[#3f4944] font-semibold rounded-[1rem] hover:bg-white/50 hover:border-[#006c49] hover:text-[#006c49] transition-all"
                  >
                    Classify Another Image
                  </button>
                </div>
              )}
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex justify-center gap-8 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-sm font-medium">Expert Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49]" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
                <span className="text-sm font-medium">Real-time Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49]" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                <span className="text-sm font-medium">Private &amp; Secure</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── ABOUT ── */}
        <section className="py-24 bg-[#f8f9ff]" id="about">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative">
                {/* Bento Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#065f46] p-8 rounded-[1rem] text-[#8bd6b7] h-64 flex flex-col justify-end">
                    <span className="material-symbols-outlined text-4xl mb-4">genetics</span>
                    <h4 className="text-xl font-bold leading-tight font-['Plus_Jakarta_Sans']">Genetic Conservation</h4>
                  </div>
                  <div className="bg-[#6cf8bb] p-8 rounded-[1rem] text-[#00714d] h-48 flex flex-col justify-end">
                    <span className="material-symbols-outlined text-4xl mb-4">memory</span>
                    <h4 className="text-xl font-bold leading-tight font-['Plus_Jakarta_Sans']">Neural Networks</h4>
                  </div>
                  <div className="col-span-2 bg-[#d9e3f4] p-8 rounded-[1rem] text-[#004532] h-48 flex items-center gap-6">
                    <div className="text-5xl font-black font-['Plus_Jakarta_Sans']">28</div>
                    <div className="text-lg leading-tight font-medium">Breeds documented across the Indian subcontinent</div>
                  </div>
                </div>
                {/* Floating Image */}
                <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full border-8 border-[#f8f9ff] overflow-hidden shadow-xl hidden lg:block">
                  <img
                    alt="Detail"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdgrAx8LvX_O0O7861OPWEydwt4r0wW6CUq5yTyWhdExcW0RQQSqnsh5p6TIGSq7erjz47KggUqyRBsxk9Z7ErJF0VKPX_6Pbnbb-S0KJQ0LEOUdxTPJ4XPPutp9PN4dKsOQXvHDJOUGkfwaKvgRLUz3xz8yrkPzWtsvwohgcvgWTYxPZtEmBj0BjgOr1ntXMGMNi8yRRneAcGio8ZSSlJZlpjW78uvH8MiWlkGkmsI6AhZujdcu0dgkbQ73GW-WD-8C0RAbNesbs"
                  />
                </div>
              </div>

              <div className="order-1 lg:order-2 space-y-8">
                <h2 className="text-4xl lg:text-5xl font-black font-['Plus_Jakarta_Sans'] text-[#004532] tracking-tight">The Digital Conservatory</h2>
                <p className="text-lg text-[#3f4944] leading-relaxed">
                  IBCIB is a pioneering project dedicated to the Indigenous Breed Classification of Indian Cattle. Our mission is to bridge the gap between traditional agricultural knowledge and cutting-edge artificial intelligence.
                </p>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-[0.75rem] bg-[#e5eeff] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#004532]">eco</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-[#004532] mb-1">Preserve Biodiversity</h5>
                      <p className="text-sm text-[#3f4944]">Maintaining the genetic integrity of native breeds helps ensure sustainable agriculture for future generations.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-[0.75rem] bg-[#e5eeff] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#004532]">school</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-[#004532] mb-1">Empower Farmers</h5>
                      <p className="text-sm text-[#3f4944]">Providing accessible identification tools allows livestock owners to better manage their herds and value indigenous breeds.</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <button className="px-8 py-4 bg-[#004532] text-white rounded-[1rem] font-bold text-lg hover:opacity-90 transition-all">Read Research Papers</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#eef4ff] w-full pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <div className="text-xl font-bold text-[#004532] font-['Plus_Jakarta_Sans']">IBCIB</div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Advancing agricultural science through artificial intelligence. Preserving the heritage of Indian livestock for a sustainable future.
            </p>
            <div className="flex gap-4">
              {['public', 'share', 'mail'].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#004532] hover:bg-[#004532] hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-sm">{icon}</span>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h6 className="text-[#004532] font-bold mb-6">Quick Links</h6>
            <ul className="space-y-4">
              {[['Home', '#home'], ['Research Papers', '#'], ['Documentation', '#'], ['Contact Us', '#']].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-slate-500 hover:text-[#065F46] transition-colors text-sm">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h6 className="text-[#004532] font-bold mb-6">Support</h6>
            <ul className="space-y-4">
              {['Privacy Policy', 'Terms of Service', 'Community Guidelines', 'API Access'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-500 hover:text-[#065F46] transition-colors text-sm">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 mt-16 pt-8 border-t border-slate-200 text-center">
          <p className="text-slate-500 text-sm leading-relaxed">
            © 2024 IBCIB - Indigenous Breed Classification of Indian Cattle. Preserving Agricultural Heritage through AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
