import React, { useState } from 'react';
import { Plus, Minus, X, CheckCircle2, ChevronRight, TrendingUp, Search, LayoutGrid, List } from 'lucide-react';

// --- MOCK DATA (Diurutkan berdasarkan potensi Gross/Margin tertinggi untuk Anda) ---
const initialAssets = [
  { id: 'saham_idx', name: 'Saham IDX', desc: 'Saham IDX via LTS. Potensi return tinggi, volatilitas signifikan.', value: 0, percentage: 0.0, type: 'high', active: false, color: 'border-orange-400', text: 'text-orange-500', gross: '12%', net: '11.6%' },
  { id: 'sp500', name: 'S&P 500 (VOO)', desc: 'Indeks saham AS. Return historis ~10% USD/tahun.', value: 0, percentage: 0.0, type: 'high', active: false, color: 'border-purple-500', text: 'text-purple-600', gross: '10.5%', net: '9.5%' },
  { id: 'gold', name: 'Emas / Gold', desc: 'Emas fisik/digital. Return ~9%/thn IDR. Biaya efektif.', value: 0, percentage: 0.0, type: 'med', active: false, color: 'border-yellow-500', text: 'text-yellow-600', gross: '9%', net: '7.5%' },
  { id: 'reksadana_ob', name: 'Reksadana Obligasi', desc: 'Reksa dana obligasi. Return lebih tinggi, sedikit fluktuasi.', value: 30000000, percentage: 30.0, type: 'med', active: true, color: 'border-indigo-500', text: 'text-indigo-600', gross: '6.5%', net: '5.9%' },
  { id: 'reksadana_pu', name: 'Reksadana Pasar Uang', desc: 'Reksa dana pasar uang. Stabil untuk dana darurat.', value: 12500000, percentage: 12.5, type: 'low', active: true, color: 'border-emerald-400', text: 'text-emerald-500', gross: '5.1%', net: '4.6%' },
  { id: 'bank_digital', name: 'Bank Digital', desc: 'Tabungan bank digital (Blu, Jago). Bunga lebih tinggi.', value: 10430000, percentage: 10.4, type: 'low', active: true, color: 'border-cyan-400', text: 'text-cyan-500', gross: '4%', net: '3.2%' },
  { id: 'valas', name: 'Valas USD', desc: 'Simpanan USD. Return dari apresiasi kurs historis.', value: 0, percentage: 0.0, type: 'med', active: false, color: 'border-teal-500', text: 'text-teal-600', gross: '3.5%', net: '3.5%' },
  { id: 'cash', name: 'Cash / Bank', desc: 'Uang fisik atau tabungan bank biasa. Likuid penuh.', value: 2000000, percentage: 2.0, type: 'low', active: true, color: 'border-blue-500', text: 'text-blue-600', gross: '1%', net: '0.8%' }
];

const formatRp = (num) => {
  if (num === 0) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
};

