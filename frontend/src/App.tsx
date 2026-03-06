import { Upload, Leaf, Info, ChevronRight, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

interface BreedInfo {
  name: string;
  origin: string;
  description: string;
}

interface Top5Item {
  breed: string;
  confidence: number;
}

interface PredictionResult {
  breed: string;
  confidence: number;
  top5: Top5Item[];
}

const CATTLE_BREEDS: BreedInfo[] = [
  { name: 'Alambadi', origin: 'Tamil Nadu', description: 'Sturdy draft breed from the Dharmapuri region' },
  { name: 'Amritmahal', origin: 'Karnataka', description: 'Renowned for strength and endurance' },
  { name: 'Ayrshire', origin: 'Scotland (Exotic)', description: 'High-yielding dairy breed common in crossbreeding' },
  { name: 'Banni', origin: 'Gujarat', description: 'Hardy buffalo breed from the Rann of Kutch' },
  { name: 'Bargur', origin: 'Tamil Nadu', description: 'Hill breed known for hardiness' },
  { name: 'Bhadawari', origin: 'Uttar Pradesh', description: 'Buffalo breed yielding high-fat milk' },
  { name: 'Brown Swiss', origin: 'Switzerland (Exotic)', description: 'Dual-purpose dairy and draft breed' },
  { name: 'Dangi', origin: 'Maharashtra', description: 'Medium-sized draft breed suited for hilly terrain' },
  { name: 'Deoni', origin: 'Maharashtra', description: 'Dual-purpose breed with spotted coat' },
  { name: 'Gir', origin: 'Gujarat', description: 'Known for high milk yield and disease resistance' },
  { name: 'Guernsey', origin: 'Channel Islands (Exotic)', description: 'Golden-coloured dairy breed with rich milk' },
  { name: 'Hallikar', origin: 'Karnataka', description: 'Popular draft breed in South India' },
  { name: 'Hariana', origin: 'Haryana', description: 'High milk-yielding white cattle' },
  { name: 'Holstein Friesian', origin: 'Netherlands (Exotic)', description: 'World\'s highest milk-producing dairy breed' },
  { name: 'Jaffrabadi', origin: 'Gujarat', description: 'Large buffalo breed known for high milk yield' },
  { name: 'Jersey', origin: 'Jersey Island (Exotic)', description: 'Compact dairy breed with very rich milk' },
  { name: 'Kangayam', origin: 'Tamil Nadu', description: 'Excellent draught and hardy breed' },
  { name: 'Kankrej', origin: 'Gujarat', description: 'Strong draft breed with medicinal milk' },
  { name: 'Kasargod', origin: 'Kerala', description: 'Dwarf breed adapted to coastal areas' },
  { name: 'Kenkatha', origin: 'Uttar Pradesh', description: 'Draft breed from the Bundelkhand region' },
  { name: 'Kherigarh', origin: 'Uttar Pradesh', description: 'Small-sized breed from the Terai region' },
  { name: 'Khillari', origin: 'Maharashtra', description: 'Fast and powerful draft breed' },
  { name: 'Krishna Valley', origin: 'Karnataka', description: 'River basin breed used for draft work' },
  { name: 'Malnad Gidda', origin: 'Karnataka', description: 'Miniature breed adapted to forests and hills' },
  { name: 'Mehsana', origin: 'Gujarat', description: 'Buffalo breed with high milk yield' },
  { name: 'Murrah', origin: 'Haryana/Punjab', description: 'World\'s best dairy buffalo breed' },
  { name: 'Nagori', origin: 'Rajasthan', description: 'Draft breed with good stamina' },
  { name: 'Nagpuri', origin: 'Maharashtra', description: 'Buffalo breed suited for semi-arid regions' },
  { name: 'Nili Ravi', origin: 'Punjab', description: 'Buffalo breed from the Ravi river basin' },
  { name: 'Nimari', origin: 'Madhya Pradesh', description: 'Medium-sized draft breed' },
  { name: 'Ongole', origin: 'Andhra Pradesh', description: 'Large-sized breed known for strength' },
  { name: 'Pulikulam', origin: 'Tamil Nadu', description: 'Athletic breed used in Jallikattu' },
  { name: 'Rathi', origin: 'Rajasthan', description: 'Dual-purpose breed for milk and draft' },
  { name: 'Red Dane', origin: 'Denmark (Exotic)', description: 'Red-coloured dairy breed used in crossbreeding' },
  { name: 'Red Sindhi', origin: 'Sindh', description: 'Hardy breed suitable for tropical climates' },
  { name: 'Sahiwal', origin: 'Punjab', description: 'Excellent dairy breed with heat tolerance' },
  { name: 'Surti', origin: 'Gujarat', description: 'Buffalo breed producing milk with high fat' },
  { name: 'Tharparkar', origin: 'Rajasthan', description: 'Drought-resistant with good milk production' },
  { name: 'Toda', origin: 'Tamil Nadu', description: 'Sacred buffalo breed of the Nilgiri hills' },
  { name: 'Umblachery', origin: 'Tamil Nadu', description: 'Compact breed suitable for wet lands' },
  { name: 'Vechur', origin: 'Kerala', description: 'Smallest cattle breed in the world' },
];

// Format breed name: Brown_Swiss → Brown Swiss
function formatBreedName(name: string) {
  return name.replace(/_/g, ' ');
}

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-32 shrink-0">{formatBreedName(label)}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-700 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-green-700 w-12 text-right">{pct}%</span>
    </div>
  );
}

