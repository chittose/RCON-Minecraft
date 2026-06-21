"use client";
import { useState, useEffect } from "react";
import { CATEGORIES, ITEM_DB, ENCHANTMENTS } from "@/lib/items";

export default function SpawnerDashboard() {
  const [players, setPlayers] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedPlayer, setSelectedPlayer] = useState("@a");
  const [activeCategory, setActiveCategory] = useState("Weapons");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedItem, setSelectedItem] = useState(ITEM_DB[0]);
  const [amount, setAmount] = useState(1);
  
  const [customEnchants, setCustomEnchants] = useState<{id: string, lvl: number}[]>([]);
  const [newEnchantId, setNewEnchantId] = useState("minecraft:sharpness");
  const [newEnchantLvl, setNewEnchantLvl] = useState(5);

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{msg: string, isError: boolean} | null>(null);

  useEffect(() => {
    fetchPlayers();
    const int = setInterval(fetchPlayers, 15000);
    return () => clearInterval(int);
  }, []);

  const fetchPlayers = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      if (data.success && data.players) setPlayers(data.players);
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  const showNotif = (msg: string, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleGive = async () => {
    if (!selectedPlayer) {
      showNotif("Pilih pemain terlebih dahulu!", true);
      return;
    }

    setLoading(true);

    let rawCommand = "";

    if (activeCategory === "Enchanted Books") {
      if (customEnchants.length === 0) {
        showNotif("Buku sihir harus ada isinya! Tambahkan minimal 1 enchantment.", true);
        setLoading(false);
        return;
      }
      const enchTags = customEnchants.map(e => `"${e.id}":${e.lvl}`).join(",");
      rawCommand = `give ${selectedPlayer} minecraft:enchanted_book[stored_enchantments={${enchTags}}] ${amount}`;
    } else {
      let itemTag = selectedItem.id;
      if (customEnchants.length > 0) {
        const enchTags = customEnchants.map(e => `"${e.id}":${e.lvl}`).join(",");
        itemTag = `${itemTag}[enchantments={${enchTags}}]`;
      }
      rawCommand = `give ${selectedPlayer} ${itemTag} ${amount}`;
    }

    try {
      const res = await fetch("/api/rcon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: rawCommand }),
      });
      const data = await res.json();
      
      const serverResponse = data.response?.toString() || "";
      const isMcError = serverResponse.toLowerCase().includes("unknown") || 
                        serverResponse.toLowerCase().includes("error") || 
                        serverResponse.toLowerCase().includes("no player") ||
                        serverResponse.toLowerCase().includes("syntax");

      if (data.success && !isMcError) {
        showNotif(`Sukses: ${serverResponse || 'Barang terkirim!'}`, false);
      } else {
        showNotif(`Gagal: ${serverResponse || data.message}`, true);
      }
    } catch (error) {
      showNotif("Koneksi gagal.", true);
    } finally {
      setLoading(false);
    }
  };

  const addEnchant = () => {
    if (customEnchants.find(e => e.id === newEnchantId)) return;
    setCustomEnchants([...customEnchants, { id: newEnchantId, lvl: newEnchantLvl }]);
  };

  const removeEnchant = (id: string) => {
    setCustomEnchants(customEnchants.filter(e => e.id !== id));
  };

  const filteredItems = ITEM_DB.filter(i => 
    i.cat === activeCategory && 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 selection:bg-indigo-500/30">
      
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Vercel Spawner</h1>
            <p className="text-slate-500 text-sm">Dashboard RCON Super Lengkap.</p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center gap-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase ml-2 mr-2">Player Target:</span>
            <button 
              onClick={() => setSelectedPlayer("@a")}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${selectedPlayer === "@a" ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400"}`}
            >
              @a (Semua)
            </button>
            <div className="w-px h-5 bg-slate-800 mx-1"></div>
            {players.length === 0 ? (
              <span className="text-xs text-slate-500 italic px-2">Kosong</span>
            ) : (
              players.map(p => (
                <button 
                  key={p} 
                  onClick={() => setSelectedPlayer(p)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${selectedPlayer === p ? "bg-emerald-600 text-white" : "hover:bg-slate-800 text-slate-400"}`}
                >
                  <img src={`https://minotar.net/helm/${p}/16.png`} alt={p} className="w-4 h-4 rounded-sm" />
                  {p}
                </button>
              ))
            )}
            <button onClick={fetchPlayers} className={`p-1 text-slate-500 hover:text-slate-300 ml-1 ${refreshing ? 'animate-spin' : ''}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: CATEGORIES & ITEMS */}
          <div className="lg:col-span-8 flex flex-col h-[750px] bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            
            {/* Categories */}
            <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950 p-2 hide-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setCustomEnchants([]); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors mx-1 ${
                    activeCategory === cat 
                    ? "bg-slate-800 border border-slate-700 text-slate-100 shadow-sm" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <input 
                type="text" 
                placeholder="Cari pedang, kayu, diamond..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all mb-4"
                disabled={activeCategory === "Enchanted Books"}
              />

              {activeCategory === "Enchanted Books" ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                  <div className="text-6xl mb-4 grayscale opacity-40">📖</div>
                  <h3 className="text-lg font-bold text-slate-300 mb-1">Custom Enchanted Book</h3>
                  <p className="text-sm text-slate-500">Rakit buku sihir Anda di panel sebelah kanan.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pr-2 custom-scrollbar">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        selectedItem.id === item.id 
                        ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/50" 
                        : "bg-slate-800/50 border-slate-800 hover:border-slate-700 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-3xl mb-2">{item.icon}</span>
                      <span className="text-xs font-semibold text-center leading-tight">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: ACTIONS */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col">
              
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
                <div className="text-5xl">
                  {activeCategory === "Enchanted Books" ? "📖" : selectedItem.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-100">
                    {activeCategory === "Enchanted Books" ? "Enchanted Book" : selectedItem.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {activeCategory === "Enchanted Books" ? "minecraft:enchanted_book" : selectedItem.id}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-400 mb-2">Jumlah</label>
                <div className="flex bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                  <button onClick={() => setAmount(Math.max(1, amount - 1))} className="px-4 py-2 hover:bg-slate-800 text-slate-400 font-bold border-r border-slate-800">-</button>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="flex-1 bg-transparent text-center font-bold text-slate-100 outline-none"
                    min="1" max="6400"
                  />
                  <button onClick={() => setAmount(amount + 1)} className="px-4 py-2 hover:bg-slate-800 text-slate-400 font-bold border-l border-slate-800">+</button>
                  <button onClick={() => setAmount(64)} className="px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-colors">64x</button>
                </div>
              </div>

              {(activeCategory === "Weapons" || activeCategory === "Tools" || activeCategory === "Armor" || activeCategory === "Enchanted Books") && (
                <div className="mb-6 flex-1 flex flex-col">
                  <label className="block text-sm font-bold text-slate-400 mb-2 flex justify-between">
                    Enchantments <span className="text-xs font-normal text-slate-500 italic">Bisa tembus level</span>
                  </label>
                  
                  <div className="flex gap-2 mb-3">
                    <select 
                      value={newEnchantId} 
                      onChange={(e) => setNewEnchantId(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-300 outline-none focus:border-indigo-500"
                    >
                      {ENCHANTMENTS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <input 
                      type="number" 
                      value={newEnchantLvl} 
                      onChange={(e) => setNewEnchantLvl(Number(e.target.value))}
                      className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-center text-slate-300 outline-none focus:border-indigo-500 font-mono"
                    />
                    <button onClick={addEnchant} className="px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold border border-slate-700">+</button>
                  </div>

                  <div className="flex-1 bg-slate-950/50 rounded-lg border border-slate-800 p-2 overflow-y-auto max-h-48 custom-scrollbar">
                    {customEnchants.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-600 italic">Belum ada.</div>
                    ) : (
                      customEnchants.map(ench => {
                        const name = ENCHANTMENTS.find(e => e.id === ench.id)?.name || ench.id;
                        return (
                          <div key={ench.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-2 rounded-md mb-2">
                            <span className="text-xs font-semibold text-slate-300">{name} <span className="text-indigo-400 bg-indigo-900/30 px-1 rounded ml-1">Lvl {ench.lvl}</span></span>
                            <button onClick={() => removeEnchant(ench.id)} className="text-slate-500 hover:text-rose-400 font-bold">×</button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleGive}
                disabled={loading}
                className="mt-auto w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50"
              >
                {loading ? "Mengirim..." : `Kirim ke ${selectedPlayer}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-[slideUp_0.3s_ease-out] z-50 ${
          notification.isError ? "bg-rose-950 border-rose-800 text-rose-200" : "bg-emerald-950 border-emerald-800 text-emerald-200"
        }`}>
          <div className="text-xl">{notification.isError ? "❌" : "✅"}</div>
          <div className="font-semibold text-sm pr-2">{notification.msg}</div>
        </div>
      )}

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