export default function App() {
  const [uiMode, setUiMode] = useState('option-2'); // option-1, option-2, option-3
  const [assets, setAssets] = useState(initialAssets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [innerTab, setInnerTab] = useState('portfolio'); // For Option 3

  // Handlers
  const toggleActive = (id) => {
    setAssets(assets.map(a => a.id === id ? { ...a, active: !a.active } : a));
    // Auto close modal if all assets are active
    if (isModalOpen && assets.filter(a => !a.active).length <= 1) {
        setIsModalOpen(false);
    }
  };

  const activeAssets = assets.filter(a => a.active);
  const inactiveAssets = assets.filter(a => !a.active);

  // --- REUSABLE COMPONENTS ---
  const FullCard = ({ asset }) => (
    <div className={`bg-white rounded-xl border-t-4 ${asset.color} border-x border-b border-gray-200 p-5 shadow-sm transition-all flex flex-col h-full relative group`}>
      <button 
        onClick={() => toggleActive(asset.id)}
        className="absolute -top-3 -right-3 z-10 bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-red-500 hover:border-red-200 rounded-full p-1.5 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
        title="Hapus dari alokasi"
      >
        <X size={16} strokeWidth={3} />
      </button>

      <div className="flex justify-between items-start mb-2 pr-4">
        <h3 className="font-bold text-gray-800 text-lg leading-tight">{asset.name}</h3>
        <span className={`font-bold text-lg ${asset.text}`}>{asset.percentage.toFixed(1)}%</span>
      </div>
      <p className="text-xs text-gray-500 mb-4 flex-grow line-clamp-2">{asset.desc}</p>
      
      <div className="flex space-x-2 mb-4">
        <span className="text-[10px] font-semibold tracking-wider text-cyan-700 bg-cyan-50 px-2 py-1 rounded">LIKUID: T+0</span>
        <span className="text-[10px] font-semibold tracking-wider text-gray-600 bg-gray-100 px-2 py-1 rounded">RISIKO: {asset.type.toUpperCase()}</span>
      </div>

      <div className="mb-4">
        <label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wide">Nilai Aset Saat Ini</label>
        <div className="flex items-center">
          <div className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 bg-gray-50 flex items-center">
             <span className="text-gray-400 mr-2 text-sm font-medium">Rp</span>
             <input type="text" readOnly value={formatRp(asset.value)} className="bg-transparent font-bold text-gray-700 w-full outline-none" />
          </div>
          <button className="border-y border-r border-gray-300 px-3 py-2 bg-white text-gray-500 hover:bg-gray-100 transition-colors"><Minus size={16}/></button>
          <button className="border-y border-r border-gray-300 rounded-r-md px-3 py-2 bg-white text-gray-500 hover:bg-gray-100 transition-colors"><Plus size={16}/></button>
        </div>
        <input type="range" className="w-full mt-3 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
      </div>

      <div className="mb-4 pt-4 border-t border-gray-100">
        <label className="text-[11px] font-bold text-blue-600 mb-1.5 block uppercase tracking-wide">+ Rencana Nabung Rutin</label>
        <div className="flex items-center">
          <div className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 bg-white flex items-center focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
             <span className="text-gray-400 mr-2 text-sm">Rp</span>
             <input type="text" placeholder="0 (opsional)" className="bg-transparent w-full outline-none text-sm font-medium text-gray-700 placeholder-gray-300" />
          </div>
          <button className="border-y border-r border-gray-300 px-3 py-2 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"><Minus size={16}/></button>
          <button className="border-y border-r border-gray-300 rounded-r-md px-3 py-2 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"><Plus size={16}/></button>
        </div>
      </div>

      <div className="flex justify-between text-xs pt-3 border-t border-gray-100 mt-auto bg-gray-50 -mx-5 -mb-5 p-4 rounded-b-xl">
        <span className="text-gray-500 flex flex-col">
          <span className="text-[10px] uppercase tracking-wider mb-0.5">Gross Return</span>
          <span className="font-bold text-gray-700">{asset.gross}/thn</span>
        </span>
        <span className="text-gray-500 flex flex-col text-right">
          <span className="text-[10px] uppercase tracking-wider mb-0.5">After-Tax</span>
          <span className="font-bold text-green-600">{asset.net}/thn</span>
        </span>
      </div>
    </div>
  );

  const MiniCard = ({ asset, onClick }) => (
    <div 
      onClick={() => {
        toggleActive(asset.id);
        if(onClick) onClick();
      }}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between group h-full"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${asset.color.replace('border-', 'bg-')}`}></div>
          <h3 className="font-bold text-gray-800 text-sm">{asset.name}</h3>
        </div>
        <button className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <Plus size={14} strokeWidth={3} />
        </button>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{asset.desc}</p>
      <div className="flex items-center gap-2 mt-auto">
        <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded">Risiko: {asset.type.toUpperCase()}</span>
        <span className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-700 rounded flex items-center gap-1">
          <TrendingUp size={10} /> {asset.net}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* UI SELECTOR (FOR DEMO PURPOSES) */}
      <div className="bg-gray-900 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-sm text-gray-300">Pilih Arsitektur UX:</span>
          <div className="flex bg-gray-800 p-1 rounded-lg">
            <button onClick={() => setUiMode('option-1')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${uiMode === 'option-1' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Opsi 1: Scroll Carousel</button>
            <button onClick={() => setUiMode('option-2')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${uiMode === 'option-2' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Opsi 2: Top Modal (Rekomen)</button>
            <button onClick={() => setUiMode('option-3')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${uiMode === 'option-3' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Opsi 3: Tab System</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* ================= OPTION 1: STATUS QUO ================= */}
        {uiMode === 'option-1' && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-gray-900">Simulasi Portofolio</h1>
              <p className="text-gray-500">Atur alokasi modal dan kontribusi rutin Anda.</p>
            </div>

            <div className="mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeAssets.map(asset => <FullCard key={asset.id} asset={asset} />)}
              </div>
            </div>

            {inactiveAssets.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Eksplorasi Aset Lainnya</h2>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory custom-scrollbar">
                  {inactiveAssets.map(asset => (
                    <div key={asset.id} className="min-w-[280px] snap-start">
                      <MiniCard asset={asset} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= OPTION 2: TOP-ACTION MODAL (RECOMMENDED) ================= */}
        {uiMode === 'option-2' && (
          <div className="animate-in fade-in duration-300">
            
            {/* Action Header - Sticky slightly below main header if needed */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1 text-gray-900">Portofolio Anda</h1>
                <p className="text-gray-500 text-sm">Total {activeAssets.length} instrumen aktif dialokasikan.</p>
              </div>
              
              {/* PRIMARY ACTION BUTTON - NO SCROLL NEEDED */}
              <button 
                onClick={() => setIsModalOpen(true)}
                disabled={inactiveAssets.length === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-sm transition-all
                  ${inactiveAssets.length === 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5'}`}
              >
                <Plus size={20} />
                Tambah Instrumen Baru
              </button>
            </div>

            {/* Active Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeAssets.map(asset => <FullCard key={asset.id} asset={asset} />)}
            </div>

            {/* THE MODAL OVERLAY */}
            {isModalOpen && (
              <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Katalog Instrumen Investasi</h2>
                      <p className="text-sm text-gray-500">Pilih instrumen untuk ditambahkan ke simulasi portofolio Anda.</p>
                    </div>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="p-2 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Modal Body - Grid format, easy to scan */}
                  <div className="p-6 overflow-y-auto bg-slate-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {inactiveAssets.map(asset => (
                        <div key={asset.id}>
                          <MiniCard asset={asset} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= OPTION 3: TABBED SYSTEM ================= */}
        {uiMode === 'option-3' && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Manajemen Alokasi</h1>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
              <button 
                onClick={() => setInnerTab('portfolio')}
                className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${innerTab === 'portfolio' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid size={18} />
                Aset Aktif ({activeAssets.length})
              </button>
              <button 
                onClick={() => setInnerTab('explore')}
                className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${innerTab === 'explore' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Search size={18} />
                Katalog & Eksplorasi
              </button>
            </div>

            {/* Tab Content */}
            {innerTab === 'portfolio' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-left-4 duration-300">
                {activeAssets.map(asset => <FullCard key={asset.id} asset={asset} />)}
                {activeAssets.length === 0 && (
                   <div className="col-span-full py-12 text-center text-gray-500">
                      Anda belum memiliki alokasi aktif. Silakan ke tab Eksplorasi.
                   </div>
                )}
              </div>
            )}

            {innerTab === 'explore' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-right-4 duration-300">
                {inactiveAssets.map(asset => (
                  <MiniCard key={asset.id} asset={asset} onClick={() => setInnerTab('portfolio')} />
                ))}
                {inactiveAssets.length === 0 && (
                   <div className="col-span-full py-12 text-center text-gray-500">
                      Semua instrumen sudah ditambahkan ke portofolio Anda.
                   </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
      
      {/* Basic CSS for custom scrollbar hidden in most UI frameworks but keeping functionality */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}