function App() {
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
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

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
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* ── NAV ── */}
      <nav className="bg-white shadow-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="w-8 h-8 text-green-700" />
              <span className="text-2xl font-semibold text-green-900">IBCIB</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#home" className="text-green-700 hover:text-green-900 transition-colors">Home</a>
              <a href="#breeds" className="text-green-700 hover:text-green-900 transition-colors">Breeds</a>
              <a href="#classify" className="text-green-700 hover:text-green-900 transition-colors">Classify</a>
              <a href="#about" className="text-green-700 hover:text-green-900 transition-colors">About</a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="home" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
            <Leaf className="w-4 h-4 mr-2" />
            AI-Powered Conservation
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Indigenous Breed Classification
            <span className="block text-green-700 mt-2">of Indian Cattle</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Leveraging artificial intelligence to identify, preserve, and promote India's rich heritage of indigenous cattle breeds for sustainable agriculture and conservation.
          </p>
          <a
            href="#classify"
            className="inline-flex items-center px-8 py-4 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all transform hover:scale-105 shadow-lg text-lg font-medium"
          >
            Try the Classifier
            <ChevronRight className="w-5 h-5 ml-2" />
          </a>
        </div>
      </section>

      {/* ── BREEDS GRID ── */}
      <section id="breeds" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Indigenous Cattle Breeds of India
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover the diversity of India's native cattle breeds, each adapted to unique regional conditions and agricultural practices.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {CATTLE_BREEDS.map((breed, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 border border-green-100 hover:border-green-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Leaf className="w-8 h-8 text-green-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{breed.name}</h3>
                <p className="text-sm text-green-700 font-medium mb-2">{breed.origin}</p>
                <p className="text-sm text-gray-600">{breed.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLASSIFIER ── */}
      <section id="classify" className="py-20 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Classify Your Cattle
            </h2>
            <p className="text-lg text-gray-600">
              Upload an image to identify the breed using our AI model
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-green-100">

            {/* ── DROP ZONE ── */}
            {!previewUrl ? (
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
                  ${isDragging
                    ? 'border-green-500 bg-green-100 scale-[1.02]'
                    : 'border-green-300 bg-green-50/50 hover:bg-green-50 hover:border-green-400'
                  }`}
              >
                <Upload className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {isDragging ? 'Drop it!' : 'Upload Cattle Image'}
                </h3>
                <p className="text-gray-600 mb-6">Drag and drop or click to select an image</p>
                <button
                  type="button"
                  className="px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium pointer-events-none"
                >
                  Select Image
                </button>
                <p className="text-sm text-gray-500 mt-4">Supported formats: JPG, PNG, WebP</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>
            ) : (
              /* ── PREVIEW + CLASSIFY ── */
              <div className="space-y-6">
                <div className="relative rounded-xl overflow-hidden border border-green-100 shadow-md">
                  <img src={previewUrl} alt="Selected cattle" className="w-full max-h-72 object-contain bg-gray-50" />
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
                  className="w-full flex items-center justify-center gap-3 py-4 bg-green-700 text-white rounded-xl font-semibold text-lg hover:bg-green-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analysing…
                    </>
                  ) : (
                    <>
                      <Leaf className="w-5 h-5" />
                      Classify Breed
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── ERROR ── */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">Classification Failed</p>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* ── RESULTS ── */}
            {result && (
              <div className="mt-8 space-y-6 animate-fadeIn">
                {/* Top prediction */}
                <div className="p-6 bg-green-50 border border-green-200 rounded-xl flex items-start gap-4">
                  <CheckCircle className="w-7 h-7 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-700 font-medium uppercase tracking-wide mb-1">Predicted Breed</p>
                    <p className="text-3xl font-bold text-green-900">{formatBreedName(result.breed)}</p>
                    <p className="text-green-700 mt-1 font-semibold">
                      Confidence: {Math.round(result.confidence * 100)}%
                    </p>
                  </div>
                </div>

                {/* Top-5 breakdown */}
                <div className="p-6 bg-gray-50 border border-gray-100 rounded-xl">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-green-700" />
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
                  className="w-full py-3 border-2 border-green-300 text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors"
                >
                  Classify Another Image
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">About IBCIB</h2>
          </div>
          <div className="prose prose-lg max-w-none">
            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-8 md:p-12 border border-green-100 shadow-lg">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Preserving India's Cattle Heritage Through Technology
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                The Indigenous Breed Classification of Indian Cattle (IBCIB) project combines cutting-edge artificial intelligence
                with agricultural science to identify and preserve India's diverse native cattle breeds. These indigenous breeds
                have evolved over centuries to thrive in India's varied climatic conditions and play a crucial role in sustainable
                agriculture and rural livelihoods.
              </p>
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="text-center p-6 bg-white rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-700 mb-2">28+</div>
                  <div className="text-sm text-gray-600">Indigenous Breeds</div>
                </div>
                <div className="text-center p-6 bg-white rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-700 mb-2">AI</div>
                  <div className="text-sm text-gray-600">Powered Classification</div>
                </div>
                <div className="text-center p-6 bg-white rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-700 mb-2">10</div>
                  <div className="text-sm text-gray-600">Breeds Classified</div>
                </div>
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-3">Project Objectives</h4>
              <ul className="space-y-3 mb-6">
                {[
                  ['Conservation', 'Help preserve endangered indigenous cattle breeds through accurate identification'],
                  ['Agricultural Support', 'Assist farmers in breed identification for better breeding programs'],
                  ['Education', 'Raise awareness about the importance of indigenous cattle breeds'],
                  ['Research', 'Provide a technological tool for veterinary science and animal husbandry'],
                ].map(([title, desc], i) => (
                  <li key={i} className="flex items-start">
                    <ChevronRight className="w-5 h-5 text-green-700 mr-2 mt-0.5 shrink-0" />
                    <span className="text-gray-700">
                      <strong>{title}:</strong> {desc}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-gray-700 leading-relaxed">
                By leveraging machine learning and computer vision, IBCIB makes breed identification accessible to
                farmers, veterinarians, researchers, and conservationists across India.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-green-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Leaf className="w-6 h-6" />
                <span className="text-xl font-semibold">IBCIB</span>
              </div>
              <p className="text-green-200 text-sm">
                Preserving India's indigenous cattle heritage through AI-powered classification.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-green-200">
                {['home', 'breeds', 'classify', 'about'].map(link => (
                  <li key={link}>
                    <a href={`#${link}`} className="hover:text-white transition-colors capitalize">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Project Info</h4>
              <p className="text-sm text-green-200">
                An academic project focused on leveraging technology for agricultural conservation and livestock management.
              </p>
            </div>
          </div>
          <div className="border-t border-green-800 pt-8 text-center text-sm text-green-200">
            <p>© 2026 IBCIB – Indigenous Breed Classification of Indian Cattle. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
